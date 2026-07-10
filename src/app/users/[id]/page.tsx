"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  ShoppingBag,
  Gift,
  Sparkles,
  Tag,
  Banknote,
  Instagram,
  Eye,
  Calendar,
  Hash,
} from "lucide-react";
import { userApi } from "@/lib/api";
import { clsx } from "clsx";

function safeDate(v: string | undefined | null): Date {
  if (!v) return new Date();
  if (!v.endsWith("Z") && !v.includes("+")) return new Date(v + "Z");
  return new Date(v);
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  shipped: "bg-indigo-50 text-indigo-700 border-indigo-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

function OrderPerks({ order }: { order: any }) {
  const perks: { key: string; label: string; className: string; icon: React.ReactNode }[] = [];

  if (order.mystery_gift?.name) {
    perks.push({
      key: "mystery",
      label: `Mystery Gift: ${order.mystery_gift.name}`,
      className: "bg-violet-50 text-violet-800 border-violet-200",
      icon: <Sparkles size={11} />,
    });
  }
  if (order.free_decants?.length > 0) {
    const names = order.free_decants.map((fd: any) => fd.name || "Free decant").join(", ");
    perks.push({
      key: "free-decant",
      label: `Free decant${order.free_decants.length > 1 ? "s" : ""}: ${names}`,
      className: "bg-amber-50 text-amber-800 border-amber-200",
      icon: <Gift size={11} />,
    });
  }
  if (order.coupon_code) {
    perks.push({
      key: "coupon",
      label: `Coupon: ${order.coupon_code}${order.discount_amount ? ` (−₹${order.discount_amount})` : ""}`,
      className: "bg-green-50 text-green-800 border-green-200",
      icon: <Tag size={11} />,
    });
  }
  if (order.referral_code) {
    perks.push({
      key: "referral",
      label: `Referral: ${order.referral_code}`,
      className: "bg-sky-50 text-sky-800 border-sky-200",
      icon: <Hash size={11} />,
    });
  }
  if (order.payment_method === "cod") {
    perks.push({
      key: "cod",
      label: `COD${order.cod_fee ? ` (+₹${order.cod_fee} fee)` : ""}`,
      className: "bg-orange-50 text-orange-800 border-orange-200",
      icon: <Banknote size={11} />,
    });
  }
  if (order.instagram_packing_opt_in && order.instagram_username) {
    perks.push({
      key: "insta",
      label: `Packing video @${String(order.instagram_username).replace(/^@+/, "")}`,
      className: "bg-pink-50 text-pink-800 border-pink-200",
      icon: <Instagram size={11} />,
    });
  }

  if (!perks.length && !order.free_decants_dropped_reason) return null;

  return (
    <div className="space-y-2 mt-3">
      {perks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {perks.map((p) => (
            <span
              key={p.key}
              className={clsx(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                p.className,
              )}
            >
              {p.icon}
              {p.label}
            </span>
          ))}
        </div>
      )}
      {order.free_decants_dropped_reason && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          Free decant removed: {order.free_decants_dropped_reason}
        </p>
      )}
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  const [data, setData] = useState<{
    user: any;
    orders: any[];
    stats: { total_orders: number; total_spent: number; last_order_at?: string };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    userApi
      .getOrders(userId)
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load user or order history."))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Loading user…</p>
      </div>
    );
  }

  if (error || !data?.user) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="text-slate-300" size={48} />
        <p className="text-slate-500 font-medium">{error || "User not found"}</p>
        <Link href="/users" className="text-indigo-600 hover:underline text-sm font-bold">
          Back to Users
        </Link>
      </div>
    );
  }

  const { user, orders, stats } = data;
  const uid = user.id || user._id;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link
          href="/users"
          className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{user.full_name || "Unnamed User"}</h1>
          <p className="text-slate-500 mt-0.5 text-sm">Customer profile & order history</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <UserIcon size={16} className="text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Profile</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    "w-12 h-12 rounded-full flex items-center justify-center border",
                    user.is_admin
                      ? "bg-indigo-50 border-indigo-100 text-indigo-600"
                      : "bg-slate-100 border-slate-200 text-slate-400",
                  )}
                >
                  <UserIcon size={22} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{user.full_name || "Unnamed User"}</p>
                  <span
                    className={clsx(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest mt-1",
                      user.is_admin
                        ? "text-indigo-600 bg-indigo-50 border border-indigo-100"
                        : "text-slate-500 bg-slate-50 border border-slate-100",
                    )}
                  >
                    {user.is_admin && <ShieldCheck size={10} />}
                    {user.is_admin ? "Admin" : "Customer"}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail size={16} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</p>
                  <p className="text-sm text-slate-800 break-all">{user.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Hash size={16} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">User ID</p>
                  <p className="text-xs font-mono text-slate-700 break-all">{uid}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 grid grid-cols-1 gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Orders</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{stats.total_orders}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lifetime Spend</p>
              <p className="text-2xl font-black text-indigo-600 mt-1">
                ₹{Number(stats.total_spent || 0).toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Excludes cancelled orders</p>
            </div>
            {stats.last_order_at && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Last Order</p>
                <p className="text-sm font-bold text-slate-700 mt-1">
                  {safeDate(stats.last_order_at).toLocaleString("en-IN")}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Order History</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {orders.length} order{orders.length === 1 ? "" : "s"}
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="p-12 text-center">
                <ShoppingBag className="mx-auto text-slate-200 mb-3" size={40} />
                <p className="text-slate-500 font-medium">No orders yet for this user.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Guest orders placed before sign-up may appear once email matches.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const orderId = order.id || order._id;
                  const status = (order.status || "pending").toLowerCase();
                  const itemSummary = (order.items || [])
                    .slice(0, 3)
                    .map((it: any) => `${it.name}${it.size_ml ? ` ${it.size_ml}ml` : ""} ×${it.quantity}`)
                    .join(" · ");
                  const moreItems = (order.items?.length || 0) > 3 ? ` +${order.items.length - 3} more` : "";

                  return (
                    <div key={orderId} className="p-6 hover:bg-slate-50/50 transition-colors">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/orders/${orderId}`}
                              className="font-mono text-xs font-bold text-slate-900 hover:text-indigo-600"
                            >
                              {String(orderId).slice(-8).toUpperCase()}
                            </Link>
                            <span
                              className={clsx(
                                "inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                                STATUS_STYLES[status] || STATUS_STYLES.pending,
                              )}
                            >
                              {status}
                            </span>
                            {order.payment_status && (
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                {order.payment_status}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Calendar size={12} />
                              {safeDate(order.created_at).toLocaleString("en-IN")}
                            </span>
                            <span className="font-bold text-slate-900">
                              ₹{Number(order.total_amount || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                          {(itemSummary || moreItems) && (
                            <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                              {itemSummary}
                              {moreItems}
                            </p>
                          )}
                          <OrderPerks order={order} />
                        </div>
                        <Link
                          href={`/orders/${orderId}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors shrink-0"
                        >
                          <Eye size={14} />
                          View order
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
