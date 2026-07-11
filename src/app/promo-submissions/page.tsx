"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { offerApi, promoSubmissionsApi } from "@/lib/api";
import { Loader2, Instagram, ExternalLink, CheckCircle2, XCircle } from "lucide-react";

function safeDate(v: string | undefined | null): string {
  if (!v) return "—";
  const d = !v.endsWith("Z") && !v.includes("+") ? new Date(v + "Z") : new Date(v);
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function PromoSubmissionsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [promoOffersById, setPromoOffersById] = useState<Record<string, any>>({});
  const [modalPrizeTemplates, setModalPrizeTemplates] = useState<any[]>([]);

  const [approveTarget, setApproveTarget] = useState<any | null>(null);
  const [prizeTemplateId, setPrizeTemplateId] = useState("");
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const resolvePrizeTemplates = useCallback(
    (submission: any) => {
      const campaignId = submission?.campaign_id;
      const linked = campaignId ? promoOffersById[campaignId] : undefined;
      if (linked?.config?.prize_templates?.length) {
        return linked.config.prize_templates;
      }
      const activePromo = Object.values(promoOffersById).find((o) => o.is_active);
      return activePromo?.config?.prize_templates || [];
    },
    [promoOffersById],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [queueRes, offersRes] = await Promise.all([
        promoSubmissionsApi.listQueue(),
        offerApi.getAll(),
      ]);
      setRows(queueRes.data || []);
      const promoOffers = (offersRes.data || []).filter(
        (o: any) => o.type === "instagram_promo",
      );
      const byId: Record<string, any> = {};
      for (const offer of promoOffers) {
        byId[offer._id || offer.id] = offer;
      }
      setPromoOffersById(byId);
    } catch {
      setRows([]);
      setPromoOffersById({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async () => {
    if (!approveTarget || !prizeTemplateId) return;
    const id = approveTarget._id || approveTarget.id;
    setBusy(id);
    try {
      await promoSubmissionsApi.approve(id, { prize_template_id: prizeTemplateId });
      setApproveTarget(null);
      setModalPrizeTemplates([]);
      setPrizeTemplateId("");
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Approve failed");
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    const id = rejectTarget._id || rejectTarget.id;
    setBusy(id);
    try {
      await promoSubmissionsApi.reject(id, rejectReason.trim());
      setRejectTarget(null);
      setRejectReason("");
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Reject failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Instagram className="text-emerald-600" size={28} />
          Promo Submissions
        </h1>
        <p className="text-slate-500 mt-1">
          Review Instagram promo entries and approve or reject winners.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
          No submissions yet.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Submitted</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Order</th>
                <th className="text-left px-4 py-3">Poster</th>
                <th className="text-left px-4 py-3">Post</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const id = row._id || row.id;
                const isBusy = busy === id;
                return (
                  <tr key={id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {safeDate(row.submitted_at)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{row.customer_name || "—"}</p>
                      <p className="text-xs text-slate-400">{row.customer_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/${row.order_id}`}
                        className="text-indigo-600 hover:underline font-mono text-xs"
                      >
                        {String(row.order_id).slice(-8)}…
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {row.poster_instagram_username ? (
                        <a
                          href={`https://instagram.com/${row.poster_instagram_username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 font-medium inline-flex items-center gap-1"
                        >
                          @{row.poster_instagram_username}
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[140px]">
                      {row.post_url ? (
                        <a
                          href={row.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 text-xs truncate block hover:underline"
                        >
                          View post
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                        {row.status}
                      </span>
                      {row.prize_snapshot?.label && (
                        <p className="text-[10px] text-green-700 mt-1">{row.prize_snapshot.label}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(row.status === "submitted" || row.status === "under_review") && (
                          <>
                            <button
                              disabled={isBusy}
                              onClick={() => {
                                const templates = resolvePrizeTemplates(row);
                                setModalPrizeTemplates(templates);
                                setApproveTarget(row);
                                setPrizeTemplateId(templates[0]?.id || "");
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Approve"
                            >
                              {isBusy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            </button>
                            <button
                              disabled={isBusy}
                              onClick={() => {
                                setRejectTarget(row);
                                setRejectReason("");
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Reject"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Approve winner & notify</h2>
            <p className="text-sm text-slate-600 mb-2">
              Customer: <strong>{approveTarget.customer_name}</strong>
            </p>
            <p className="text-xs text-slate-500 mb-4">
              The customer will receive an email that their video is approved and they have won the gift.
            </p>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Prize</label>
            <select
              value={prizeTemplateId}
              onChange={(e) => setPrizeTemplateId(e.target.value)}
              className="w-full mt-1 mb-6 px-4 py-3 border border-slate-200 rounded-lg text-sm font-bold"
            >
              {modalPrizeTemplates.length === 0 ? (
                <option value="">No prizes configured for this campaign</option>
              ) : (
                modalPrizeTemplates.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.label || "Unnamed prize"}
                  </option>
                ))
              )}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setApproveTarget(null);
                  setModalPrizeTemplates([]);
                  setPrizeTemplateId("");
                }}
                className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={!prizeTemplateId || !!busy}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl text-xs font-bold uppercase disabled:opacity-50"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Reject submission</h2>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (shown to customer if provided)"
              rows={4}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectTarget(null)}
                className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || !!busy}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-bold uppercase disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
