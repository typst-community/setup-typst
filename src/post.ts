#!/usr/bin/env node
import * as cache from "@actions/cache";
import * as core from "@actions/core";
import * as glob from "@actions/glob"
import { join } from "node:path";
import { xdgCache } from "xdg-basedir";

if (core.getBooleanInput("cache")) {
  const cacheDir = {
    linux: () => join(xdgCache!, "typst/packages"),
    darwin: () => join(process.env.HOME!, "Library/Caches", "typst/packages"),
    win32: () => join(process.env.LOCALAPPDATA!, "typst/packages"),
  }[process.platform as string]!();
  const primaryKey = core.getState("cache-key")
  core.info(`Saving ${cacheDir} with key ${primaryKey}`)
  cache.saveCache([cacheDir], primaryKey)
}
