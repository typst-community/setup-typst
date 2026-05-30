#!/usr/bin/env node
import * as fs from "fs/promises";
import * as path from "path";

import * as core from "@actions/core";

import hjson from "hjson";
import yaml from "yaml";
import { parse as parseToml } from "smol-toml";
import { XMLParser } from "fast-xml-parser";
import ini from "ini";
import { hclToJson } from "@openanime/hcl-unmarshal";

/**
 * Supported formats that can be parsed into a JSON-compatible object.
 */
export type SupportedFormat =
  | "json"
  | "hjson"
  | "yaml"
  | "toml"
  | "xml"
  | "ini"
  | "hcl";

/**
 * File extension to format mapping for automatic format detection.
 */
const EXTENSION_TO_FORMAT: Record<string, SupportedFormat> = {
  ".json": "json",
  ".hjson": "hjson",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".toml": "toml",
  ".xml": "xml",
  ".ini": "ini",
  ".hcl": "hcl",
};

const INPUT_FORMATS: SupportedFormat[] = [
  "json",
  "hjson",
  "yaml",
  "toml",
  "xml",
  "ini",
  "hcl",
];

function joinInputNames(inputNames: string[]): string {
  if (inputNames.length === 0) {
    return "";
  }
  if (inputNames.length === 1) {
    return inputNames[0];
  }
  return `${inputNames.slice(0, -1).join(", ")} and ${inputNames[inputNames.length - 1]}`;
}

function warnIgnoredInputs(
  usedInputName: string,
  ignoredInputNames: string[],
) {
  if (ignoredInputNames.length === 0) {
    return;
  }
  core.warning(
    `The ${usedInputName} input will be used. If it cannot be parsed, the action will fail. The ${joinInputNames(ignoredInputNames)} ${ignoredInputNames.length === 1 ? "input" : "inputs"} will be ignored.`,
  );
}

/**
 * Parses a string in any supported configuration format into a JSON-compatible JavaScript object.
 *
 * @param input - Raw text string in the specified format
 * @param format - Format to parse from
 * @returns A plain JavaScript object compatible with JSON.stringify()
 * @throws {Error} If the input is invalid or the format is unsupported
 */
export function parseToJsonObject(
  input: string,
  format: SupportedFormat,
): Record<string, unknown> {
  switch (format) {
    case "json":
      return JSON.parse(input) as Record<string, unknown>;
    case "hjson":
      return hjson.parse(input) as Record<string, unknown>;
    case "yaml":
      return yaml.parse(input) as Record<string, unknown>;
    case "toml":
      return parseToml(input) as Record<string, unknown>;
    case "ini":
      return ini.parse(input) as Record<string, unknown>;
    case "xml":
      return new XMLParser({
        parseTagValue: true,
        ignoreAttributes: false,
        attributeNamePrefix: "",
      }).parse(input) as Record<string, unknown>;
    case "hcl": {
      const raw = hclToJson(input) as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [
          k,
          Array.isArray(v) &&
          v.length === 1 &&
          typeof v[0] === "object" &&
          v[0] !== null
            ? v[0]
            : v,
        ]),
      );
    }
    default:
      throw new Error(`Unsupported format: ${String(format)}`);
  }
}

/**
 * Reads a configuration file from the filesystem, automatically detects its format by file extension,
 * and parses it into a JSON-compatible JavaScript object.
 *
 * @param filePath - Absolute or relative path to the configuration file
 * @returns A plain JavaScript object compatible with JSON.stringify()
 * @throws {Error} If the file cannot be read, the extension is unsupported, or the content is invalid
 */
export async function parseConfigFileToObject(
  filePath: string,
): Promise<Record<string, unknown>> {
  const content = await fs.readFile(filePath, "utf-8");
  const extname = path.extname(filePath).toLowerCase();
  const format = EXTENSION_TO_FORMAT[extname];
  if (!format) {
    throw new Error(
      `Unsupported file extension: ${extname}. Supported extensions: ${Object.keys(EXTENSION_TO_FORMAT).join(", ")}`,
    );
  }
  return parseToJsonObject(content, format);
}

/**
 * Loads configuration from GitHub Actions inputs by a base key, preferring file input first, then inline content by format.
 * @param baseKey Base input name to derive inputs
 * @returns Parsed JSON-compatible object, or undefined if no valid input provided
 * @throws {Error} If input exists but cannot be parsed
 */
export async function parseInputToObject(
  baseKey: string,
): Promise<Record<string, unknown> | undefined> {
  const fileInput = core.getInput(`${baseKey}-file`);
  const formatInputs = INPUT_FORMATS.flatMap((format) => {
    const inputName = `${baseKey}-${format}`;
    const content = core.getInput(inputName);
    return content ? [{ inputName, format, content }] : [];
  });

  if (fileInput && formatInputs.length > 0) {
    warnIgnoredInputs(
      `${baseKey}-file`,
      formatInputs.map((input) => input.inputName),
    );
  } else if (!fileInput && formatInputs.length > 1) {
    const [usedInput, ...ignoredInputs] = formatInputs;
    warnIgnoredInputs(
      usedInput.inputName,
      ignoredInputs.map((input) => input.inputName),
    );
  }

  if (fileInput) {
    try {
      return await parseConfigFileToObject(fileInput);
    } catch (err) {
      throw new Error(
        `Failed to parse ${baseKey}-file: ${(err as Error).message}`,
      );
    }
  }
  for (const { format, content, inputName } of formatInputs) {
    try {
      return parseToJsonObject(content, format);
    } catch (err) {
      throw new Error(`Failed to parse ${inputName}: ${(err as Error).message}`);
    }
  }
  return undefined;
}
