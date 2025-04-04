#!/usr/bin/env node
import * as cache from "@actions/cache";
import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as github from "@actions/github";
import * as glob from "@actions/glob";
import * as tc from "@actions/tool-cache";
import fs from "fs";
import path from "path";
import * as os from "os";
import { join } from "node:path";
import { exit } from "process";
import * as semver from "semver";

async function getReleases(
  octokit: any,
  repoSet: { owner: string; repo: string }
) {
  if (octokit) {
    return await octokit.paginate(octokit.rest.repos.listReleases, repoSet);
  } else {
    const releasesUrl = `https://api.github.com/repos/typst/typst/releases`;
    const releasesResponse = await tc.downloadTool(releasesUrl);
    try {
      return JSON.parse(fs.readFileSync(releasesResponse, "utf8"));
    } catch (error) {
      core.setFailed(
        `Failed to parse releases: ${(error as Error).message}. This may be caused by API rate limit exceeded.`
      );
      process.exit(1);
    }
  }
}

async function getVersion(
  releases: any[],
  version: string,
  allowPrereleases: boolean
) {
  const versions = releases
    .map((release) => release.tag_name.slice(1))
    .filter((v) => semver.valid(v));
  return semver.maxSatisfying(versions, version === "latest" ? "*" : version, {
    includePrerelease: allowPrereleases,
  });
}

async function downloadAndCacheTypst(version: string) {
  const target = {
    "darwin,arm64": "aarch64-apple-darwin",
    "linux,x64": "x86_64-unknown-linux-musl",
    "linux,arm": "armv7-unknown-linux-musleabi",
    "darwin,x64": "x86_64-apple-darwin",
    "win32,x64": "x86_64-pc-windows-msvc",
    "linux,arm64": "aarch64-unknown-linux-musl",
  }[[process.platform, process.arch].join(",")];
  const archiveExt = {
    darwin: ".tar.xz",
    linux: ".tar.xz",
    win32: ".zip",
  }[process.platform.toString()]!;
  const folder = `typst-${target}`;
  const file = `${folder}${archiveExt}`;
  let found = await tc.downloadTool(
    `https://github.com/typst/typst/releases/download/v${version}/${file}`
  );
  if (process.platform == "win32") {
    if (!found.endsWith(".zip")) {
      fs.renameSync(
        found,
        path.join(path.dirname(found), `${path.basename(found)}.zip`)
      );
      found = path.join(path.dirname(found), `${path.basename(found)}.zip`);
    }
    found = await tc.extractZip(found);
  } else {
    found = await tc.extractTar(found, undefined, "xJ");
  }
  found = join(found, folder);
  found = await tc.cacheDir(found, "typst", version);
  core.info(`Typst v${version} added to cache`);
  return found;
}

const TYPST_PACKAGES_DIR = {
  linux: () =>
    join(
      process.env.XDG_CACHE_HOME ||
        (os.homedir() ? join(os.homedir(), ".cache") : undefined)!,
      "typst/packages"
    ),
  darwin: () => join(process.env.HOME!, "Library/Caches", "typst/packages"),
  win32: () => join(process.env.LOCALAPPDATA!, "typst/packages"),
}[process.platform as string]!();

async function handlePackages() {
  const cachePackage = core.getInput("cache-dependency-path");
  if (cachePackage) {
    if (fs.existsSync(cachePackage)) {
      const cacheDir = TYPST_PACKAGES_DIR + "/preview";
      const hash = await glob.hashFiles(cachePackage);
      const primaryKey = `typst-preview-packages-${hash}`;
      const cacheKey = await cache.restoreCache([cacheDir], primaryKey);
      if (cacheKey != undefined) {
        core.info(`✅ Packages downloaded from cache!`);
      } else {
        await exec.exec(`typst compile ${cachePackage}`);
        let cacheId = 0;
        try {
          cacheId = await cache.saveCache([cacheDir], primaryKey);
        } catch (error) {
          core.warning(`Failed to save cache: ${(error as Error).message}.`);
        }
        if (cacheId != -1) {
          core.info(`✅ Cache saved with the key: ${primaryKey}`);
        }
        exit(0);
      }
    } else {
      core.warning(
        `${cachePackage} is not found. Packages will not be cached.`
      );
    }
  }
}

async function downloadLocalPackages(
  packages: { local: { [key: string]: string } },
  packageDir: string
) {
  const packagesDir = packageDir + "/local";
  if (!fs.existsSync(packagesDir)) {
    fs.mkdirSync(packagesDir);
  }
  for (const [key, value] of Object.entries(packages.local)) {
    core.debug(`Downloading ${key}.`);
    const packageDir = packagesDir + key;
    if (!fs.existsSync(packageDir)) {
      fs.mkdirSync(packageDir);
    } else {
      core.warning(
        `${packageDir} already exists, check if you are using duplicate local localPackage names.`
      );
    }
    let packageResponse = await tc.downloadTool(value);
    if (process.platform == "win32") {
      if (!packageResponse.endsWith(".zip")) {
        fs.renameSync(
          packageResponse,
          path.join(
            path.dirname(packageResponse),
            `${path.basename(packageResponse)}.zip`
          )
        );
        packageResponse = path.join(
          path.dirname(packageResponse),
          `${path.basename(packageResponse)}.zip`
        );
      }
    }
    packageResponse = await tc.extractZip(packageResponse);
    const dirContent = await new Promise<string[]>((resolve, reject) => {
      fs.readdir(packageResponse, (err, files) => {
        if (err) reject(err);
        else resolve(files);
      });
    });
    if (dirContent.length === 1) {
      const innerPath = path.join(packageResponse, dirContent[0]);
      const stats = await fs.statSync(innerPath);
      if (stats.isDirectory()) {
        await fs.renameSync(innerPath, packageDir);
        fs.rmdirSync(packageResponse);
      }
    } else {
      await fs.renameSync(packageResponse, packageDir);
    }
  }
}

const token = core.getInput("token");
const octokit = token
  ? github.getOctokit(token, { baseUrl: "https://api.github.com" })
  : null;
const repoSet = {
  owner: "typst",
  repo: "typst",
};
const releases = await getReleases(octokit, repoSet);
const allowPrereleases = core.getBooleanInput("allow-prereleases");
const version = core.getInput("typst-version");
const versionExact = await getVersion(releases, version, allowPrereleases);
if (!versionExact) {
  core.setFailed(
    `Typst ${core.getInput("typst-version")} could not be resolved.`
  );
  process.exit(1);
}
core.debug(`Resolved version: v${versionExact}`);
let found = tc.find("typst", versionExact);
core.setOutput("cache-hit", !!found);
if (!found) {
  found = await downloadAndCacheTypst(versionExact);
}
core.addPath(found);
core.setOutput("typst-version", versionExact);
core.info(`✅ Typst v${version} installed!`);

await handlePackages();
const localPackage = core.getInput("local-packages");
if (localPackage) {
  let localPackages;
  try {
    localPackages = JSON.parse(fs.readFileSync(localPackage, "utf8"));
  } catch (error) {
    core.warning(
      `Failed to parse local-packages json file: ${(error as Error).message}. Packages will not be downloaded.`
    );
  }
  const packagesDir = TYPST_PACKAGES_DIR + "/local";
  await downloadLocalPackages(localPackages, packagesDir);
}
