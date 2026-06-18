import type { EditorOutput } from "./editorOutput";

export function parseBlocksJson(raw: string): EditorOutput {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Blocks JSON is empty.");
  }
  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as EditorOutput).blocks)) {
    throw new Error('Blocks JSON must be an object with a "blocks" array.');
  }
  return parsed as EditorOutput;
}
