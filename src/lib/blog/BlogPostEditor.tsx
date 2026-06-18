"use client";

import type { BlockToolConstructable, OutputData } from "@editorjs/editorjs";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { EditorOutput } from "./editorOutput";
import { normalizeEditorDocument } from "./editorOutput";
import "./blog-post-editor.css";

/** SimpleImage has no static toolbox — Editor.js 2.31+ needs this for the + block menu. */
const IMAGE_TOOLBOX_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2" ry="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';

export type BlogPostEditorHandle = {
  save: () => Promise<EditorOutput>;
};

type BlogPostEditorProps = {
  /** Bump when `initialData` should fully re-init the editor (e.g. post id). */
  resetKey: string;
  initialData: EditorOutput;
};

type EditorInstance = {
  save: () => Promise<unknown>;
  destroy: () => void | Promise<void>;
  isReady: Promise<void>;
};

function toOutputData(data: EditorOutput): OutputData {
  const normalized = normalizeEditorDocument(data);
  return {
    time: normalized.time,
    blocks: normalized.blocks as OutputData["blocks"],
    version: normalized.version,
  };
}

export const BlogPostEditor = forwardRef<BlogPostEditorHandle, BlogPostEditorProps>(
  function BlogPostEditor({ resetKey, initialData }, ref) {
    const holderRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<EditorInstance | null>(null);
    const initialRef = useRef(initialData);
    initialRef.current = initialData;

    useImperativeHandle(ref, () => ({
      async save() {
        if (!editorRef.current) {
          throw new Error("Editor is not ready yet.");
        }
        const out = await editorRef.current.save();
        return out as EditorOutput;
      },
    }));

    useEffect(() => {
      const holder = holderRef.current;
      if (!holder) return;

      let cancelled = false;
      const live = { editor: null as EditorInstance | null };

      void (async () => {
        const [
          { default: EditorJS },
          { default: ParagraphWithLinks },
          { default: Header },
          { default: List },
          { default: QuoteWithLinks },
          { default: Delimiter },
          { default: Embed },
          { default: Table },
          { default: SimpleImage },
          { default: ProductTool },
        ] = await Promise.all([
          import("@editorjs/editorjs"),
          import("./paragraphWithLinks"),
          import("@editorjs/header"),
          import("@editorjs/list"),
          import("./quoteWithLinks"),
          import("@editorjs/delimiter"),
          import("@editorjs/embed"),
          import("@editorjs/table"),
          import("@editorjs/simple-image"),
          import("./editorProductTool"),
        ]);

        if (cancelled || !holderRef.current) return;

        const editor = new EditorJS({
          holder: holderRef.current,
          data: toOutputData(initialRef.current),
          inlineToolbar: ["link", "bold", "italic"],
          tools: {
            paragraph: {
              class: ParagraphWithLinks as unknown as BlockToolConstructable,
              inlineToolbar: true,
              config: {},
            },
            header: {
              class: Header as unknown as BlockToolConstructable,
              inlineToolbar: true,
              config: {
                levels: [2, 3, 4],
                defaultLevel: 2,
              },
            },
            list: {
              class: List as unknown as BlockToolConstructable,
              inlineToolbar: true,
              config: {
                defaultStyle: "unordered",
                maxLevel: 4,
              },
            },
            quote: {
              class: QuoteWithLinks as unknown as BlockToolConstructable,
              inlineToolbar: true,
              config: {
                quotePlaceholder: "Quote",
                captionPlaceholder: "Citation",
              },
            },
            delimiter: Delimiter as unknown as BlockToolConstructable,
            embed: Embed as unknown as BlockToolConstructable,
            table: {
              class: Table as unknown as BlockToolConstructable,
              inlineToolbar: true,
              config: { rows: 2, cols: 3 },
            },
            image: {
              class: SimpleImage as unknown as BlockToolConstructable,
              toolbox: {
                title: "Image",
                icon: IMAGE_TOOLBOX_ICON,
              },
              config: {
                placeholder: "Paste an image URL (https)",
              },
            },
            product: {
              class: ProductTool as unknown as BlockToolConstructable,
            },
          },
          placeholder: "Start writing…",
          minHeight: 240,
        });

        live.editor = editor;

        try {
          await editor.isReady;
        } catch {
          if (live.editor === editor) {
            void editor.destroy();
            live.editor = null;
          }
          return;
        }

        if (cancelled) {
          if (live.editor === editor) {
            void editor.destroy();
            live.editor = null;
          }
          return;
        }

        editorRef.current = editor;
      })();

      return () => {
        cancelled = true;
        editorRef.current = null;
        const ed = live.editor;
        live.editor = null;
        if (ed) void ed.destroy();
      };
    }, [resetKey]);

    return (
      <div
        ref={holderRef}
        className="blog-post-editor-holder blog-post-editor text-left"
      />
    );
  },
);
