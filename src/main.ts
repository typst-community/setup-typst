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
import * as semver from "semver";

async function move(src: string, dest: string) {
  try {
    fs.renameSync(src, dest);
  } catch (error) {
    try {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.cpSync(src, dest, { recursive: true, force: true });
      fs.rmSync(src, { recursive: true, force: true });
    } catch (error) {
      core.warning(`Failed to move '${src}' to '${dest}': ${(error as Error).message}.`);
    }
  }
}

async function listReleases(
  octokit: any,
  repoSet: { owner: string; repo: string }
) {
  core.info(`Fetching releases list for repository ${repoSet.owner}/${repoSet.repo}.`);
  if (octokit) {
    return await octokit.paginate(octokit.rest.repos.listReleases, repoSet);
  } else {
    const releasesUrl = `https://api.github.com/repos/${repoSet.owner}/${repoSet.repo}/releases`;
    core.debug(`Fetching releases list from ${releasesUrl} without authentication.`);
    const releasesResponse = await tc.downloadTool(releasesUrl);
    try {
      core.debug(`Successfully downloaded releases list from ${releasesUrl}.`);
      return JSON.parse(fs.readFileSync(releasesResponse, "utf8"));
    } catch (error) {
      core.setFailed(`Failed to parse releases from ${releasesUrl}: ${(error as Error).message}. This may be caused by API rate limit exceeded.`);
      process.exit(1);
    }
  }
}

async function getVersionExact(
  releases: any[],
  version: string,
  allowPrereleases: boolean
) {
  const versions = releases
    .map((release) => release.tag_name.slice(1))
    .filter((v) => semver.valid(v));
  const resolvedVersion = semver.maxSatisfying(versions, version === "latest" ? "*" : version, {
    includePrerelease: allowPrereleases,
  });
  if (resolvedVersion) {
    core.info(`Resolved Typst version: ${resolvedVersion}.`);
  } else {
    core.setFailed(`Typst ${version} could not be resolved.`);
    process.exit(1);
  }
  return resolvedVersion;
}

async function downloadAndCacheTypst(version: string) {
  core.info(`Downloading and caching Typst ${version}.`);
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
  core.debug(`Determined target: ${target}, archive extension: ${archiveExt}.`);
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
    core.debug(`Extracted archive for Typst version ${version}.`);
  }
  found = path.join(found, folder);
  found = await tc.cacheDir(found, "typst", version);
  core.info(`Typst ${version} added to cache at '${found}'.`);
  return found;
}

const TYPST_PACKAGES_DIR = {
  linux: () =>
    path.join(
      process.env.XDG_CACHE_HOME ||
        (os.homedir() ? path.join(os.homedir(), ".cache") : undefined)!,
      "typst/packages"
    ),
  darwin: () => path.join(process.env.HOME!, "Library/Caches", "typst/packages"),
  win32: () => path.join(process.env.LOCALAPPDATA!, "typst/packages"),
}[process.platform as string]!();

async function cachePackages(cachePackage: string) {
  if (fs.existsSync(cachePackage)) {
    const cacheDir = TYPST_PACKAGES_DIR + "/preview";
    const hash = await glob.hashFiles(cachePackage);
    const primaryKey = `typst-preview-packages-${hash}`;
    core.info(`Computed cache key: ${primaryKey}.`);
    const cacheKey = await cache.restoreCache([cacheDir], primaryKey);
    if (cacheKey != undefined) {
      core.info(`✅ Packages restored from cache.`);
    } else {
      core.info(`Cache miss. Compiling Typst packages.`);
      await exec.exec(`typst compile ${cachePackage}`);
      try {
        let cacheId = await cache.saveCache([cacheDir], primaryKey);
        core.info(`✅ Cache saved successfully with key: ${primaryKey}.`);
        core.debug(`Cache ID: ${cacheId}`);
      } catch (error) {
        core.warning(`Failed to save cache: ${(error as Error).message}.`);
        return;
      }
    }
  } else {
    core.warning(`Dependency path '${cachePackage}' not found. Skipping caching.`);
  }
}

function getPackageVersion(toml: string): string {
  core.debug(`Reading package version from TOML file: '${toml}'.`);
  let content;
  try {
    content = fs.readFileSync(toml, "utf-8");
    core.info(`Successfully read TOML file: '${toml}'.`);
  } catch (error) {
    core.warning(`Failed to read TOML file '${toml}': ${(error as Error).message}. Defaulting to version '0.0.0'.`);
    return "0.0.0";
  }
  const lines = content.split(/\r?\n/);
  let inPackageSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      const section = trimmed.slice(1, -1).trim();
      inPackageSection = section === "package";
    } else if (inPackageSection) {
      const versionRegex = /^\s*version\s*=\s*"(\d+\.\d+\.\d+)"/;
      const match = trimmed.match(versionRegex);
      if (match) return match[1];
    }
  }
  core.warning(
    `Failed to find version in local package TOML file ${toml}. Package version will be 0.0.0.`
  );
  return "0.0.0";
}

async function downloadLocalPackages(packages: {
  local: { [key: string]: string };
}) {
  core.info(`Downloading local packages.`);
  const packagesDir = TYPST_PACKAGES_DIR + "/local";
  if (!fs.existsSync(packagesDir)) {
    fs.mkdirSync(packagesDir, { recursive: true });
    core.debug(`Created local packages directory: '${packagesDir}'.`);
  }
  await Promise.all(
    Object.entries(packages.local).map(async ([key, value]) => {
      const packageDir = path.join(packagesDir, key);
      if (!fs.existsSync(packageDir)) {
        fs.mkdirSync(packageDir);
        core.debug(`Created directory '${packageDir}' for package ${key}.`);
      } else {
        core.warning(`Directory '${packageDir}' already exists. Check for duplicate package names.`);
      }
      core.info(`Downloading package ${key} from ${value}.`);
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
      core.debug(`Extracted package ${key}.`);
      const dirContent = await new Promise<string[]>((resolve, reject) => {
        fs.readdir(packageResponse, (err, files) => {
          if (err) reject(err);
          else resolve(files);
        });
      });
      if (dirContent.length === 1) {
        const innerPath = path.join(packageResponse, dirContent[0]);
        const stats = fs.statSync(innerPath);
        if (stats.isDirectory()) {
          const packageVersion = getPackageVersion(path.join(innerPath, "typst.toml"));
          move(innerPath, path.join(packageDir, packageVersion));
        }
      } else {
        const packageVersion = getPackageVersion(
          path.join(packageResponse, "typst.toml")
        );
        move(packageResponse, path.join(packageDir, packageVersion));
      }
      core.info(`✅ Downloaded ${key} to '${packageDir}'`);
    })
  );
}

const token = core.getInput("token");
const octokit = token
  ? github.getOctokit(token, { baseUrl: "https://api.github.com" })
  : null;
const repoSet = {
  owner: "typst",
  repo: "typst",
};
const releases = await listReleases(octokit, repoSet);
const version = core.getInput("typst-version");
const allowPrereleases = core.getBooleanInput("allow-prereleases");
const versionExact = await getVersionExact(releases, version, allowPrereleases);
let found = tc.find("typst", versionExact);
core.setOutput("cache-hit", !!found);
if (!found) {
  found = await downloadAndCacheTypst(versionExact);
}
core.addPath(found);
core.setOutput("typst-version", versionExact);
core.info(`✅ Typst v${versionExact} installed!`);
const cachePackage = core.getInput("cache-dependency-path");
if (cachePackage) {
  await cachePackages(cachePackage);
}
const localPackage = core.getInput("local-packages");
if (localPackage) {
  if (fs.existsSync(localPackage)) {
    let localPackages;
    try {
      localPackages = JSON.parse(fs.readFileSync(localPackage, "utf8"));
    } catch (error) {
      core.warning(
        `Failed to parse local-packages json file: ${(error as Error).message}. Packages will not be downloaded.`
      );
    }
    await downloadLocalPackages(localPackages);
  } else {
    core.warning(`Local packages path '${localPackage}' not found. Skipping downloading.`);
  }
}
