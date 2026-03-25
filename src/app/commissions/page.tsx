"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Filter,
  Zap,
  Send,
  Minus,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { influencerAdminApi } from "@/lib/api";
import { clsx } from "clsx";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

type ModalState =
  | null
  | { type: "cancel-single"; id: string }
  | { type: "cancel-bulk"; ids: string[]; count: number }
  | { type: "confirm"; title: string; message: string; onConfirm: () => void }
  | { type: "result"; title: string; message: string; isError?: boolean };

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [influencers, setInfluencers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalState>(null);
  const [cancelReason, setCancelReason] = useState("");
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const res = await influencerAdminApi.getCommissions(filter || undefined);
      setCommissions(res.data);
      setSelected(new Set());
    } catch {
      console.error("Failed to load commissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    influencerAdminApi
      .getAll()
      .then((r) => {
        const map: Record<string, string> = {};
        for (const inf of r.data) {
          const id = inf._id || inf.id;
          map[id] = inf.display_name || inf.username;
        }
        setInfluencers(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCommissions();
  }, [filter]);

  useEffect(() => {
    if (modal && (modal.type === "cancel-single" || modal.type === "cancel-bulk")) {
      setTimeout(() => reasonRef.current?.focus(), 100);
    }
  }, [modal]);

  const actionableIds = useMemo(
    () =>
      commissions
        .filter((c) => c.status === "pending" || c.status === "approved")
        .map((c) => c._id || c.id),
    [commissions]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selected.size === actionableIds.length && actionableIds.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(actionableIds));
    }
  }, [actionableIds, selected.size]);

  const selectedPending = useMemo(
    () =>
      commissions.filter(
        (c) => selected.has(c._id || c.id) && c.status === "pending"
      ),
    [commissions, selected]
  );
  const selectedCancellable = useMemo(
    () =>
      commissions.filter(
        (c) =>
          selected.has(c._id || c.id) &&
          (c.status === "pending" || c.status === "approved")
      ),
    [commissions, selected]
  );

  // ── Actions ────────────────────────────────────────────

  const handleApprove = async (id: string) => {
    setActionId(id);
    try {
      const res = await influencerAdminApi.approveCommission(id);
      setCommissions((prev) =>
        prev.map((c) => ((c._id || c.id) === id ? res.data : c))
      );
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "Failed to approve commission.";
      setModal({ type: "result", title: "Error", message: detail, isError: true });
    } finally {
      setActionId(null);
    }
  };

  const openCancelModal = (id: string) => {
    setCancelReason("");
    setModal({ type: "cancel-single", id });
  };

  const openBulkCancelModal = () => {
    const ids = selectedCancellable.map((c) => c._id || c.id);
    setCancelReason("");
    setModal({ type: "cancel-bulk", ids, count: ids.length });
  };

  const executeCancelSingle = async () => {
    if (!modal || modal.type !== "cancel-single") return;
    const { id } = modal;
    const reason = cancelReason.trim() || undefined;
    setModal(null);
    setActionId(id);
    try {
      const res = await influencerAdminApi.cancelCommission(id, reason);
      setCommissions((prev) =>
        prev.map((c) => ((c._id || c.id) === id ? res.data : c))
      );
    } catch {
      setModal({ type: "result", title: "Error", message: "Failed to cancel commission.", isError: true });
    } finally {
      setActionId(null);
    }
  };

  const executeCancelBulk = async () => {
    if (!modal || modal.type !== "cancel-bulk") return;
    const { ids } = modal;
    const reason = cancelReason.trim() || undefined;
    setModal(null);
    setBulkAction("cancel-selected");
    try {
      const res = await influencerAdminApi.bulkCancelSelected(ids, reason);
      await fetchCommissions();
      setModal({ type: "result", title: "Cancelled", message: `${res.data.cancelled_count} commission(s) cancelled.` });
    } catch {
      setModal({ type: "result", title: "Error", message: "Failed to cancel selected.", isError: true });
    } finally {
      setBulkAction(null);
    }
  };

  const handleBulkApproveAll = () => {
    setModal({
      type: "confirm",
      title: "Approve All",
      message: `Approve all ${pendingCount} pending commissions?`,
      onConfirm: async () => {
        setModal(null);
        setBulkAction("approve-all");
        try {
          const res = await influencerAdminApi.bulkApproveCommissions();
          await fetchCommissions();
          setModal({ type: "result", title: "Approved", message: `${res.data.approved_count} commissions approved.` });
        } catch (err: any) {
          const detail = err?.response?.data?.detail || "Failed to bulk approve. Some orders may not be delivered yet.";
          setModal({ type: "result", title: "Error", message: detail, isError: true });
        } finally {
          setBulkAction(null);
        }
      },
    });
  };

  const handleBulkApproveSelected = () => {
    const ids = selectedPending.map((c) => c._id || c.id);
    setModal({
      type: "confirm",
      title: "Approve Selected",
      message: `Approve ${ids.length} selected commission(s)?`,
      onConfirm: async () => {
        setModal(null);
        setBulkAction("approve-selected");
        try {
          const res = await influencerAdminApi.bulkApproveSelected(ids);
          await fetchCommissions();
          setModal({ type: "result", title: "Approved", message: `${res.data.approved_count} commission(s) approved.` });
        } catch (err: any) {
          const detail = err?.response?.data?.detail || "Failed to approve selected. Some orders may not be delivered yet.";
          setModal({ type: "result", title: "Error", message: detail, isError: true });
        } finally {
          setBulkAction(null);
        }
      },
    });
  };

  const handleBulkPayout = () => {
    setModal({
      type: "confirm",
      title: "Create Payouts",
      message: `Create payouts for all influencers with approved commissions? This will mark ${approvedCount} commission(s) as paid.`,
      onConfirm: async () => {
        setModal(null);
        setBulkAction("payout");
        try {
          const res = await influencerAdminApi.bulkCreatePayouts();
          await fetchCommissions();
          setModal({ type: "result", title: "Payouts Created", message: `${res.data.length} payout(s) created successfully.` });
        } catch (err: any) {
          setModal({ type: "result", title: "Error", message: err.response?.data?.detail || "Failed to create payouts.", isError: true });
        } finally {
          setBulkAction(null);
        }
      },
    });
  };

  // ── Computed ────────────────────────────────────────────

  const pendingCount = useMemo(
    () => commissions.filter((c) => c.status === "pending").length,
    [commissions]
  );
  const approvedCount = useMemo(
    () => commissions.filter((c) => c.status === "approved").length,
    [commissions]
  );
  const totalAmount = useMemo(
    () =>
      commissions
        .filter((c) => c.status !== "cancelled")
        .reduce((sum, c) => sum + (c.commission_amount || 0), 0),
    [commissions]
  );

  const isAllSelected =
    actionableIds.length > 0 && selected.size === actionableIds.length;
  const isPartialSelected =
    selected.size > 0 && selected.size < actionableIds.length;

  // ── Modal Renderer ─────────────────────────────────────

  const renderModal = () => {
    if (!modal) return null;

    if (modal.type === "cancel-single" || modal.type === "cancel-bulk") {
      const count = modal.type === "cancel-bulk" ? modal.count : 1;
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 pt-5 pb-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Cancel Commission{count > 1 ? "s" : ""}</h3>
                  <p className="text-xs text-slate-500">
                    {count > 1
                      ? `${count} commissions will be cancelled`
                      : "This commission will be cancelled"}
                  </p>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Reason for cancellation
              </label>
              <textarea
                ref={reasonRef}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Order was refunded, Fraudulent activity..."
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 resize-none"
              />
              <p className="text-[10px] text-slate-400 mt-1.5">
                This reason will be visible to the influencer.
              </p>
            </div>
            <div className="px-6 pb-5 flex items-center justify-end space-x-2">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={modal.type === "cancel-single" ? executeCancelSingle : executeCancelBulk}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Cancel Commission{count > 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (modal.type === "confirm") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-in zoom-in-95 duration-200">
            <div className="px-6 pt-5 pb-4">
              <h3 className="font-bold text-slate-900 text-lg">{modal.title}</h3>
              <p className="text-sm text-slate-500 mt-2">{modal.message}</p>
            </div>
            <div className="px-6 pb-5 flex items-center justify-end space-x-2">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={modal.onConfirm}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (modal.type === "result") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-in zoom-in-95 duration-200">
            <div className="px-6 pt-5 pb-4 flex flex-col items-center text-center">
              {modal.isError ? (
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                  <XCircle size={24} className="text-red-500" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                  <CheckCircle2 size={24} className="text-emerald-500" />
                </div>
              )}
              <h3 className="font-bold text-slate-900 text-lg">{modal.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{modal.message}</p>
            </div>
            <div className="px-6 pb-5 flex justify-center">
              <button
                onClick={() => setModal(null)}
                className="px-6 py-2 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {renderModal()}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Commissions</h1>
          <p className="text-slate-500 mt-1">
            Review and manage influencer commissions from referred orders.
          </p>
        </div>

        {/* Global Bulk Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleBulkApproveAll}
            disabled={pendingCount === 0 || bulkAction !== null}
            className="flex items-center space-x-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {bulkAction === "approve-all" ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Zap size={14} />
            )}
            <span>Approve All ({pendingCount})</span>
          </button>
          <button
            onClick={handleBulkPayout}
            disabled={approvedCount === 0 || bulkAction !== null}
            className="flex items-center space-x-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {bulkAction === "payout" ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Send size={14} />
            )}
            <span>Create Payouts ({approvedCount})</span>
          </button>
        </div>
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

      {/* Selection Action Bar */}
      {selected.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3 flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
          <span className="text-sm font-bold text-indigo-700">
            {selected.size} selected
          </span>
          <div className="flex items-center space-x-2">
            {selectedPending.length > 0 && (
              <button
                onClick={handleBulkApproveSelected}
                disabled={bulkAction !== null}
                className="flex items-center space-x-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-40"
              >
                {bulkAction === "approve-selected" ? (
                  <Loader2 className="animate-spin" size={13} />
                ) : (
                  <CheckCircle2 size={13} />
                )}
                <span>Approve ({selectedPending.length})</span>
              </button>
            )}
            {selectedCancellable.length > 0 && (
              <button
                onClick={openBulkCancelModal}
                disabled={bulkAction !== null}
                className="flex items-center space-x-1.5 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-all disabled:opacity-40"
              >
                {bulkAction === "cancel-selected" ? (
                  <Loader2 className="animate-spin" size={13} />
                ) : (
                  <XCircle size={13} />
                )}
                <span>Cancel ({selectedCancellable.length})</span>
              </button>
            )}
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

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
                <th className="pl-6 pr-2 py-3 w-10">
                  <button
                    onClick={toggleSelectAll}
                    className={clsx(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                      isAllSelected
                        ? "bg-indigo-600 border-indigo-600"
                        : isPartialSelected
                          ? "bg-indigo-200 border-indigo-400"
                          : "border-slate-300 hover:border-slate-400"
                    )}
                  >
                    {isAllSelected ? (
                      <Check size={12} className="text-white" />
                    ) : isPartialSelected ? (
                      <Minus size={12} className="text-indigo-700" />
                    ) : null}
                  </button>
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Date
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Influencer
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Order ID
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Order Total
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Commission
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => {
                const cid = c._id || c.id;
                const isProcessing = actionId === cid;
                const isActionable =
                  c.status === "pending" || c.status === "approved";
                const isSelected = selected.has(cid);

                return (
                  <tr
                    key={cid}
                    className={clsx(
                      "border-b border-slate-50 relative transition-colors",
                      isSelected
                        ? "bg-indigo-50/50"
                        : "hover:bg-slate-50/50"
                    )}
                  >
                    <td className="pl-6 pr-2 py-4">
                      {isActionable ? (
                        <button
                          onClick={() => toggleSelect(cid)}
                          className={clsx(
                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                            isSelected
                              ? "bg-indigo-600 border-indigo-600"
                              : "border-slate-300 hover:border-indigo-400"
                          )}
                        >
                          {isSelected && (
                            <Check size={12} className="text-white" />
                          )}
                        </button>
                      ) : (
                        <div className="w-5 h-5" />
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {new Date(c.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-800">
                      {influencers[c.influencer_id] || (
                        <span className="font-mono text-xs text-slate-400">
                          {c.influencer_id?.slice(-8)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-500">
                      {c.order_id?.slice(-8)}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-900">
                      ₹{(c.order_total || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-4 font-bold text-emerald-700">
                      ₹{(c.commission_amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={clsx(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border w-fit",
                            STATUS_STYLES[c.status] ||
                              "bg-slate-50 text-slate-500 border-slate-200"
                          )}
                        >
                          {c.status}
                        </span>
                        {c.status === "cancelled" && c.cancellation_reason && (
                          <span
                            className="text-[10px] text-red-500 max-w-[140px] truncate"
                            title={c.cancellation_reason}
                          >
                            {c.cancellation_reason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
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
                            onClick={() => openCancelModal(cid)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                            title="Cancel"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      ) : c.status === "approved" ? (
                        <button
                          onClick={() => openCancelModal(cid)}
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
