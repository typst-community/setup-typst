#!/usr/bin/env node
import * as cache from "@actions/cache";
import * as core from "@actions/core";
import * as glob from "@actions/glob"

if (core.getBooleanInput("cache")) {
  const cacheDir = {
    linux: process.env.XDG_CACHE_HOME,
    darwin: `${process.env.HOME}/Library/Caches`,
    win32: process.env.LOCALAPPDATA,
  }[process.platform as string]!
  const primaryKey = await glob.hashFiles(["./**/*.typ"].join("\n"))
  cache.saveCache([cacheDir], primaryKey)
}