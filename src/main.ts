#!/usr/bin/env node
import * as cache from "@actions/cache";
import * as core from "@actions/core";
import * as github from "@actions/github";
import * as tc from "@actions/tool-cache";
import * as glob from "@actions/glob"
import { join } from "node:path";
import * as semver from "semver";
import { createUnauthenticatedAuth } from "@octokit/auth-unauthenticated";
import { xdgCache } from "xdg-basedir";

const token = core.getInput("typst-token")
const octokit = token
  ? github.getOctokit(token)
  : github.getOctokit(undefined!, {
      authStrategy: createUnauthenticatedAuth,
      auth: { reason: "no 'typst-token' input" },
    });

const versionRaw = core.getInput("typst-version");
let version: string;
if (versionRaw === "latest") {
  const { data } = await octokit.rest.repos.getLatestRelease({
    owner: "typst",
    repo: "typst",
  });
  version = data.tag_name.slice(1);
} else {
  const releases = await octokit.paginate(octokit.rest.repos.listReleases, {
    owner: "typst",
    repo: "typst",
  });
  const versions = releases.map((release) => release.tag_name.slice(1));
  version = semver.maxSatisfying(versions, versionRaw)!;
}
core.debug(`Resolved version: v${version}`);
if (!version) throw new DOMException(`${versionRaw} resolved to ${version}`);

let found = tc.find("typst", version);
let cacheHit = !!found

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
    `https://github.com/typst/typst/releases/download/v${version}/${file}`,
  );
  if (file.endsWith(".zip")) {
    found = await tc.extractZip(found);
  } else {
    // https://github.com/actions/toolkit/blob/68f22927e727a60caff909aaaec1ab7267b39f75/packages/tool-cache/src/tool-cache.ts#L226
    // J flag is .tar.xz
    // z flag is .tar.gz
    found = await tc.extractTar(found, undefined, "xJ");
  }
  found = join(found, folder);
  found = await tc.cacheDir(found, "typst", version);
  core.info(`Typst v${version} added to cache`);
}
core.addPath(found);
core.setOutput("typst-version", version);
core.info(`✅ Typst v${version} installed!`);

if (core.getBooleanInput("cache")) {
  const cacheDir = {
    linux: () => join(xdgCache!, "typst/packages"),
    darwin: () => join(process.env.HOME!, "Library/Caches", "typst/packages"),
    win32: () => join(process.env.LOCALAPPDATA!, "typst/packages"),
  }[process.platform as string]!();
  const hash = await glob.hashFiles("**/*.typ")
  const primaryKey = `typst-packages-cache-${process.env.RUNNER_OS}-${hash}`
  core.saveState("cache-primary-key", primaryKey)
  core.info(`Restoring ${cacheDir} with key ${primaryKey}`)
  const hitKey = cache.restoreCache([cacheDir], primaryKey)
  core.saveState("cache-hit-key", hitKey)
  cacheHit ||= !!hitKey
}

core.setOutput("cache-hit", cacheHit)
