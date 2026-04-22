"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Eye,
  Truck,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  RefreshCw,
  XCircle,
  Copy
} from 'lucide-react';
import { orderApi } from '@/lib/api';
import { clsx } from 'clsx';

function safeDate(v: string | undefined | null): Date {
  if (!v) return new Date();
  if (!v.endsWith('Z') && !v.includes('+')) return new Date(v + 'Z');
  return new Date(v);
}

export default function OrderManagement() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All Orders');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await orderApi.getAll();
      setOrders(response.data);
    } catch (err) {
      console.error("Error fetching orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusUpdate = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const target = orders.find(o => (o.id || o._id) === id);
      let updatedItems: any[] | undefined;
      if (target?.items?.length) {
        const allCancelled = target.items.every((i: any) => i.status === 'cancelled');
        if (allCancelled) {
          setUpdatingId(null);
          return;
        }
        if (status === 'cancelled') {
          updatedItems = target.items.map((i: any) => ({ ...i, status: 'cancelled' }));
        } else {
          updatedItems = target.items.map((i: any) => (
            i.status === 'cancelled' ? i : { ...i, status: 'pending' }
          ));
        }
      }

      await orderApi.updateStatus(id, status, updatedItems);
      const updatedOrders = orders.map(o => (o.id || o._id) === id ? { ...o, status, items: (updatedItems || o.items) } : o);
      setOrders(updatedOrders);
    } catch (err) {
      console.error("Error updating order status", err);
      alert('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = (o.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (o.customer_name || o.shipping_address || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'All Orders' || o.status?.toLowerCase() === activeTab.toLowerCase();
    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500 mt-1">Track and manage customer transactions.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchOrders}
            className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
            title="Refresh"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-6 border-b border-slate-200 pb-px">
        {['All Orders', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              "pb-4 text-xs font-bold uppercase tracking-widest transition-all relative",
              activeTab === tab ? "text-indigo-600 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-indigo-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Order ID, Customer..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-xs text-slate-400 font-medium">Showing {filteredOrders.length} orders</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-4">
             <AlertTriangle className="text-slate-300" size={48} />
             <p className="text-slate-500 font-medium italic">No orders found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Order ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Products</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 italic">
                {filteredOrders.map((order) => {
                  const orderId = order.id || order._id;
                  return (
                  <tr key={orderId} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 group/oid">
                        <Link
                          href={`/orders/${orderId}`}
                          className="font-mono text-xs font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                        >
                          {orderId}
                        </Link>
                        <button
                          onClick={() => { navigator.clipboard.writeText(orderId); }}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded opacity-0 group-hover/oid:opacity-100 transition-all"
                          title="Copy Order ID"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{order.customer_name || order.shipping_address?.split(',')[0] || 'Anonymous'}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 italic max-w-[200px] truncate">
                      {order.items?.[0]?.name}
                      {order.items?.length > 1 ? ` + ${order.items.length - 1} more` : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{safeDate(order.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">₹{order.total_amount}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {order.status === 'shipped' && <Truck size={14} className="text-indigo-600" />}
                        {order.status === 'delivered' && <CheckCircle2 size={14} className="text-green-600" />}
                        {order.status === 'pending' && <Clock size={14} className="text-amber-600" />}
                        {order.status === 'cancelled' && <XCircle size={14} className="text-red-500" />}
                        <select
                          value={order.status?.toLowerCase()}
                          onChange={(e) => handleStatusUpdate(orderId, e.target.value)}
                          disabled={updatingId === orderId || order.items?.every((i: any) => i.status === 'cancelled')}
                          className={clsx(
                            "text-xs font-semibold bg-transparent border-none focus:ring-0 cursor-pointer p-0",
                            order.status === 'shipped' ? "text-indigo-600" :
                            (order.status === 'delivered' ? "text-green-600" :
                            (order.status === 'cancelled' ? "text-red-600" : "text-amber-600"))
                          )}
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        {updatingId === orderId && <Loader2 size={12} className="animate-spin text-slate-400" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/orders/${orderId}`}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all inline-flex"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </Link>
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
    </div>
  );
}
