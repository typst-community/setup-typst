#!/usr/bin/env node
import * as cache from "@actions/cache";
import * as core from "@actions/core";

let packagesId = core.getInput("packages-id");

if (!packagesId || packagesId === "-1") {
  core.info("No packages should be cached.");
} else {
  const cachePath = {
    darwin: "~/Library/Caches",
    linux: "$XDG_CACHE_HOME",
    win32: "~/Library/Caches",
  }[process.platform.toString()]!;
  const cacheId = await cache.saveCache(
    [`${cachePath}/typst/packages/preview/`],
    `typst-packages-${packagesId}`
  );
  if (cacheId instanceof Error) {
    core.info("Packages cache upload fails.");
  } else {
    core.info(`✅ Packages group ${packagesId} uploaded!`);
  }
}
