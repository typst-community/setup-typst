#!/usr/bin/env node
import * as core from "@actions/core";
import * as github from "@actions/github";
import * as tc from "@actions/tool-cache";
import fs from "fs/promises";
import path from "path";
import * as semver from "semver";

import { move } from "./move";
import {
  cachePackages,
  downloadZipLocalPackages,
  downloadZipPreviewPackages,
} from "./package";

/**
 * Fetches all releases for a given GitHub repository.
 * Uses authenticated Octokit if available, otherwise falls back to unauthenticated API fetch.
 * @param octokit Authenticated Octokit instance or null
 * @param repoSet Repository owner and repo name
 * @returns List of repository releases
 */
async function listReleases(
  octokit: any,
  repoSet: { owner: string; repo: string },
): Promise<any[]> {
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
      return JSON.parse(await fs.readFile(releasesResponse, "utf8"));
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

/**
 * Resolves an exact Typst version from release tags using semver matching.
 * Supports "latest" and version ranges with optional prerelease inclusion.
 * @param releases Array of GitHub releases
 * @param version Target version or version range
 * @param allowPrereleases Whether to include prerelease versions
 * @returns Exact resolved version string
 */
async function getExactVersion(
  releases: any[],
  version: string,
  allowPrereleases: boolean,
): Promise<string> {
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

/**
 * Get build target triple and archive extension by version and current platform
 * @param version Package version
 * @returns Build target and archive extension
 */
function getBuildTarget(version: string): {
  target: string | undefined;
  archiveExt: string;
} {
  let target, archiveExt;
  if (semver.gte(version, "0.3.0") || process.platform === "win32") {
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
  return { target, archiveExt };
}

/**
 * Downloads, extracts, and caches a single Typst binary for the current platform.
 * @param version Exact Typst version to install
 * @param executableName Desired name for the final executable
 * @returns Path to the cached directory
 */
async function downloadAndCacheTypst(
  version: string,
  executableName: string,
): Promise<string> {
  core.info(`Downloading and caching Typst ${version}.`);
  let { target, archiveExt } = getBuildTarget(version);
  const folder = `typst-${target}`;
  const file = `${folder}${archiveExt}`;
  core.debug(`Determined target: ${target}, archive extension: ${archiveExt}.`);
  let found = await tc.downloadTool(
    `https://github.com/typst/typst/releases/download/v${version}/${file}`,
  );
  if (process.platform === "win32") {
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
  await fs.copyFile(
    path.join(found, sourceName),
    path.join(found, standardName),
  );
  move(path.join(found, sourceName), path.join(found, destName));
  found = await tc.cacheDir(found, "typst", version);
  core.info(`Typst ${version} added to cache at '${found}'.`);
  return found;
}

/**
 * Ensures the specified Typst version is available and sets executable name if needed.
 * @param versionExact Exact Typst version to ensure
 * @param executableName Desired name for the final executable
 */
async function ensureTypstInstalled(
  versionExact: string,
  executableName: string,
): Promise<void> {
  let found = tc.find("typst", versionExact);
  if (found) {
    const destName =
      process.platform === "win32" ? `${executableName}.exe` : executableName;
    const standardName =
      process.platform === "win32"
        ? `typst-${versionExact}.exe`
        : `typst-${versionExact}`;
    await fs.copyFile(
      path.join(found, standardName),
      path.join(found, destName),
    );
  } else {
    found = await downloadAndCacheTypst(versionExact, executableName);
  }
  core.addPath(found);
  core.info(`✅ Typst v${versionExact} installed!`);
}

/**
 * Ensures multiple specified Typst versions are available and sets executable name if needed.
 * @param versionsMap Object with executable names as keys and { version, allowPrerelease? } as values
 * @param releases Array of GitHub releases
 */
async function ensureMultipleTypstInstalled(
  versionsMap: Record<
    string,
    {
      version: string;
      allowPrerelease?: boolean;
    }
  >,
  releases: any[],
): Promise<void> {
  const allowPrereleases = core.getBooleanInput("allow-prereleases");
  const promises = Object.entries(versionsMap).map(
    async ([executableName, config]) => {
      const versionExact = await getExactVersion(
        releases,
        config.version,
        config.allowPrerelease ?? allowPrereleases,
      );
      await ensureTypstInstalled(versionExact, executableName);
    },
  );
  await Promise.all(promises);
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

const versionsMapStr = core.getInput("typst-versions-map");
if (versionsMapStr) {
  let versionsMap;
  try {
    versionsMap = JSON.parse(versionsMapStr);
  } catch (error) {
    core.setFailed(
      `Failed to parse versionsMap from typst-versions-map: ${(error as Error).message}.`,
    );
    process.exit(1);
  }
  await ensureMultipleTypstInstalled(versionsMap, releases);
} else {
  const version = core.getInput("typst-version");
  const allowPrereleases = core.getBooleanInput("allow-prereleases");
  const versionExact = await getExactVersion(
    releases,
    version,
    allowPrereleases,
  );
  const executableName = core.getInput("executable-name");
  await ensureTypstInstalled(versionExact, executableName);
}

const cachePackage = core.getInput("cache-dependency-path");
if (cachePackage) {
  await cachePackages(cachePackage);
}

const localPackages = core.getInput("zip-packages");
const cacheLocalPackages = core.getBooleanInput("cache-local-packages");
if (localPackages) {
  await downloadZipLocalPackages(localPackages, cacheLocalPackages);
  await downloadZipPreviewPackages(localPackages);
}
