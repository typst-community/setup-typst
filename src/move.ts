#!/usr/bin/env node
import { setFailed } from "@actions/core";
import fs from "fs";
import path from "path";

export function move(src: string, dest: string) {
  if (src != dest) {
    try {
      fs.renameSync(src, dest);
    } catch (error) {
      try {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.cpSync(src, dest, { recursive: true, force: true });
        fs.rmSync(src, { recursive: true, force: true });
      } catch (error) {
        setFailed(
          `Failed to move '${src}' to '${dest}': ${(error as Error).message}.`,
        );
      }
    }
  }
}
