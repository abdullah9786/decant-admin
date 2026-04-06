"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Loader2,
  RefreshCw,
  Trash2,
  AlertTriangle,
  ShoppingBag,
  User,
  Mail,
  Phone,
  Clock,
} from "lucide-react";
import { orderApi } from "@/lib/api";

interface AbandonedCheckout {
  id: string;
  razorpay_order_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  items: any[];
  total_amount: number;
  shipping_address: string | null;
  coupon_code: string | null;
  influencer_id: string | null;
  created_at: string | null;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AbandonedCheckoutsPage() {
  const [checkouts, setCheckouts] = useState<AbandonedCheckout[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCheckouts = async () => {
    setLoading(true);
    try {
      const res = await orderApi.getAbandonedCheckouts();
      setCheckouts(res.data);
    } catch (err) {
      console.error("Failed to fetch abandoned checkouts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckouts();
  }, []);

  const handleDismiss = async (id: string) => {
    setDeletingId(id);
    try {
      await orderApi.deleteAbandonedCheckout(id);
      setCheckouts((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Failed to dismiss checkout", err);
      alert("Failed to dismiss. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = checkouts.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      (c.customer_name || "").toLowerCase().includes(term) ||
      (c.customer_email || "").toLowerCase().includes(term) ||
      (c.customer_phone || "").toLowerCase().includes(term)
    );
  });

  const totalValue = filtered.reduce((sum, c) => sum + (c.total_amount || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Abandoned Checkouts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Users who initiated payment but never completed
          </p>
        </div>
        <button
          onClick={fetchCheckouts}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {filtered.length}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Abandoned Checkouts
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <ShoppingBag size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                ₹{totalValue.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Lost Revenue
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag
              size={48}
              className="mx-auto text-slate-200 mb-4"
            />
            <p className="text-slate-500 font-medium">
              No abandoned checkouts found
            </p>
            <p className="text-sm text-slate-400 mt-1">
              All customers completed their purchases!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Cart Items
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Abandoned
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Coupon
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5 text-sm font-medium text-slate-900">
                          <User size={14} className="text-slate-400" />
                          <span>{c.customer_name || "—"}</span>
                        </div>
                        {c.customer_email && (
                          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                            <Mail size={12} className="text-slate-400" />
                            <span>{c.customer_email}</span>
                          </div>
                        )}
                        {c.customer_phone && (
                          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                            <Phone size={12} className="text-slate-400" />
                            <span>{c.customer_phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-0.5 max-w-xs">
                        {(c.items || []).slice(0, 3).map((item: any, i: number) => (
                          <div
                            key={i}
                            className="text-xs text-slate-700 truncate"
                          >
                            {item.name || item.product_id}{" "}
                            <span className="text-slate-400">
                              × {item.quantity}
                              {item.size_ml ? ` (${item.size_ml}ml)` : ""}
                            </span>
                          </div>
                        ))}
                        {(c.items || []).length > 3 && (
                          <div className="text-xs text-slate-400">
                            +{c.items.length - 3} more
                          </div>
                        )}
                        {(c.items || []).length === 0 && (
                          <span className="text-xs text-slate-400">
                            No items
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-semibold text-slate-900">
                        ₹{(c.total_amount || 0).toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-1.5">
                        <Clock size={14} className="text-amber-500" />
                        <span className="text-sm text-slate-600">
                          {timeAgo(c.created_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {c.coupon_code ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-50 text-violet-700">
                          {c.coupon_code}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => handleDismiss(c.id)}
                        disabled={deletingId === c.id}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
                      >
                        {deletingId === c.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        <span>Dismiss</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
