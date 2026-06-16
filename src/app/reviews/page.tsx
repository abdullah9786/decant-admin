"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Search,
  Trash2,
  Upload,
  Star,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { productApi, reviewApi } from "@/lib/api";
import ConfirmDialog, { ConfirmDialogConfig } from "@/components/shared/ConfirmDialog";

const BULK_EXAMPLE = `[
  {
    "product_slug": "oud-royal",
    "user_name": "Priya S.",
    "rating": 5,
    "comment": "Long-lasting and exactly as described.",
    "created_at": "2025-11-12T10:00:00Z"
  },
  {
    "product_id": "665abc123def456789012345",
    "user_name": "Rahul M.",
    "rating": 4,
    "comment": "Great sillage for evening wear."
  }
]`;

function getReviewId(review: any) {
  return review._id || review.id;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "customer" | "admin">("all");

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    created_count: number;
    failed: { index: number; error: string }[];
  } | null>(null);

  const [confirm, setConfirm] = useState<ConfirmDialogConfig | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const productNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      map.set(String(p._id || p.id), p.name);
    }
    return map;
  }, [products]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reviewsRes, productsRes] = await Promise.all([
        reviewApi.getAll({ limit: 200 }),
        productApi.getAll({ include_inactive: true }),
      ]);
      setReviews(reviewsRes.data || []);
      setProducts(productsRes.data || []);
    } catch (err) {
      console.error("Failed to load reviews", err);
      setToast({ kind: "error", message: "Failed to load reviews." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      if (sourceFilter !== "all" && review.source !== sourceFilter) return false;
      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      const productName = productNameById.get(review.product_id) || "";
      return (
        review.user_name?.toLowerCase().includes(q) ||
        review.comment?.toLowerCase().includes(q) ||
        productName.toLowerCase().includes(q) ||
        review.product_id?.toLowerCase().includes(q)
      );
    });
  }, [reviews, searchTerm, sourceFilter, productNameById]);

  const handleBulkImport = async () => {
    setBulkError(null);
    setBulkResult(null);
    let parsed: any[];
    try {
      parsed = JSON.parse(bulkText);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("JSON must be a non-empty array.");
      }
    } catch (err: any) {
      setBulkError(err?.message || "Invalid JSON.");
      return;
    }

    setBulkLoading(true);
    try {
      const res = await reviewApi.bulkCreate(parsed);
      setBulkResult(res.data);
      if (res.data?.created_count > 0) {
        setToast({
          kind: "success",
          message: `Imported ${res.data.created_count} review(s).`,
        });
        await fetchData();
      }
      if (res.data?.failed?.length === 0) {
        setBulkText("");
        setBulkOpen(false);
      }
    } catch (err: any) {
      setBulkError(err?.response?.data?.detail || "Bulk import failed.");
    } finally {
      setBulkLoading(false);
    }
  };

  const togglePublished = async (review: any) => {
    const id = getReviewId(review);
    const next = !review.is_published;
    setReviews((prev) =>
      prev.map((r) => (getReviewId(r) === id ? { ...r, is_published: next } : r)),
    );
    try {
      await reviewApi.update(id, { is_published: next });
      setToast({
        kind: "success",
        message: next ? "Review published." : "Review hidden.",
      });
    } catch (err) {
      console.error(err);
      setReviews((prev) =>
        prev.map((r) => (getReviewId(r) === id ? { ...r, is_published: !next } : r)),
      );
      setToast({ kind: "error", message: "Failed to update review." });
    }
  };

  const deleteReview = (review: any) => {
    const id = getReviewId(review);
    setConfirm({
      title: "Delete review",
      message: `Remove the review by ${review.user_name}?`,
      confirmLabel: "Delete",
      destructive: true,
      run: async () => {
        await reviewApi.delete(id);
        setReviews((prev) => prev.filter((r) => getReviewId(r) !== id));
        setToast({ kind: "success", message: "Review deleted." });
      },
    });
  };

  const runConfirm = async () => {
    if (!confirm) return;
    const cfg = confirm;
    setConfirmLoading(true);
    try {
      await cfg.run();
    } finally {
      setConfirmLoading(false);
      setConfirm(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reviews</h1>
          <p className="text-slate-500 mt-1">
            Manage customer reviews and bulk-import editorial reviews for products.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setBulkOpen(true);
            setBulkError(null);
            setBulkResult(null);
          }}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Upload size={16} />
          Bulk import JSON
        </button>
      </div>

      {toast && (
        <div
          className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
            toast.kind === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {toast.kind === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by product, reviewer, or comment…"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)}
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white"
        >
          <option value="all">All sources</option>
          <option value="customer">Customer only</option>
          <option value="admin">Admin seeded</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 className="animate-spin mr-2" size={20} />
            Loading reviews…
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Star className="mx-auto mb-3 opacity-30" size={32} />
            <p>No reviews found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Product</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Reviewer</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Rating</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Comment</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Source</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReviews.map((review) => {
                  const id = getReviewId(review);
                  return (
                    <tr key={id} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-slate-900 max-w-[180px] truncate">
                          {productNameById.get(review.product_id) || "Unknown product"}
                        </div>
                        <div className="text-xs text-slate-400 font-mono truncate max-w-[180px]">
                          {review.product_id}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-800">{review.user_name}</td>
                      <td className="px-4 py-3 align-top">
                        <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                          <Star size={14} className="fill-current" />
                          {review.rating}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top max-w-xs">
                        <p className="text-slate-700 line-clamp-3">{review.comment}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {review.source === "customer" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-1">
                            {review.is_verified_purchase && <ShieldCheck size={12} />}
                            Customer
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-1">
                            Admin
                          </span>
                        )}
                        {!review.is_published && (
                          <div className="text-xs text-slate-400 mt-1">Hidden</div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-500 whitespace-nowrap">
                        {formatDate(review.created_at)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => togglePublished(review)}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                            title={review.is_published ? "Hide review" : "Publish review"}
                          >
                            {review.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteReview(review)}
                            className="p-2 rounded-lg border border-red-100 hover:bg-red-50 text-red-600"
                            title="Delete review"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Bulk import reviews</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Paste a JSON array. Use <code className="text-xs bg-slate-100 px-1 rounded">product_id</code> or{" "}
                  <code className="text-xs bg-slate-100 px-1 rounded">product_slug</code> per row.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={14}
                placeholder={BULK_EXAMPLE}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <details className="text-sm text-slate-600">
                <summary className="cursor-pointer font-medium text-indigo-700">
                  View example JSON
                </summary>
                <pre className="mt-2 p-3 bg-slate-50 rounded-lg overflow-x-auto text-xs">
                  {BULK_EXAMPLE}
                </pre>
              </details>
              {bulkError && <p className="text-sm text-red-600">{bulkError}</p>}
              {bulkResult && (
                <div className="text-sm rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                  <p className="text-green-700 font-medium">
                    Created: {bulkResult.created_count}
                  </p>
                  {bulkResult.failed?.length > 0 && (
                    <div className="text-red-700">
                      <p className="font-medium">Failed rows:</p>
                      <ul className="list-disc pl-5">
                        {bulkResult.failed.map((f) => (
                          <li key={f.index}>
                            Row {f.index + 1}: {f.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                disabled={bulkLoading || !bulkText.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {bulkLoading && <Loader2 size={16} className="animate-spin" />}
                Import reviews
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        config={confirm}
        loading={confirmLoading}
        onCancel={() => setConfirm(null)}
        onConfirm={runConfirm}
      />
    </div>
  );
}
