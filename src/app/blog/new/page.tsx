"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { blogApi } from "@/lib/api";
import {
  BlogPostEditor,
  type BlogPostEditorHandle,
} from "@/lib/blog/BlogPostEditor";
import { createEmptyEditorDocument, type EditorOutput } from "@/lib/blog/editorOutput";
import { slugifyFromTitle } from "@/lib/blog/slugifyTitle";
import { previewSanitizedBlogHtml } from "@/lib/blog/dompurifyBlogHtml";

export default function AdminBlogNewPage() {
  const [tab, setTab] = useState<"blocks" | "html">("blocks");
  const [contentMode, setContentMode] = useState<"blocks" | "admin_html">("blocks");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "unpublished">("draft");
  const [htmlRaw, setHtmlRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<BlogPostEditorHandle>(null);
  const initialEditorData = useMemo(() => createEmptyEditorDocument(), []);

  const htmlPreview = useMemo(() => previewSanitizedBlogHtml(htmlRaw), [htmlRaw]);

  const submit = async () => {
    if (!title.trim() || !slug.trim()) {
      window.alert("Title and slug are required.");
      return;
    }

    let blocksPayload: EditorOutput | undefined;
    if (contentMode === "blocks") {
      try {
        blocksPayload = await editorRef.current!.save();
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "Could not read the editor.");
        return;
      }
      if (!blocksPayload.blocks?.length) {
        window.alert("Add at least one block before saving.");
        return;
      }
    } else if (!htmlRaw.trim()) {
      window.alert("Paste HTML for admin import mode.");
      return;
    }

    setSaving(true);
    try {
      await blogApi.adminCreate({
        title: title.trim(),
        slug: slug.trim().toLowerCase(),
        excerpt: excerpt.trim() || null,
        ...(authorName.trim() ? { author_name: authorName.trim() } : {}),
        content_mode: contentMode,
        status,
        blocks: contentMode === "blocks" ? blocksPayload! : null,
        html_body: contentMode === "admin_html" ? htmlRaw : null,
        seo: {},
      });
      window.location.href = "/blog";
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Save failed";
      window.alert(String(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New blog post</h1>
          <p className="text-sm text-slate-500">Admin authoring (Editor.js blocks or sanitized HTML)</p>
        </div>
        <Link href="/blog" className="text-sm font-bold text-indigo-600 hover:underline">
          ← Queue
        </Link>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-xs font-bold uppercase text-slate-500">
          Title
          <input
            className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
            value={title}
            onChange={(e) => {
              const v = e.target.value;
              setTitle(v);
              setSlug(slugifyFromTitle(v));
            }}
          />
        </label>
        <label className="block text-xs font-bold uppercase text-slate-500">
          Slug
          <input
            className="mt-1 w-full rounded border border-slate-200 px-3 py-2 font-mono text-sm"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-post-url"
          />
        </label>
        <label className="block text-xs font-bold uppercase text-slate-500">
          Excerpt
          <textarea
            className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
            rows={2}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />
        </label>
        <label className="block text-xs font-bold uppercase text-slate-500">
          Author name
          <input
            type="text"
            className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Shown on the storefront (defaults to your account name if empty)"
            maxLength={120}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-bold uppercase text-slate-500">
            Content mode
            <select
              className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
              value={contentMode}
              onChange={(e) => {
                const v = e.target.value as "blocks" | "admin_html";
                setContentMode(v);
                if (v === "admin_html") setTab("html");
              }}
            >
              <option value="blocks">Blocks (Editor.js)</option>
              <option value="admin_html">Import HTML (sanitized)</option>
            </select>
          </label>
          <label className="block text-xs font-bold uppercase text-slate-500">
            Status
            <select
              className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "draft" | "published" | "unpublished")
              }
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
            </select>
          </label>
        </div>

        <div className="flex gap-2 border-b border-slate-100 pb-2">
          <button
            type="button"
            disabled={contentMode === "admin_html"}
            className={`rounded px-3 py-1.5 text-sm font-bold ${
              tab === "blocks"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            } disabled:cursor-not-allowed disabled:opacity-40`}
            onClick={() => setTab("blocks")}
          >
            Blocks
          </button>
          <button
            type="button"
            className={`rounded px-3 py-1.5 text-sm font-bold ${
              tab === "html"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            onClick={() => setTab("html")}
          >
            Import HTML
          </button>
        </div>

        {contentMode === "blocks" && (
          <div className="space-y-2" hidden={tab !== "blocks"}>
            <p className="text-sm text-slate-600">
              <strong className="text-slate-800">Editor.js</strong> — paragraph, headings, list, quote,{" "}
              <strong className="text-slate-800">image</strong> (paste a URL or image), table, embed, and product
              blocks. Use the <strong>+</strong> menu to add a block. Switching to Import HTML keeps your blocks in
              memory until you save.
            </p>
            <BlogPostEditor
              ref={editorRef}
              resetKey="new"
              initialData={initialEditorData}
            />
          </div>
        )}

        {tab === "html" && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-xs font-bold uppercase text-slate-500">
              Raw HTML (paste)
              <textarea
                className="mt-1 w-full rounded border border-slate-200 px-3 py-2 font-mono text-xs"
                rows={16}
                value={htmlRaw}
                onChange={(e) => setHtmlRaw(e.target.value)}
              />
            </label>
            <div>
              <div className="text-xs font-bold uppercase text-slate-500">Preview (DOMPurify)</div>
              <div
                className="prose prose-sm mt-2 max-h-[28rem] overflow-auto rounded border border-slate-100 bg-slate-50 p-3"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: htmlPreview }}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={saving}
          onClick={() => void submit()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save post"}
        </button>
      </div>
    </div>
  );
}
