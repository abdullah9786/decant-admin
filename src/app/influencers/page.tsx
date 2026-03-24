"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  UserPlus,
  Loader2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  ShoppingBag,
  X,
  User,
  Mail,
  AlertCircle,
  Link as LinkIcon,
  Copy,
  Check,
} from "lucide-react";
import { influencerAdminApi, userApi } from "@/lib/api";
import { clsx } from "clsx";

export default function InfluencerManagement() {
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Create modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [newInfluencer, setNewInfluencer] = useState({
    user_id: "",
    username: "",
    display_name: "",
    bio: "",
    commission_rate: 0.1,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [infRes, usrRes] = await Promise.all([
        influencerAdminApi.getAll(),
        userApi.getAll(),
      ]);
      setInfluencers(infRes.data);
      setUsers(usrRes.data);
    } catch {
      console.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleActive = async (profileId: string) => {
    setActionId(profileId);
    try {
      const res = await influencerAdminApi.toggleActive(profileId);
      setInfluencers((prev) =>
        prev.map((inf) =>
          (inf._id || inf.id) === profileId ? { ...inf, ...res.data } : inf
        )
      );
    } catch {
      alert("Failed to toggle status.");
    } finally {
      setActionId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await influencerAdminApi.create(newInfluencer);
      setInfluencers([{ ...res.data, earnings: { total_earnings: 0, pending_earnings: 0, approved_earnings: 0, paid_earnings: 0, total_orders: 0 } }, ...influencers]);
      setIsModalOpen(false);
      setNewInfluencer({ user_id: "", username: "", display_name: "", bio: "", commission_rate: 0.1 });
    } catch (err: any) {
      setModalError(err.response?.data?.detail || "Failed to create influencer.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleCopy = (username: string) => {
    navigator.clipboard.writeText(`https://decume.in/${username}`);
    setCopied(username);
    setTimeout(() => setCopied(null), 2000);
  };

  const nonInfluencerUsers = users.filter(
    (u) =>
      !u.is_influencer &&
      !influencers.some((inf) => inf.user_id === (u._id || u.id))
  );

  const filteredInfluencers = useMemo(() => {
    return influencers.filter(
      (inf) =>
        inf.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inf.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [influencers, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Influencers</h1>
          <p className="text-slate-500 mt-1">
            Manage creator profiles, storefronts, and commissions.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg flex items-center space-x-2 font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          <UserPlus size={18} />
          <span>Add Influencer</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-96">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or username..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Total: {filteredInfluencers.length} Influencers
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-slate-500 font-medium">Loading influencers...</p>
        </div>
      ) : filteredInfluencers.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4 text-center">
          <Sparkles className="text-slate-200" size={64} />
          <p className="text-slate-500 font-medium italic">
            No influencers found.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Creator
                </th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Username
                </th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Rate
                </th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Total Earned
                </th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Orders
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
              {filteredInfluencers.map((inf) => {
                const pid = inf._id || inf.id;
                const earnings = inf.earnings || {};
                return (
                  <tr
                    key={pid}
                    className="border-b border-slate-50 hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">
                        {inf.display_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-indigo-600 font-medium">
                          @{inf.username}
                        </span>
                        <button
                          onClick={() => handleCopy(inf.username)}
                          className="p-1 text-slate-300 hover:text-indigo-600 transition-colors"
                          title="Copy storefront URL"
                        >
                          {copied === inf.username ? (
                            <Check size={12} />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {((inf.commission_rate || 0.1) * 100).toFixed(0)}%
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <div className="flex items-center space-x-1">
                        <DollarSign size={14} className="text-emerald-500" />
                        <span>
                          ₹{(earnings.total_earnings || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1 text-slate-600">
                        <ShoppingBag size={14} className="text-slate-400" />
                        <span>{earnings.total_orders || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={clsx(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                          inf.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-red-50 text-red-600 border-red-200"
                        )}
                      >
                        {inf.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(pid)}
                        disabled={actionId === pid}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                        title={inf.is_active ? "Deactivate" : "Activate"}
                      >
                        {actionId === pid ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : inf.is_active ? (
                          <ToggleRight
                            size={20}
                            className="text-emerald-600"
                          />
                        ) : (
                          <ToggleLeft size={20} />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Create Influencer Profile
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs font-bold flex items-center">
                  <AlertCircle size={14} className="mr-2 shrink-0" />
                  {modalError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Select User
                </label>
                <select
                  required
                  value={newInfluencer.user_id}
                  onChange={(e) =>
                    setNewInfluencer({ ...newInfluencer, user_id: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-900"
                >
                  <option value="">Choose a user...</option>
                  {nonInfluencerUsers.map((u) => (
                    <option key={u._id || u.id} value={u._id || u.id}>
                      {u.full_name || u.email} — {u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Username (URL slug)
                </label>
                <div className="relative">
                  <LinkIcon
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    required
                    value={newInfluencer.username}
                    onChange={(e) =>
                      setNewInfluencer({
                        ...newInfluencer,
                        username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""),
                      })
                    }
                    placeholder="e.g. saad"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400 text-slate-900"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Storefront URL: decume.in/{newInfluencer.username || "..."}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Display Name
                </label>
                <input
                  required
                  value={newInfluencer.display_name}
                  onChange={(e) =>
                    setNewInfluencer({ ...newInfluencer, display_name: e.target.value })
                  }
                  placeholder="Public display name"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400 text-slate-900"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Commission Rate
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    value={Math.round(newInfluencer.commission_rate * 100)}
                    onChange={(e) =>
                      setNewInfluencer({
                        ...newInfluencer,
                        commission_rate: parseInt(e.target.value || "10") / 100,
                      })
                    }
                    className="w-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-900"
                  />
                  <span className="text-sm text-slate-500 font-bold">%</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={modalLoading}
                className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {modalLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Sparkles size={18} />
                )}
                <span>
                  {modalLoading ? "Creating..." : "Create Influencer"}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
