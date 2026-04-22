"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Truck,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  XCircle,
  CreditCard,
  MapPin,
  ShoppingBag,
  Mail,
  User,
  Phone,
  Copy,
  Package,
  Gift,
  Calendar,
  Hash,
  Receipt,
  Printer,
} from 'lucide-react';
import { orderApi } from '@/lib/api';
import { clsx } from 'clsx';

function safeDate(v: string | undefined | null): Date {
  if (!v) return new Date();
  if (!v.endsWith('Z') && !v.includes('+')) return new Date(v + 'Z');
  return new Date(v);
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; bg: string; text: string; border: string; dot: string }> = {
  pending: { label: 'Pending', icon: Clock, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  processing: { label: 'Processing', icon: Package, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  shipped: { label: 'Shipped', icon: Truck, bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  delivered: { label: 'Delivered', icon: CheckCircle2, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
  cancelled: { label: 'Cancelled', icon: XCircle, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
};

const STATUS_STEPS = ['pending', 'processing', 'shipped', 'delivered'];

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState<{ itemIndex: number; itemName: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchOrder = async () => {
    try {
      const response = await orderApi.getOne(orderId);
      setOrder(response.data);
    } catch (err) {
      console.error("Error fetching order", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) fetchOrder();
  }, [orderId]);

  const handleStatusUpdate = async (status: string, updatedItems?: any[]) => {
    if (!order) return;
    setUpdating(true);
    try {
      const payload: any = { status };
      if (updatedItems) payload.items = updatedItems;
      if (!updatedItems && order.items?.length) {
        const allCancelled = order.items.every((i: any) => i.status === 'cancelled');
        if (allCancelled) {
          setUpdating(false);
          return;
        }
        if (status === 'cancelled') {
          payload.items = order.items.map((i: any) => ({ ...i, status: 'cancelled' }));
        } else {
          payload.items = order.items.map((i: any) => (
            i.status === 'cancelled' ? i : { ...i, status: 'pending' }
          ));
        }
      }

      await orderApi.updateStatus(orderId, status, updatedItems);
      setOrder({ ...order, status, items: (updatedItems || payload.items || order.items) });
    } catch (err) {
      console.error("Error updating order status", err);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleItemCancel = async (itemIndex: number) => {
    if (!order) return;
    const updatedItems = [...order.items];
    updatedItems[itemIndex] = { ...updatedItems[itemIndex], status: 'cancelled' };
    let overallStatus = order.status;
    const allCancelled = updatedItems.every(i => i.status === 'cancelled');
    if (allCancelled) overallStatus = 'cancelled';
    await handleStatusUpdate(overallStatus, updatedItems);
  };

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="text-slate-300" size={48} />
        <p className="text-slate-500 font-medium">Order not found</p>
        <Link href="/orders" className="text-indigo-600 hover:underline text-sm font-bold">Back to Orders</Link>
      </div>
    );
  }

  const status = (order.status || 'pending').toLowerCase();
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;
  const isCancelled = status === 'cancelled';
  const isDelivered = status === 'delivered';
  const allItemsCancelled = order.items?.every((i: any) => i.status === 'cancelled');
  const currentStepIndex = isCancelled ? -1 : STATUS_STEPS.indexOf(status);

  const subtotal = (order.items || []).reduce(
    (sum: number, it: any) => sum + (it.price || 0) * (it.quantity || 0),
    0
  );
  const bottleTotal = (order.items || []).reduce(
    (sum: number, it: any) => sum + (it.bottle_price || 0) * (it.quantity || 0),
    0
  );
  const discount = order.discount_amount || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.back()}
            className="mt-1 p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
            title="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Order Details</p>
              <span className={clsx(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                statusCfg.bg, statusCfg.text, statusCfg.border
              )}>
                <span className={clsx("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                {statusCfg.label}
              </span>
            </div>
            <div className="flex items-center gap-2 group/oid">
              <h1 className="text-2xl font-bold text-slate-900 font-mono">#{orderId}</h1>
              <button
                onClick={copyOrderId}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded opacity-0 group-hover/oid:opacity-100 transition-all"
                title="Copy Order ID"
              >
                {copied ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
              <Calendar size={12} />
              Placed on {safeDate(order.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-50 flex items-center gap-2 transition-all"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Status Progress Tracker */}
      {!isCancelled && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, idx) => {
              const cfg = STATUS_CONFIG[step];
              const StepIcon = cfg.icon;
              const isCurrent = idx === currentStepIndex;
              const isCompleted = idx <= currentStepIndex;
              return (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <div className={clsx(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                      isCompleted ? `${cfg.dot} text-white` : "bg-slate-100 text-slate-400",
                      isCurrent && "ring-4 ring-offset-2 ring-indigo-200"
                    )}>
                      <StepIcon size={18} />
                    </div>
                    <p className={clsx(
                      "text-[10px] font-black uppercase tracking-widest",
                      isCompleted ? "text-slate-900" : "text-slate-400"
                    )}>
                      {cfg.label}
                    </p>
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div className={clsx(
                      "h-0.5 flex-1 mx-2 transition-all -mt-6",
                      idx < currentStepIndex ? "bg-indigo-500" : "bg-slate-200"
                    )} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
            <XCircle size={20} />
          </div>
          <div>
            <p className="font-bold text-red-900">Order Cancelled</p>
            {order.cancellation_reason && (
              <p className="text-sm text-red-700 mt-0.5">{order.cancellation_reason}</p>
            )}
            {order.cancelled_at && (
              <p className="text-xs text-red-600 mt-1">On {safeDate(order.cancelled_at).toLocaleString()}</p>
            )}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Items & Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Order Items</h3>
                <span className="text-xs text-slate-400 font-medium">({order.items?.length || 0})</span>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {order.items?.map((item: any, i: number) => {
                const itemCancelled = item.status === 'cancelled';
                return (
                  <div key={i} className={clsx(
                    "p-6 flex items-start gap-4 transition-colors",
                    itemCancelled && "bg-slate-50/60"
                  )}>
                    <div className={clsx(
                      "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                      itemCancelled ? "bg-slate-100 text-slate-400" : "bg-indigo-50 text-indigo-600"
                    )}>
                      {item.gift_box_id ? <Gift size={20} /> : <Package size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className={clsx(
                            "font-bold text-sm",
                            itemCancelled ? "text-slate-400 line-through" : "text-slate-900"
                          )}>
                            {item.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500 font-medium">
                              {item.size_ml}ml
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">•</span>
                            <span className={clsx(
                              "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                              item.is_pack ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                            )}>
                              {item.is_pack ? 'Sealed Pack' : 'Decant'}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">•</span>
                            <span className="text-xs font-bold text-slate-600">Qty: {item.quantity}</span>
                          </div>
                          {item.bottle_name && (
                            <p className="text-[11px] text-indigo-600 font-semibold mt-1.5 flex items-center gap-1">
                              <span className="inline-block w-1 h-1 rounded-full bg-indigo-400" />
                              Bottle: {item.bottle_name}
                              {item.bottle_price > 0 && (
                                <span className="text-slate-400 font-medium"> (+₹{item.bottle_price})</span>
                              )}
                            </p>
                          )}
                          {item.gift_box_id && item.selected_products?.length > 0 && (
                            <div className="mt-2 pl-3 border-l-2 border-amber-200 space-y-0.5">
                              {item.selected_products.map((sp: any, j: number) => (
                                <p key={j} className="text-[11px] text-slate-500">
                                  • {sp.name} ({sp.size_ml}ml)
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0">
                          <p className={clsx(
                            "font-bold text-sm",
                            itemCancelled ? "text-slate-400 line-through" : "text-slate-900"
                          )}>
                            ₹{(item.price * item.quantity).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">₹{item.price} each</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                        <span className={clsx(
                          "inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest",
                          itemCancelled ? "text-red-600" : "text-green-700"
                        )}>
                          <span className={clsx(
                            "w-1.5 h-1.5 rounded-full",
                            itemCancelled ? "bg-red-500" : "bg-green-500"
                          )} />
                          {itemCancelled ? 'Cancelled' : 'Active'}
                        </span>
                        {!itemCancelled && !isDelivered && (
                          <button
                            onClick={() => setCancelConfirm({ itemIndex: i, itemName: item.name })}
                            disabled={updating}
                            className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 disabled:opacity-50"
                          >
                            Cancel Item
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Free Decants */}
              {order.free_decants?.length > 0 && (
                <>
                  <div className="px-6 py-3 bg-amber-50/50 border-y border-amber-100">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 flex items-center gap-1.5">
                      <Gift size={12} /> Free Decants ({order.free_decants.length})
                    </p>
                  </div>
                  {order.free_decants.map((fd: any, i: number) => (
                    <div key={`fd-${i}`} className="p-6 flex items-start gap-4 bg-amber-50/30">
                      <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                        <Gift size={20} />
                      </div>
                      <div className="flex-1 min-w-0 flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 text-sm">{fd.name}</p>
                            <span className="bg-amber-500 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider">
                              FREE
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-1">
                            {fd.size_ml}ml Decant · Complimentary
                          </p>
                        </div>
                        <p className="font-bold text-amber-600 text-sm">₹0</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Summary */}
            <div className="bg-slate-50/50 border-t border-slate-100 p-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-bold text-slate-700">₹{subtotal.toLocaleString()}</span>
              </div>
              {bottleTotal > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Bottles</span>
                  <span className="font-bold text-slate-700">Included</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    Discount {order.coupon_code && <span className="text-[10px] uppercase font-bold">({order.coupon_code})</span>}
                  </span>
                  <span className="font-bold text-green-600">-₹{discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200">
                <span className="text-sm font-black uppercase tracking-widest text-slate-500">Total</span>
                <span className="text-2xl font-black text-indigo-600">₹{order.total_amount?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          {order.payment_details && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <Receipt size={16} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Payment Details</h3>
                <span className={clsx(
                  "ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                  order.payment_status === 'paid' ? "bg-green-50 text-green-700" :
                  order.payment_status === 'refunded' ? "bg-orange-50 text-orange-700" :
                  "bg-amber-50 text-amber-700"
                )}>
                  {order.payment_status || 'pending'}
                </span>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {order.payment_details.razorpay_payment_id && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Payment ID</p>
                    <p className="text-xs font-mono font-bold text-slate-700 break-all">{order.payment_details.razorpay_payment_id}</p>
                  </div>
                )}
                {order.payment_details.razorpay_order_id && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Razorpay Order ID</p>
                    <p className="text-xs font-mono font-bold text-slate-700 break-all">{order.payment_details.razorpay_order_id}</p>
                  </div>
                )}
                {order.payment_details.paid_at && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Paid At</p>
                    <p className="text-xs font-bold text-slate-700">{safeDate(order.payment_details.paid_at).toLocaleString()}</p>
                  </div>
                )}
                {order.payment_details.source && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Source</p>
                    <p className="text-xs font-bold text-slate-700 capitalize">{order.payment_details.source}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Customer, Shipping, Actions */}
        <div className="space-y-6">
          {/* Actions Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl shadow-lg overflow-hidden text-white">
            <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
              <CreditCard size={16} />
              <h3 className="text-sm font-bold">Quick Actions</h3>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-200 block mb-2">
                  Update Status
                </label>
                <select
                  value={status}
                  onChange={(e) => handleStatusUpdate(e.target.value)}
                  disabled={updating || allItemsCancelled}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50 [&>option]:text-slate-900"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              {updating && (
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-200">
                  <Loader2 size={12} className="animate-spin" /> Updating...
                </div>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <User size={16} className="text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Customer</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                  <User size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {order.customer_name || order.shipping_address?.split(',')[0] || 'Anonymous'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                    <Hash size={10} />
                    <span className="truncate">{order.user_id || 'guest'}</span>
                  </p>
                </div>
              </div>
              {order.customer_email && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                    <Mail size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</p>
                    <a href={`mailto:${order.customer_email}`} className="text-sm text-slate-900 hover:text-indigo-600 break-all">
                      {order.customer_email}
                    </a>
                  </div>
                </div>
              )}
              {order.customer_phone && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</p>
                    <a href={`tel:${order.customer_phone}`} className="text-sm text-slate-900 hover:text-indigo-600">
                      {order.customer_phone}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <MapPin size={16} className="text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Shipping Address</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {order.shipping_address}
              </p>
            </div>
          </div>

          {/* Referral / Coupon */}
          {(order.influencer_id || order.coupon_code || order.referral_code) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Attribution</h3>
              </div>
              <div className="p-6 space-y-3">
                {order.coupon_code && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Coupon</p>
                    <span className="inline-block px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold font-mono">
                      {order.coupon_code}
                    </span>
                  </div>
                )}
                {order.referral_code && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Referral</p>
                    <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold font-mono">
                      {order.referral_code}
                    </span>
                  </div>
                )}
                {order.influencer_id && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Influencer ID</p>
                    <p className="text-xs font-mono text-slate-700 break-all">{order.influencer_id}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Item Confirmation Modal */}
      {cancelConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Cancel Item?</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Are you sure you want to cancel <span className="font-bold text-slate-700">{cancelConfirm.itemName}</span>? This will trigger a refund and cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex border-t border-slate-100">
              <button
                onClick={() => setCancelConfirm(null)}
                className="flex-1 px-4 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Keep Item
              </button>
              <button
                onClick={async () => {
                  const idx = cancelConfirm.itemIndex;
                  setCancelConfirm(null);
                  await handleItemCancel(idx);
                }}
                className="flex-1 px-4 py-3.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors border-l border-slate-100"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
