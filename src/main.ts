#!/usr/bin/env node
import * as core from "@actions/core";
import * as github from "@actions/github";
import * as tc from "@actions/tool-cache";
import fs from "fs";
import path from "path";
import * as semver from "semver";

import { move } from "./move";
import { 
  cachePackages,
  downloadZipLocalPackages,
  downloadZipPreviewPackages,
} from "./package";

function getCompatibleInput(newParam: string, oldParams: string[]): string {
  const value = core.getInput(newParam);
  if (value) {
    return value;
  }
  for (const oldParam of oldParams) {
    const oldValue = core.getInput(oldParam);
    if (oldValue) {
      core.warning(
        `Parameter "${oldParam}" is deprecated, please use "${newParam}" instead.`,
      );
      return oldValue;
    }
  }
  return "";
}

async function listReleases(
  octokit: any,
  repoSet: { owner: string; repo: string },
) {
  core.info(
    `Fetching releases list for repository ${repoSet.owner}/${repoSet.repo}.`,
  );
  if (octokit) {
    return await octokit.paginate(octokit.rest.repos.listReleases, repoSet);
  } else {
    const releasesUrl = `https://api.github.com/repos/${repoSet.owner}/${repoSet.repo}/releases`;
    core.debug(
      `Fetching releases list from ${releasesUrl} without authentication.`,
    );
    const releasesResponse = await tc.downloadTool(releasesUrl);
    try {
      core.debug(`Successfully downloaded releases list from ${releasesUrl}.`);
      return JSON.parse(fs.readFileSync(releasesResponse, "utf8"));
    } catch (error) {
      core.setFailed(
        `Failed to parse releases from ${releasesUrl}: ${
          (error as Error).message
        }. This may be caused by API rate limit exceeded.`,
      );
      process.exit(1);
    }
  }
}

async function getExactVersion(
  releases: any[],
  version: string,
  allowPrereleases: boolean,
) {
  const versions = releases
    .map((release) => release.tag_name.slice(1))
    .filter((v) => semver.valid(v));
  const resolvedVersion = semver.maxSatisfying(
    versions,
    version === "latest" ? "*" : version,
    {
      includePrerelease: allowPrereleases,
    },
  );
  if (resolvedVersion) {
    core.info(`Resolved Typst version: ${resolvedVersion}.`);
  } else {
    core.setFailed(`Typst ${version} could not be resolved.`);
    process.exit(1);
  }
  return resolvedVersion;
}

async function downloadAndCacheTypst(version: string, executableName: string) {
  core.info(`Downloading and caching Typst ${version}.`);
  let target, archiveExt;
  if (semver.gte(version, "0.3.0") || process.platform == "win32") {
    target = {
      "darwin,arm64": "aarch64-apple-darwin",
      "linux,x64": "x86_64-unknown-linux-musl",
      "linux,arm": "armv7-unknown-linux-musleabi",
      "darwin,x64": "x86_64-apple-darwin",
      "win32,x64": "x86_64-pc-windows-msvc",
      "linux,arm64": "aarch64-unknown-linux-musl",
    }[[process.platform, process.arch].join(",")];
    archiveExt = {
      darwin: ".tar.xz",
      linux: ".tar.xz",
      win32: ".zip",
    }[process.platform.toString()]!;
  } else {
    target = {
      darwin: "x86_64-apple-darwin",
      linux: "x86_64-unknown-linux-gnu",
    }[process.platform.toString()]!;
    archiveExt = ".tar.gz";
  }
  const folder = `typst-${target}`;
  const file = `${folder}${archiveExt}`;
  core.debug(`Determined target: ${target}, archive extension: ${archiveExt}.`);
  let found = await tc.downloadTool(
    `https://github.com/typst/typst/releases/download/v${version}/${file}`,
  );
  if (process.platform == "win32") {
    if (!found.endsWith(".zip")) {
      move(
        found,
        path.join(path.dirname(found), `${path.basename(found)}.zip`),
      );
      found = path.join(path.dirname(found), `${path.basename(found)}.zip`);
    }
    found = await tc.extractZip(found);
  } else {
    found = await tc.extractTar(
      found,
      undefined,
      semver.gte(version, "0.3.0") ? "xJ" : "xz",
    );
    core.debug(`Extracted archive for Typst version ${version}.`);
  }
  found = path.join(found, folder);
  const sourceName = process.platform === "win32" ? "typst.exe" : "typst";
  const standardName =
    process.platform === "win32" ? `typst-${version}.exe` : `typst-${version}`;
  const destName =
    process.platform === "win32" ? `${executableName}.exe` : executableName;
  fs.copyFileSync(path.join(found, sourceName), path.join(found, standardName));
  move(path.join(found, sourceName), path.join(found, destName));
  found = await tc.cacheDir(found, "typst", version);
  core.info(`Typst ${version} added to cache at '${found}'.`);
  return found;
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
const versionExact = await getExactVersion(releases, version, allowPrereleases);
let found = tc.find("typst", versionExact);
core.setOutput("cache-hit", !!found);
const executableName = core.getInput("executable-name");
if (found) {
  const destName =
    process.platform === "win32" ? `${executableName}.exe` : executableName;
  if (!fs.existsSync(path.join(found, destName))) {
    const standardName =
      process.platform === "win32"
        ? `typst-{versionExact}.exe`
        : `typst-{versionExact}`;
    fs.copyFileSync(path.join(found, standardName), path.join(found, destName));
  }
} else {
  found = await downloadAndCacheTypst(versionExact, executableName);
}
core.addPath(found);
core.setOutput("typst-version", versionExact);
core.info(`✅ Typst v${versionExact} installed!`);

const cachePackage = core.getInput("cache-dependency-path");
if (cachePackage) {
  await cachePackages(cachePackage);
}

const localPackages = getCompatibleInput("zip-packages", ["local-packages"]);
const cacheLocalPackages = core.getBooleanInput("cache-local-packages");
if (localPackages) {
  await downloadZipLocalPackages(localPackages, cacheLocalPackages);
  await downloadZipPreviewPackages(localPackages);
}
