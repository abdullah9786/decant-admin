"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { blogApi } from "@/lib/api";
import { Loader2 } from "lucide-react";

type Post = {
  id: string;
  slug: string;
  title: string;
  status: string;
  content_mode: string;
  author_id: string;
  moderation?: { submitted_at?: string };
};

export default function AdminBlogQueuePage() {
  const [queue, setQueue] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<Set<string>>(() => new Set());
  const [selectedAll, setSelectedAll] = useState<Set<string>>(() => new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, allRes] = await Promise.all([
        blogApi.listPending(),
        blogApi.listAll({ limit: 100 }),
      ]);
      setQueue(pendingRes.data);
      setAllPosts(allRes.data);
      setSelectedQueue(new Set());
      setSelectedAll(new Set());
    } catch {
      setQueue([]);
      setAllPosts([]);
      setSelectedQueue(new Set());
      setSelectedAll(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (id: string) => {
    setBusy(id);
    try {
      await blogApi.approve(id);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const reject = async (id: string) => {
    const reason = window.prompt("Rejection reason (required):")?.trim();
    if (!reason) return;
    setBusy(id);
    try {
      await blogApi.reject(id, reason);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const removePost = async (id: string, title: string) => {
    if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return;
    setBusy(id);
    try {
      await blogApi.adminDelete(id);
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Delete failed";
      window.alert(String(msg));
    } finally {
      setBusy(null);
    }
  };

  const toggleSelectQueue = (id: string) => {
    setSelectedQueue((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (id: string) => {
    setSelectedAll((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allQueueSelected = queue.length > 0 && queue.every((p) => selectedQueue.has(p.id));
  const allPostsSelected =
    allPosts.length > 0 && allPosts.every((p) => selectedAll.has(p.id));

  const bulkDeleteQueue = async () => {
    const ids = [...selectedQueue];
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} post(s) from the queue? This cannot be undone.`)) {
      return;
    }
    setBulkDeleting(true);
    try {
      await blogApi.adminBulkDelete(ids);
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Bulk delete failed";
      window.alert(String(msg));
    } finally {
      setBulkDeleting(false);
    }
  };

  const bulkDeleteAll = async () => {
    const ids = [...selectedAll];
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `Delete ${ids.length} post(s) from the database? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBulkDeleting(true);
    try {
      await blogApi.adminBulkDelete(ids);
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Bulk delete failed";
      window.alert(String(msg));
    } finally {
      setBulkDeleting(false);
    }
  };

  const rowDisabled = (id: string) => busy === id || bulkDeleting;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Blog</h1>
          <p className="text-sm text-slate-500">
            Pending community reviews and all posts you can edit.
          </p>
        </div>
        <Link
          href="/blog/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-indigo-700"
        >
          New post
        </Link>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Moderation queue</h2>
            <p className="text-sm text-slate-600">
              Only posts submitted by authors with status <strong>pending review</strong> appear
              here. Drafts and posts you publish from <strong>New post</strong> are listed below.
            </p>
          </div>
          {selectedQueue.size > 0 && (
            <button
              type="button"
              disabled={bulkDeleting}
              onClick={() => void bulkDeleteQueue()}
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-800 hover:bg-red-100 disabled:opacity-50"
            >
              {bulkDeleting ? "Deleting…" : `Delete selected (${selectedQueue.size})`}
            </button>
          )}
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={allQueueSelected}
                    disabled={queue.length === 0 || bulkDeleting}
                    onChange={() => {
                      if (allQueueSelected) setSelectedQueue(new Set());
                      else setSelectedQueue(new Set(queue.map((p) => p.id)));
                    }}
                    title="Select all in queue"
                  />
                </th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queue.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No posts awaiting moderation.
                  </td>
                </tr>
              )}
              {queue.map((p) => (
                <tr key={`queue-${p.id}`} className="hover:bg-slate-50/80">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={selectedQueue.has(p.id)}
                      disabled={bulkDeleting}
                      onChange={() => toggleSelectQueue(p.id)}
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{p.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.slug}</td>
                  <td className="px-4 py-3 text-slate-600">{p.content_mode}</td>
                  <td className="space-x-2 px-4 py-3 text-right">
                    <Link
                      href={`/blog/edit/${p.id}`}
                      className="inline-block rounded border border-slate-200 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      disabled={rowDisabled(p.id)}
                      onClick={() => void approve(p.id)}
                      className="rounded bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={rowDisabled(p.id)}
                      onClick={() => void reject(p.id)}
                      className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={rowDisabled(p.id)}
                      onClick={() => void removePost(p.id, p.title)}
                      className="rounded border border-red-200 bg-white px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">All posts (recent)</h2>
            <p className="text-sm text-slate-600">
              Includes drafts, published, and unpublished posts — newest updates first.
            </p>
          </div>
          {selectedAll.size > 0 && (
            <button
              type="button"
              disabled={bulkDeleting}
              onClick={() => void bulkDeleteAll()}
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-800 hover:bg-red-100 disabled:opacity-50"
            >
              {bulkDeleting ? "Deleting…" : `Delete selected (${selectedAll.size})`}
            </button>
          )}
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={allPostsSelected}
                    disabled={allPosts.length === 0 || bulkDeleting}
                    onChange={() => {
                      if (allPostsSelected) setSelectedAll(new Set());
                      else setSelectedAll(new Set(allPosts.map((p) => p.id)));
                    }}
                    title="Select all on this page"
                  />
                </th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allPosts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No posts yet. Create one with <strong>New post</strong>.
                  </td>
                </tr>
              )}
              {allPosts.map((p) => (
                <tr key={`all-${p.id}`} className="hover:bg-slate-50/80">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={selectedAll.has(p.id)}
                      disabled={bulkDeleting}
                      onChange={() => toggleSelectAll(p.id)}
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{p.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.slug}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase text-slate-700">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.content_mode}</td>
                  <td className="space-x-2 px-4 py-3 text-right">
                    <Link
                      href={`/blog/edit/${p.id}`}
                      className="inline-block rounded border border-slate-200 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      disabled={rowDisabled(p.id)}
                      onClick={() => void removePost(p.id, p.title)}
                      className="rounded border border-red-200 bg-white px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
