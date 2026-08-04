import { createHash } from "crypto";
import { readFile } from "fs/promises";

/**
 * Hashes a JSON object.
 * @param obj The JSON object to hash
 */
export async function hashJsonObject(
  obj: Record<string, unknown>,
): Promise<string> {
  const jsonString = JSON.stringify(obj);
  const hash = createHash("sha256").update(jsonString).digest("hex");
  return hash;
}

/**
 * Hashes a file.
 * @param filePath The path to the file to hash
 */
export async function hashFile(filePath: string): Promise<string> {
  const data = await readFile(filePath);
  const hash = createHash("sha256").update(data).digest("hex");
  return hash;
}
