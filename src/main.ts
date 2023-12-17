#!/usr/bin/env node
import * as core from "@actions/core"
import * as tc from "@actions/tool-cache"
import { join } from "node:path";

let version = core.getInput("typst-version")
let tag: string
if (version === "latest") {
  const response = await fetch(
    `https://ungh.cc/repos/typst/typst/releases/latest`,
  );
  const json = await response.json();
  tag = json.release.tag;
  version = tag.match(/\d+\.\d+\.\d+/)![0]
} else {
  tag = `v${version}`
}

let path = tc.find("typst", version);
if (!path) {
  const archive = {
    "darwin,arm64": "typst-aarch64-apple-darwin.tar.xz",
    "linux,x64": "typst-x86_64-unknown-linux-musl.tar.xz",
    "linux,arm": "typst-armv7-unknown-linux-musleabi.tar.xz",
    "darwin,x64": "typst-x86_64-apple-darwin.tar.xz",
    "win32,x64": "typst-x86_64-pc-windows-msvc.zip",
    "linux,arm64": "typst-aarch64-unknown-linux-musl.tar.xz",
  }[[process.platform, process.arch].toString()]!;
  
  const folder = {
    "darwin,arm64": "typst-aarch64-apple-darwin",
    "linux,x64": "typst-x86_64-unknown-linux-musl",
    "linux,arm": "typst-armv7-unknown-linux-musleabi",
    "darwin,x64": "typst-x86_64-apple-darwin",
    "win32,x64": "typst-x86_64-pc-windows-msvc",
    "linux,arm64": "typst-aarch64-unknown-linux-musl",
  }[[process.platform, process.arch].toString()]!;
  
  path = await tc.downloadTool(`https://github.com/typst/typst/releases/download/${tag}/${archive}`)
  if (archive.endsWith(".zip")) {
    path = await tc.extractZip(path);
  } else {
    path = await tc.extractXar(path);
  }
  path = join(path, folder);
  path = await tc.cacheDir(path, "typst", version);  
}
core.addPath(path);
