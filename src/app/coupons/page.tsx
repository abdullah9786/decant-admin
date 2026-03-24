"use client";

import React, { useState, useEffect } from "react";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Tag,
  ToggleLeft,
  ToggleRight,
  X,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { influencerAdminApi } from "@/lib/api";
import { clsx } from "clsx";

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    influencer_id: "",
    discount_percent: 5,
    max_uses: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, iRes] = await Promise.all([
        influencerAdminApi.getCoupons(),
        influencerAdminApi.getAll(),
      ]);
      setCoupons(cRes.data);
      setInfluencers(iRes.data);
    } catch {
      console.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingCoupon(null);
    setForm({ code: "", influencer_id: "", discount_percent: 5, max_uses: "" });
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (coupon: any) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      influencer_id: coupon.influencer_id,
      discount_percent: coupon.discount_percent,
      max_uses: coupon.max_uses?.toString() || "",
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    try {
      if (editingCoupon) {
        const res = await influencerAdminApi.updateCoupon(
          editingCoupon._id || editingCoupon.id,
          {
            discount_percent: form.discount_percent,
            max_uses: form.max_uses ? parseInt(form.max_uses) : null,
          }
        );
        setCoupons((prev) =>
          prev.map((c) =>
            (c._id || c.id) === (editingCoupon._id || editingCoupon.id)
              ? res.data
              : c
          )
        );
      } else {
        const res = await influencerAdminApi.createCoupon({
          code: form.code.toUpperCase().trim(),
          influencer_id: form.influencer_id,
          discount_percent: form.discount_percent,
          max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        });
        setCoupons([res.data, ...coupons]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err.response?.data?.detail || "Operation failed.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleActive = async (coupon: any) => {
    const cid = coupon._id || coupon.id;
    setActionId(cid);
    try {
      const res = await influencerAdminApi.updateCoupon(cid, {
        is_active: !coupon.is_active,
      });
      setCoupons((prev) =>
        prev.map((c) => ((c._id || c.id) === cid ? res.data : c))
      );
    } catch {
      alert("Failed to update coupon.");
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (couponId: string) => {
    if (!confirm("Delete this coupon? This cannot be undone.")) return;
    setActionId(couponId);
    try {
      await influencerAdminApi.deleteCoupon(couponId);
      setCoupons((prev) => prev.filter((c) => (c._id || c.id) !== couponId));
    } catch {
      alert("Failed to delete coupon.");
    } finally {
      setActionId(null);
    }
  };

  const getInfluencerName = (id: string) => {
    const inf = influencers.find((i) => (i._id || i.id) === id);
    return inf ? `@${inf.username}` : id?.slice(-6);
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-slate-500 font-medium">Loading coupons...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Coupons</h1>
          <p className="text-slate-500 mt-1">
            Manage influencer coupon codes for order attribution and discounts.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg flex items-center space-x-2 font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          <Plus size={18} />
          <span>Create Coupon</span>
        </button>
      </div>

      {coupons.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center">
          <Tag className="text-slate-200" size={64} />
          <p className="text-slate-500 font-medium italic mt-4">
            No coupons created yet.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Code
                </th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Influencer
                </th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Discount
                </th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Uses
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
              {coupons.map((c) => {
                const cid = c._id || c.id;
                return (
                  <tr
                    key={cid}
                    className="border-b border-slate-50 hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded text-xs">
                        {c.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {getInfluencerName(c.influencer_id)}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {c.discount_percent}%
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {c.times_used || 0}
                      {c.max_uses ? ` / ${c.max_uses}` : ""}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={clsx(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                          c.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-red-50 text-red-600 border-red-200"
                        )}
                      >
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleToggleActive(c)}
                          disabled={actionId === cid}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          title={c.is_active ? "Deactivate" : "Activate"}
                        >
                          {c.is_active ? (
                            <ToggleRight
                              size={18}
                              className="text-emerald-600"
                            />
                          ) : (
                            <ToggleLeft size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(cid)}
                          disabled={actionId === cid}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          {actionId === cid ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <Trash2 size={14} />
                          )}
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingCoupon ? "Edit Coupon" : "Create Coupon"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs font-bold flex items-center">
                  <AlertCircle size={14} className="mr-2 shrink-0" />
                  {modalError}
                </div>
              )}

              {!editingCoupon && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Coupon Code
                    </label>
                    <input
                      required
                      value={form.code}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                        })
                      }
                      placeholder="e.g. SAAD5"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400 text-slate-900 uppercase tracking-widest"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Assign to Influencer
                    </label>
                    <select
                      required
                      value={form.influencer_id}
                      onChange={(e) =>
                        setForm({ ...form, influencer_id: e.target.value })
                      }
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-900"
                    >
                      <option value="">Select influencer...</option>
                      {influencers.map((inf) => (
                        <option
                          key={inf._id || inf.id}
                          value={inf._id || inf.id}
                        >
                          {inf.display_name} (@{inf.username})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Discount Percentage
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    value={form.discount_percent}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        discount_percent: parseInt(e.target.value || "5"),
                      })
                    }
                    className="w-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-900"
                  />
                  <span className="text-sm text-slate-500 font-bold">%</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Max Uses (leave empty for unlimited)
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.max_uses}
                  onChange={(e) =>
                    setForm({ ...form, max_uses: e.target.value })
                  }
                  placeholder="Unlimited"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400 text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={modalLoading}
                className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {modalLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Tag size={18} />
                )}
                <span>
                  {modalLoading
                    ? "Saving..."
                    : editingCoupon
                    ? "Save Changes"
                    : "Create Coupon"}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
