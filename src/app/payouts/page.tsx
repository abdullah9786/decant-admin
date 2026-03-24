"use client";

import React, { useState, useEffect } from "react";
import {
  Loader2,
  DollarSign,
  CheckCircle2,
  Send,
  Sparkles,
  CheckCheck,
} from "lucide-react";
import { influencerAdminApi } from "@/lib/api";
import { clsx } from "clsx";

export default function PayoutsPage() {
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Record<string, any[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [loadingPayouts, setLoadingPayouts] = useState<string | null>(null);

  const fetchInfluencers = async () => {
    try {
      const r = await influencerAdminApi.getAll();
      setInfluencers(r.data);
    } catch {}
  };

  useEffect(() => {
    fetchInfluencers().finally(() => setLoading(false));
  }, []);

  const handleViewPayouts = async (influencerId: string) => {
    if (expandedId === influencerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(influencerId);
    setLoadingPayouts(influencerId);
    try {
      const res = await influencerAdminApi.getPayouts(influencerId);
      setPayouts((prev) => ({ ...prev, [influencerId]: res.data }));
    } catch {
      console.error("Failed to load payouts");
    } finally {
      setLoadingPayouts(null);
    }
  };

  const handleCreatePayout = async (influencerId: string) => {
    if (
      !confirm(
        "Create a payout for all approved commissions? This will mark them as paid."
      )
    )
      return;
    setActionId(influencerId);
    try {
      await influencerAdminApi.createPayout(influencerId, "upi");
      const [infRes, payRes] = await Promise.all([
        influencerAdminApi.getAll(),
        influencerAdminApi.getPayouts(influencerId),
      ]);
      setInfluencers(infRes.data);
      setPayouts((prev) => ({ ...prev, [influencerId]: payRes.data }));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create payout.");
    } finally {
      setActionId(null);
    }
  };

  const handleCompletePayout = async (
    payoutId: string,
    influencerId: string
  ) => {
    setActionId(payoutId);
    try {
      await influencerAdminApi.completePayout(payoutId);
      const res = await influencerAdminApi.getPayouts(influencerId);
      setPayouts((prev) => ({ ...prev, [influencerId]: res.data }));
    } catch {
      alert("Failed to complete payout.");
    } finally {
      setActionId(null);
    }
  };

  const handleBulkComplete = async (influencerId: string) => {
    const pendingPayouts = (payouts[influencerId] || []).filter(
      (p: any) => p.status === "pending"
    );
    if (
      !confirm(
        `Mark all ${pendingPayouts.length} pending payout(s) as completed?`
      )
    )
      return;
    setActionId(`bulk-${influencerId}`);
    try {
      await influencerAdminApi.bulkCompletePayouts(influencerId);
      const res = await influencerAdminApi.getPayouts(influencerId);
      setPayouts((prev) => ({ ...prev, [influencerId]: res.data }));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to complete payouts.");
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-slate-500 font-medium">Loading influencers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payouts</h1>
        <p className="text-slate-500 mt-1">
          Create and manage payouts for influencer commissions.
        </p>
      </div>

      {influencers.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center">
          <DollarSign className="text-slate-200" size={64} />
          <p className="text-slate-500 font-medium italic mt-4">
            No influencers yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {influencers.map((inf) => {
            const pid = inf._id || inf.id;
            const earnings = inf.earnings || {};
            const isExpanded = expandedId === pid;
            const infPayouts = payouts[pid] || [];
            const pendingPayoutCount = infPayouts.filter(
              (p: any) => p.status === "pending"
            ).length;

            return (
              <div
                key={pid}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
              >
                {/* Influencer row */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                      <Sparkles size={18} className="text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">
                        {inf.display_name}
                      </div>
                      <div className="text-xs text-slate-400">
                        @{inf.username}
                        {inf.payout_upi && (
                          <span className="ml-2 text-slate-300">
                            UPI: {inf.payout_upi}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Approved (ready)
                      </p>
                      <p className="text-lg font-bold text-blue-700">
                        ₹
                        {(earnings.approved_earnings || 0).toLocaleString(
                          "en-IN"
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Total Paid
                      </p>
                      <p className="text-lg font-bold text-emerald-700">
                        ₹
                        {(earnings.paid_earnings || 0).toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleCreatePayout(pid)}
                        disabled={
                          actionId === pid ||
                          (earnings.approved_earnings || 0) === 0
                        }
                        className="flex items-center space-x-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {actionId === pid ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <Send size={14} />
                        )}
                        <span>Create Payout</span>
                      </button>
                      <button
                        onClick={() => handleViewPayouts(pid)}
                        className="px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors"
                      >
                        {isExpanded ? "Hide" : "History"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Payout history */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/50">
                    {loadingPayouts === pid ? (
                      <div className="py-6 flex justify-center">
                        <Loader2
                          className="animate-spin text-indigo-600"
                          size={20}
                        />
                      </div>
                    ) : infPayouts.length === 0 ? (
                      <p className="text-sm text-slate-400 italic py-4 text-center">
                        No payouts yet.
                      </p>
                    ) : (
                      <>
                        {/* Bulk complete button */}
                        {pendingPayoutCount > 0 && (
                          <div className="mb-4 flex justify-end">
                            <button
                              onClick={() => handleBulkComplete(pid)}
                              disabled={actionId === `bulk-${pid}`}
                              className="flex items-center space-x-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {actionId === `bulk-${pid}` ? (
                                <Loader2
                                  className="animate-spin"
                                  size={14}
                                />
                              ) : (
                                <CheckCheck size={14} />
                              )}
                              <span>
                                Mark All Completed ({pendingPayoutCount})
                              </span>
                            </button>
                          </div>
                        )}

                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left">
                              <th className="pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Date
                              </th>
                              <th className="pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Amount
                              </th>
                              <th className="pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Method
                              </th>
                              <th className="pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Commissions
                              </th>
                              <th className="pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Status
                              </th>
                              <th className="pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {infPayouts.map((p: any) => {
                              const payId = p._id || p.id;
                              return (
                                <tr
                                  key={payId}
                                  className="border-t border-slate-100"
                                >
                                  <td className="py-3 text-slate-600">
                                    {new Date(
                                      p.created_at
                                    ).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </td>
                                  <td className="py-3 font-bold text-slate-900">
                                    ₹
                                    {(p.amount || 0).toLocaleString("en-IN")}
                                  </td>
                                  <td className="py-3 text-slate-500 uppercase text-xs">
                                    {p.method}
                                  </td>
                                  <td className="py-3 text-slate-500">
                                    {(p.commission_ids || []).length}
                                  </td>
                                  <td className="py-3">
                                    <span
                                      className={clsx(
                                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                                        p.status === "completed"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-amber-50 text-amber-700 border-amber-200"
                                      )}
                                    >
                                      {p.status}
                                    </span>
                                  </td>
                                  <td className="py-3">
                                    {p.status === "pending" ? (
                                      <button
                                        onClick={() =>
                                          handleCompletePayout(payId, pid)
                                        }
                                        disabled={actionId === payId}
                                        className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                                        title="Mark as completed"
                                      >
                                        {actionId === payId ? (
                                          <Loader2
                                            className="animate-spin"
                                            size={14}
                                          />
                                        ) : (
                                          <CheckCircle2 size={16} />
                                        )}
                                      </button>
                                    ) : (
                                      <span className="text-xs text-slate-300">
                                        —
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
