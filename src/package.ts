#!/usr/bin/env node
import fs from "fs";
import path from "path";
import * as os from "os";

import * as cache from "@actions/cache";
import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as tc from "@actions/tool-cache";

import { hashJsonObject, hashFile } from "./utils/hash";
import { move } from "./utils/move";

const TYPST_PACKAGES_DIR = {
  linux: () =>
    path.join(
      process.env.XDG_CACHE_HOME ||
        (os.homedir() ? path.join(os.homedir(), ".cache") : undefined)!,
      "typst/packages",
    ),
  darwin: () =>
    path.join(process.env.HOME!, "Library/Caches", "typst/packages"),
  win32: () => path.join(process.env.LOCALAPPDATA!, "typst/packages"),
}[process.platform as string]!();

const packagesLocalDir = path.join(TYPST_PACKAGES_DIR, "/local");
const packagesPreviewDir = path.join(TYPST_PACKAGES_DIR, "/preview");

/**
 * Extracts the version of a package from its TOML file.
 * @param toml Path to the TOML file
 * @returns The version of the package
 */
function getPackageVersion(toml: string): string {
  core.debug(`Reading package version from TOML file: '${toml}'.`);
  let content;
  try {
    content = fs.readFileSync(toml, "utf-8");
    core.info(`Successfully read TOML file: '${toml}'.`);
  } catch (error) {
    core.warning(
      `Failed to read TOML file '${toml}': ${
        (error as Error).message
      }. Defaulting to version '0.0.0'.`,
    );
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
    `Failed to find version in local package TOML file ${toml}. Package version will be 0.0.0.`,
  );
  return "0.0.0";
}

/**
 * Downloads and caches the specified Typst preview package.
 * @param cachePackage Path to the Typst package to cache
 * @param executableName Name of the Typst executable
 */
export async function cachePackages(
  cachePackage: string,
  executableName: string,
) {
  if (!fs.existsSync(cachePackage)) {
    core.warning(
      `Dependency path '${cachePackage}' not found. Skipping caching.`,
    );
    return;
  }
  const cacheDir = TYPST_PACKAGES_DIR + "/preview";
  const hash = await hashFile(cachePackage);
  const primaryKey = `typst-preview-packages-${hash}`;
  core.info(`Computed cache key: ${primaryKey}.`);
  const cacheKey = await cache.restoreCache([cacheDir], primaryKey);
  if (cacheKey != undefined) {
    core.info(`✅ Packages restored from cache.`);
  } else {
    core.debug(`Cache miss. Compiling Typst packages.`);
    await exec.exec(executableName, ["compile", cachePackage]);
    try {
      let cacheId = await cache.saveCache([cacheDir], primaryKey);
      core.info(`✅ Cache saved successfully with key: ${primaryKey}.`);
      core.debug(`Cache ID: ${cacheId}`);
    } catch (error) {
      core.warning(`Failed to save cache: ${(error as Error).message}.`);
    }
    return;
  }
}

/**
 * Downloads a Typst package from a ZIP archive file and extracts it to the specified directory.
 * @param packagesDir The directory to extract the package to
 * @param name The name of the package
 * @param url The URL of the ZIP archive file
 */
async function downloadZipPackage(
  packagesDir: string,
  name: string,
  url: string,
) {
  const packageDir = path.join(packagesDir, name);
  if (!fs.existsSync(packageDir)) {
    fs.mkdirSync(packageDir);
    core.debug(`Created directory '${packageDir}' for package ${name}.`);
  } else {
    core.warning(
      `Directory '${packageDir}' already exists. Check for duplicate package names.`,
    );
  }
  core.info(`Downloading package ${name} from ${url}.`);
  let packageResponse = await tc.downloadTool(url);
  if (process.platform == "win32") {
    if (!packageResponse.endsWith(".zip")) {
      move(
        packageResponse,
        path.join(
          path.dirname(packageResponse),
          `${path.basename(packageResponse)}.zip`,
        ),
      );
      packageResponse = path.join(
        path.dirname(packageResponse),
        `${path.basename(packageResponse)}.zip`,
      );
    }
  }
  packageResponse = await tc.extractZip(packageResponse);
  core.debug(`Extracted package ${name}.`);
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
      const packageVersion = getPackageVersion(
        path.join(innerPath, "typst.toml"),
      );
      move(innerPath, path.join(packageDir, packageVersion));
    }
  } else {
    const packageVersion = getPackageVersion(
      path.join(packageResponse, "typst.toml"),
    );
    move(packageResponse, path.join(packageDir, packageVersion));
  }
  core.info(`✅ Downloaded ${name} to '${packageDir}'`);
}

/**
 * Downloads and caches the specified local Typst packages.
 * @param localPackage Path to the local Typst packages
 * @param cacheLocalPackages Whether to cache the local packages
 */
export async function downloadZipLocalPackages(
  localPackage: string,
  cacheLocalPackages: boolean,
) {
  if (!fs.existsSync(localPackage)) {
    core.warning(
      `ZIP packages path '${localPackage}' not found. Skipping downloading.`,
    );
    return;
  }
  if (cacheLocalPackages) {
    const hash = await hashFile(localPackage);
    const primaryKey = `typst-local-packages-${hash}`;
    core.info(`Computed cache key: ${primaryKey}.`);
    const cacheKey = await cache.restoreCache([packagesLocalDir], primaryKey);
    if (cacheKey != undefined) {
      core.info(`✅ Local packages restored from cache.`);
      return;
    }
    core.debug(`Cache miss. Downloading local packages.`);
  }
  let packages;
  try {
    packages = JSON.parse(fs.readFileSync(localPackage, "utf8"));
  } catch (error) {
    core.warning(
      `Failed to parse zip-packages json file: ${
        (error as Error).message
      }. Skipping downloading.`,
    );
    return;
  }
  core.info(`Downloading ZIP @local packages.`);
  if (!fs.existsSync(packagesLocalDir)) {
    fs.mkdirSync(packagesLocalDir, { recursive: true });
    core.debug(`Created ZIP @local packages directory: '${packagesLocalDir}'.`);
  }
  await Promise.all(
    Object.entries(packages.local).map(([key, value]) => {
      if (typeof value === "string") {
        return downloadZipPackage(packagesLocalDir, key, value);
      } else {
        core.warning(`Invalid package URL for ${key}: Expected a string.`);
        return Promise.resolve();
      }
    }),
  );
  if (cacheLocalPackages) {
    try {
      const hash = await hashFile(localPackage);
      const primaryKey = `typst-local-packages-${hash}`;
      let cacheId = await cache.saveCache([packagesLocalDir], primaryKey);
      core.info(`✅ Cache saved successfully with key: ${primaryKey}.`);
      core.debug(`Cache ID: ${cacheId}`);
    } catch (error) {
      core.warning(`Failed to save cache: ${(error as Error).message}.`);
    }
  }
  return;
}

/**
 * Downloads and caches preview Typst packages.
 * @param previewPackages Path to the preview Typst packages
 */
export async function downloadZipPreviewPackages(previewPackages: string) {
  if (!fs.existsSync(previewPackages)) {
    core.warning(
      `ZIP packages path '${previewPackages}' not found. Skipping downloading.`,
    );
    return;
  }
  let packages;
  try {
    packages = JSON.parse(fs.readFileSync(previewPackages, "utf8"));
  } catch (error) {
    core.warning(
      `Failed to parse zip-packages json file: ${
        (error as Error).message
      }. Skipping downloading.`,
    );
    return;
  }
  core.info(`Downloading ZIP @preview packages.`);
  if (!fs.existsSync(packagesPreviewDir)) {
    fs.mkdirSync(packagesPreviewDir, { recursive: true });
    core.debug(
      `Created ZIP @preview packages directory: '${packagesPreviewDir}'.`,
    );
  }
  await Promise.all(
    Object.entries(packages.preview).map(([key, value]) => {
      if (typeof value === "string") {
        return downloadZipPackage(packagesPreviewDir, key, value);
      } else {
        core.warning(`Invalid package URL for ${key}: Expected a string.`);
        return Promise.resolve();
      }
    }),
  );
  return;
}
