/** Stored Editor.js output shape (API + storefront). */
export type EditorOutput = {
  time?: number;
  blocks: unknown[];
  version?: string;
};

/** One empty paragraph — valid seed for a new Editor.js document. */
export function createEmptyEditorDocument(): EditorOutput {
  return {
    time: Date.now(),
    blocks: [{ type: "paragraph", data: { text: "" } }],
    version: "2.31.0",
  };
}

/** Ensure at least one block so Editor.js always has something to mount. */
export function normalizeEditorDocument(data: EditorOutput | null | undefined): EditorOutput {
  const blocks = data?.blocks;
  if (Array.isArray(blocks) && blocks.length > 0) {
    return {
      time: data!.time ?? Date.now(),
      blocks,
      version: data!.version ?? "2.31.0",
    };
  }
  return createEmptyEditorDocument();
}
