#!/usr/bin/env node
import * as cache from "@actions/cache";
import * as core from "@actions/core";
import * as github from "@actions/github";
import * as tc from "@actions/tool-cache";
import { join } from "node:path";
import * as semver from "semver";
import { createUnauthenticatedAuth } from "@octokit/auth-unauthenticated";

const octokit = core.getInput("typst-token")
  ? github.getOctokit(core.getInput("typst-token"))
  : github.getOctokit(undefined!, {
      authStrategy: createUnauthenticatedAuth,
      auth: { reason: "no 'typst-token' input" },
    });

const repoSet = {
  owner: "typst",
  repo: "typst",
};
let version = core.getInput("typst-version");
if (version === "latest") {
  const { data } = await octokit.rest.repos.getLatestRelease(repoSet);
  version = data.tag_name.slice(1);
} else {
  const releases = await octokit.paginate(
    octokit.rest.repos.listReleases,
    repoSet
  );
  const versions = releases.map((release) => release.tag_name.slice(1));
  version = semver.maxSatisfying(versions, version)!;
}
core.debug(`Resolved version: v${version}`);
if (!version)
  throw new DOMException(
    `${core.getInput("typst-version")} resolved to ${version}`
  );

let found = tc.find("typst", version);
core.setOutput("cache-hit", !!found);

if (!found) {
  const target = {
    "darwin,arm64": "aarch64-apple-darwin",
    "linux,x64": "x86_64-unknown-linux-musl",
    "linux,arm": "armv7-unknown-linux-musleabi",
    "darwin,x64": "x86_64-apple-darwin",
    "win32,x64": "x86_64-pc-windows-msvc",
    "linux,arm64": "aarch64-unknown-linux-musl",
  }[[process.platform, process.arch].toString()]!;
  const archiveExt = {
    darwin: ".tar.xz",
    linux: ".tar.xz",
    win32: ".zip",
  }[process.platform.toString()]!;
  const folder = `typst-${target}`;
  const file = `${folder}${archiveExt}`;

  found = await tc.downloadTool(
    `https://github.com/typst/typst/releases/download/v${version}/${file}`
  );
  if (file.endsWith(".zip")) {
    found = await tc.extractZip(found);
  } else {
    found = await tc.extractTar(found, undefined, "xJ");
  }
  found = join(found, folder);
  found = await tc.cacheDir(found, "typst", version);
  core.info(`Typst v${version} added to cache`);
}
core.addPath(found);
core.setOutput("typst-version", version);
core.info(`✅ Typst v${version} installed!`);

let packagesId = core.getInput("packages-id");
if (!packagesId || packagesId === "-1") {
  core.info(`No packages should be installed.`);
} else {
  const cachePath = {
    darwin: "~/Library/Caches",
    linux: "$XDG_CACHE_HOME",
    win32: "%LOCALAPPDATA%",
  }[process.platform.toString()]!;
  const cacheKey = await cache.restoreCache(
    [`${cachePath}/typst/packages/preview/`],
    `typst-packages-${packagesId}`,
    ["typst-packages", "typst-"]
  );
  if (cacheKey != undefined) {
    core.info(`✅ Packages group ${packagesId} downloaded!`);
  } else {
    core.info(`Packages group ${packagesId} cache not found.`);
  }
}
