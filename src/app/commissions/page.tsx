"use client";

import React, { useState, useEffect } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Filter,
} from "lucide-react";
import { influencerAdminApi } from "@/lib/api";
import { clsx } from "clsx";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const res = await influencerAdminApi.getCommissions(filter || undefined);
      setCommissions(res.data);
    } catch {
      console.error("Failed to load commissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, [filter]);

  const handleApprove = async (id: string) => {
    setActionId(id);
    try {
      const res = await influencerAdminApi.approveCommission(id);
      setCommissions((prev) =>
        prev.map((c) => ((c._id || c.id) === id ? res.data : c))
      );
    } catch {
      alert("Failed to approve commission.");
    } finally {
      setActionId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this commission? This cannot be undone.")) return;
    setActionId(id);
    try {
      const res = await influencerAdminApi.cancelCommission(id);
      setCommissions((prev) =>
        prev.map((c) => ((c._id || c.id) === id ? res.data : c))
      );
    } catch {
      alert("Failed to cancel commission.");
    } finally {
      setActionId(null);
    }
  };

  const pendingCount = commissions.filter((c) => c.status === "pending").length;
  const approvedCount = commissions.filter((c) => c.status === "approved").length;
  const totalAmount = commissions
    .filter((c) => c.status !== "cancelled")
    .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Commissions</h1>
        <p className="text-slate-500 mt-1">
          Review and manage influencer commissions from referred orders.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Pending Review
            </span>
            <Clock size={16} className="text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Ready for Payout
            </span>
            <CheckCircle2 size={16} className="text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{approvedCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Total Commission
            </span>
            <DollarSign size={16} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            ₹{totalAmount.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
        <Filter size={16} className="text-slate-400" />
        {["", "pending", "approved", "paid", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={clsx(
              "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border transition-colors",
              filter === s
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
            )}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-slate-500 font-medium">Loading commissions...</p>
        </div>
      ) : commissions.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center">
          <DollarSign className="text-slate-200" size={64} />
          <p className="text-slate-500 font-medium italic mt-4">
            No commissions found.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Date
                </th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Influencer ID
                </th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Order ID
                </th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Order Total
                </th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Commission
                </th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Status
                </th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => {
                const cid = c._id || c.id;
                const isProcessing = actionId === cid;
                return (
                  <tr
                    key={cid}
                    className="border-b border-slate-50 hover:bg-slate-50/50 relative"
                  >
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(c.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {c.influencer_id?.slice(-8)}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {c.order_id?.slice(-8)}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      ₹{(c.order_total || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-700">
                      ₹{(c.commission_amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={clsx(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                          STATUS_STYLES[c.status] ||
                            "bg-slate-50 text-slate-500 border-slate-200"
                        )}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isProcessing ? (
                        <Loader2
                          className="animate-spin text-indigo-600"
                          size={16}
                        />
                      ) : c.status === "pending" ? (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleApprove(cid)}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            onClick={() => handleCancel(cid)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                            title="Cancel"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      ) : c.status === "approved" ? (
                        <button
                          onClick={() => handleCancel(cid)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title="Cancel"
                        >
                          <XCircle size={16} />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
