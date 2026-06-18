"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { blogApi } from "@/lib/api";
import {
  BlogPostEditor,
  type BlogPostEditorHandle,
} from "@/lib/blog/BlogPostEditor";
import {
  createEmptyEditorDocument,
  normalizeEditorDocument,
  type EditorOutput,
} from "@/lib/blog/editorOutput";
import { previewSanitizedBlogHtml } from "@/lib/blog/dompurifyBlogHtml";
import { slugifyFromTitle } from "@/lib/blog/slugifyTitle";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  status: string;
  content_mode: "blocks" | "admin_html";
  blocks?: EditorOutput | null;
  html_body?: string | null;
  author_name?: string | null;
};

export default function AdminBlogEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id || "");
  const [post, setPost] = useState<Post | null>(null);
  const [tab, setTab] = useState<"blocks" | "html">("blocks");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "unpublished" | "pending_review">(
    "draft",
  );
  const [contentMode, setContentMode] = useState<"blocks" | "admin_html">("blocks");
  const [htmlRaw, setHtmlRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const slugManuallyEdited = useRef(false);
  const editorRef = useRef<BlogPostEditorHandle>(null);

  const initialEditorData = useMemo(() => {
    if (!post) return createEmptyEditorDocument();
    return normalizeEditorDocument(post.blocks);
  }, [post]);

  const htmlPreview = useMemo(() => previewSanitizedBlogHtml(htmlRaw), [htmlRaw]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await blogApi.adminGet(id);
        const p = res.data as Post;
        if (cancelled) return;
        slugManuallyEdited.current = false;
        setPost(p);
        setTitle(p.title);
        setSlug(p.slug);
        setExcerpt(p.excerpt || "");
        setAuthorName((p.author_name as string | undefined) || "");
        setStatus(p.status as typeof status);
        setContentMode(p.content_mode);
        setHtmlRaw(p.html_body || "");
        setTab(p.content_mode === "admin_html" ? "html" : "blocks");
      } catch {
        router.replace("/blog");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const submit = async () => {
    if (!id || !title.trim() || !slug.trim()) return;

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
      window.alert("HTML body is required in import mode.");
      return;
    }

    setSaving(true);
    try {
      await blogApi.adminUpdate(id, {
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
      router.push("/blog");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Save failed";
      window.alert(String(msg));
    } finally {
      setSaving(false);
    }
  };

  const removePost = async () => {
    if (!id || !post) return;
    if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await blogApi.adminDelete(id);
      router.push("/blog");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Delete failed";
      window.alert(String(msg));
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !post) {
    return (
      <div className="flex justify-center py-20 text-slate-500">Loading…</div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit post</h1>
          <p className="text-sm text-slate-500">Update content and status</p>
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
              if (!slugManuallyEdited.current) {
                setSlug(slugifyFromTitle(v));
              }
            }}
          />
        </label>
        <label className="block text-xs font-bold uppercase text-slate-500">
          Slug
          <input
            className="mt-1 w-full rounded border border-slate-200 px-3 py-2 font-mono text-sm"
            value={slug}
            onChange={(e) => {
              slugManuallyEdited.current = true;
              setSlug(e.target.value);
            }}
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
            placeholder="Shown on the storefront (leave empty to keep current, or set for new attribution)"
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
              <option value="admin_html">Import HTML</option>
            </select>
          </label>
          <label className="block text-xs font-bold uppercase text-slate-500">
            Status
            <select
              className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              <option value="draft">Draft</option>
              <option value="pending_review">Pending review</option>
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
              blocks. Use the <strong>+</strong> menu to add a block.
            </p>
            <BlogPostEditor
              ref={editorRef}
              resetKey={post.id}
              initialData={initialEditorData}
            />
          </div>
        )}

        {tab === "html" && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-xs font-bold uppercase text-slate-500">
              HTML
              <textarea
                className="mt-1 w-full rounded border border-slate-200 px-3 py-2 font-mono text-xs"
                rows={16}
                value={htmlRaw}
                onChange={(e) => setHtmlRaw(e.target.value)}
              />
            </label>
            <div>
              <div className="text-xs font-bold uppercase text-slate-500">Preview</div>
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
          {saving ? "Saving…" : "Save changes"}
        </button>
        <div className="border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs text-slate-500">
            Permanently remove this post from the database and trigger storefront revalidation.
          </p>
          <button
            type="button"
            disabled={saving || deleting}
            onClick={() => void removePost()}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete post"}
          </button>
        </div>
      </div>
    </div>
  );
}
