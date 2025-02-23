#!/usr/bin/env node
import * as cache from "@actions/cache";
import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as github from "@actions/github";
import * as glob from "@actions/glob";
import * as tc from "@actions/tool-cache";
import fs from "fs";
import { createUnauthenticatedAuth } from "@octokit/auth-unauthenticated";
import * as os from "os";
import { join } from "node:path";
import { exit } from "process";
import * as semver from "semver";

const octokit = core.getInput("token")
  ? github.getOctokit(core.getInput("token"))
  : github.getOctokit(undefined!, {
      authStrategy: createUnauthenticatedAuth,
      auth: { reason: "no 'token' input" },
    });

const repoSet = {
  owner: "typst",
  repo: "typst",
};
let version = core.getInput("typst-version");
const allowPrereleases = core.getBooleanInput("allow-prereleases");
const releases = await octokit.paginate(
  octokit.rest.repos.listReleases,
  repoSet,
);
const versions = releases
  .map((release) => release.tag_name.slice(1))
  .filter((v) => semver.valid(v));
version = semver.maxSatisfying(versions, version === "latest" ? "*" : version, {
  includePrerelease: allowPrereleases ? true : false,
})!;
core.debug(`Resolved version: v${version}`);
if (!version)
  core.setFailed(
    `Typst ${core.getInput("typst-version")} could not be resolved`,
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
    `https://github.com/typst/typst/releases/download/v${version}/${file}`,
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
    const cacheDir = {
      linux: () =>
        join(
          process.env.XDG_CACHE_HOME ||
            (os.homedir() ? join(os.homedir(), ".cache") : undefined)!,
          "typst/packages",
        ),
      darwin: () => join(process.env.HOME!, "Library/Caches", "typst/packages"),
      win32: () => join(process.env.LOCALAPPDATA!, "typst/packages"),
    }[process.platform as string]!();
    const hash = await glob.hashFiles(cachePackage);
    const primaryKey = `typst-packages-${hash}`;
    const cacheKey = await cache.restoreCache([cacheDir], primaryKey);
    if (cacheKey != undefined) {
      core.info(`✅ Packages downloaded from cache!`);
    } else {
      await exec.exec(`typst compile ${cachePackage}`);
      let cacheId = 0;
      try {
        cacheId = await cache.saveCache([cacheDir], primaryKey);
      } catch (err) {
        const message = (err as Error).message;
        core.warning(message);
      }
      if (cacheId != -1) {
        core.info(`✅ Cache saved with the key: ${primaryKey}`);
      }
      exit(0);
    }
  } else {
    core.warning(
      `${cachePackage} was not found. Packages will not be cached.`,
    );
  }
}
