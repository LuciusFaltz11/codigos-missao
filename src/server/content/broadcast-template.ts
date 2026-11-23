import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readContent(name: string) {
  return readFileSync(join(process.cwd(), "src/content/email", name), "utf8");
}

export function loadDefaultBroadcastHtml() {
  return readContent("leads.html");
}

export function loadDefaultBroadcastText() {
  return readContent("leads.txt");
}
