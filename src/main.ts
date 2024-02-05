#!/usr/bin/env node
import * as cache from "@actions/cache";
import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as github from "@actions/github";
import * as glob from "@actions/glob";
import * as tc from "@actions/tool-cache";
import fs from "fs";
import { join } from "node:path";
import { createUnauthenticatedAuth } from "@octokit/auth-unauthenticated";
import * as semver from "semver";

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

const cachePackage = core.getInput("cache-dependency-path");
if (cachePackage) {
  if (fs.existsSync(cachePackage)) {
    const cachePath = {
      linux: join(process.env.XDG_CACHE_HOME, "typst/packages"),
      darwin: join(process.env.HOME, "/Library/Caches/typst/packages"),
      win32: join(process.env.LOCALAPPDATA, "typst/packages")
    }[process.platform.toString()]!;
    const hash = await glob.hashFiles(cachePackage);
    const cacheKey = await cache.restoreCache(
      [cachePath],
      `typst-packages-${hash}`,
      ["typst-packages-", "typst-"]
    );
    if (cacheKey != undefined) {
      core.info(`✅ Packages downloaded from cache!`);
    } else {
      const cachePathState = core.getState(cachePath);
      await exec.exec(`typst compile ${cachePackage}`);
      if (!cachePathState) {
        core.warning(
          'Cache path is empty. Please check the previous logs.'
        );
      } else {
        let cacheId = 0;
        try {
          cacheId = await cache.saveCache(
            [cachePath],
            `typst-package-${hash}`
          );
        } catch (err) {
          const message = (err as Error).message;
          core.warning(message);
        }
        if (cacheId != -1) {
          core.info(
            `Cache saved with the key: typst-package-${hash}`
          );
        }
      }
    }
  } else {
    core.warning(
      "The file with the name as same as the `cache` input was not found. Packages will not be cached."
    );
  }
}
