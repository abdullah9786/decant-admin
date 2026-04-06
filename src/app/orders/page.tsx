"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Eye, 
  Truck, 
  CheckCircle2, 
  Clock, 
  MoreHorizontal,
  Loader2,
  AlertTriangle,
  RefreshCw,
  XCircle,
  X,
  CreditCard,
  MapPin,
  ShoppingBag,
  Mail,
  User,
  Phone
} from 'lucide-react';
import { orderApi } from '@/lib/api';
import { clsx } from 'clsx';

export default function OrderManagement() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All Orders');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);

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

  const handleStatusUpdate = async (id: string, status: string, updatedItems?: any[]) => {
    setUpdatingId(id);
    try {
      const payload: any = { status };
      if (updatedItems) payload.items = updatedItems;
      if (!updatedItems) {
        const target = orders.find(o => (o.id || o._id) === id);
        if (target?.items?.length) {
          const allCancelled = target.items.every((i: any) => i.status === 'cancelled');
          if (allCancelled) {
            setUpdatingId(null);
            return;
          }
          if (status === 'cancelled') {
            payload.items = target.items.map((i: any) => ({ ...i, status: 'cancelled' }));
          } else {
            payload.items = target.items.map((i: any) => (
              i.status === 'cancelled' ? i : { ...i, status: 'pending' }
            ));
          }
        }
      }
      
      await orderApi.updateStatus(id, status, updatedItems);
      const updatedOrders = orders.map(o => (o.id || o._id) === id ? { ...o, status, items: (updatedItems || payload.items || o.items) } : o);
      setOrders(updatedOrders);
      if (selectedOrder && (selectedOrder.id || selectedOrder._id) === id) {
        setSelectedOrder({ ...selectedOrder, status, items: (updatedItems || payload.items || selectedOrder.items) });
      }
    } catch (err) {
      console.error("Error updating order status", err);
      alert('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleItemCancel = async (itemIndex: number) => {
    if (!selectedOrder) return;
    
    const updatedItems = [...selectedOrder.items];
    updatedItems[itemIndex] = { ...updatedItems[itemIndex], status: 'cancelled' };
    
    let overallStatus = selectedOrder.status;
    const allCancelled = updatedItems.every(i => i.status === 'cancelled');
    if (allCancelled) overallStatus = 'cancelled';

    await handleStatusUpdate(selectedOrder.id || selectedOrder._id, overallStatus, updatedItems);
  };

  const openViewModal = async (order: any) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
    setViewLoading(true);
    try {
      const response = await orderApi.getOne(order.id || order._id);
      setSelectedOrder(response.data);
    } catch (err) {
      console.error("Error fetching order details", err);
    } finally {
      setViewLoading(false);
    }
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedOrder(null);
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
                    <td className="px-6 py-4 font-bold text-slate-900">{(orderId || '').substring(0, 12)}...</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{order.customer_name || order.shipping_address?.split(',')[0] || 'Anonymous'}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 italic max-w-[200px] truncate">
                      {order.items?.[0]?.name}
                      {order.items?.length > 1 ? ` + ${order.items.length - 1} more` : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(order.created_at).toLocaleDateString()}</td>
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
                        <button 
                          onClick={() => openViewModal(order)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
                        >
                          <Eye size={16} />
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
      </div>

      {/* View Order Modal */}
      {isViewModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={closeViewModal} />
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
            <div className="h-2 bg-indigo-600 w-full shrink-0" />
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
               <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <ShoppingBag size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Order #{(selectedOrder.id || selectedOrder._id || '').substring(0, 12)}</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Placed on {new Date(selectedOrder.created_at).toLocaleString()}</p>
                  </div>
               </div>
               <button onClick={closeViewModal} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                  <X size={20} />
               </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
               {viewLoading ? (
                  <div className="h-64 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Loading details...</p>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {/* Items & Summary */}
                    <div className="md:col-span-2 space-y-8">
                       <div>
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-6 flex items-center">
                            <ShoppingBag size={12} className="mr-2" />
                            Order Items
                          </h3>
                          <div className="border border-slate-100 rounded-xl overflow-hidden">
                             <table className="w-full text-left">
                                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                                   <tr>
                                      <th className="px-6 py-4">Product</th>
                                      <th className="px-6 py-4 text-center">Qty</th>
                                      <th className="px-6 py-4 text-center">Item Status</th>
                                      <th className="px-6 py-4 text-right">Total</th>
                                      <th className="px-6 py-4 text-right">Action</th>
                                   </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 italic">
                                   {selectedOrder.items?.map((item: any, i: number) => (
                                      <tr key={i}>
                                         <td className="px-6 py-4">
                                            <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                                            <p className="text-xs text-slate-400 font-medium">{item.size_ml}ml Decant</p>
                                         </td>
                                         <td className="px-6 py-4 text-center font-bold text-slate-600 text-sm">x{item.quantity}</td>
                                         <td className="px-6 py-4 text-center">
                                          <span className={clsx(
                                              "text-[10px] font-black uppercase tracking-widest",
                                              item.status === 'cancelled' ? "text-red-600" :
                                              (selectedOrder.status === 'delivered' ? "text-green-600" :
                                              (selectedOrder.status === 'shipped' ? "text-indigo-600" :
                                              (selectedOrder.status === 'cancelled' ? "text-red-600" : "text-amber-600")))
                                            )}>
                                              {item.status === 'cancelled' ? 'cancelled' : (selectedOrder.status || 'pending')}
                                            </span>
                                         </td>
                                         <td className="px-6 py-4 text-right font-bold text-slate-900 text-sm">₹{item.price * item.quantity}</td>
                                         <td className="px-6 py-4 text-right">
                                            <button
                                              onClick={() => handleItemCancel(i)}
                                              disabled={
                                                updatingId === (selectedOrder.id || selectedOrder._id) ||
                                                item.status === 'cancelled' ||
                                                selectedOrder.status === 'delivered'
                                              }
                                              className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 disabled:opacity-50"
                                            >
                                              Cancel Item
                                            </button>
                                         </td>
                                      </tr>
                                   ))}
                                </tbody>
                                <tfoot className="bg-slate-50/50">
                                   <tr>
                                      <td colSpan={3} className="px-6 py-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Total Amount</td>
                                      <td className="px-6 py-6 text-right font-black text-indigo-600 text-xl">₹{selectedOrder.total_amount}</td>
                                   </tr>
                                </tfoot>
                             </table>
                          </div>
                       </div>
                    </div>

                    {/* Customer & Shipping */}
                    <div className="md:col-span-1 space-y-8">
                       {/* Customer Info */}
                       <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center">
                            <User size={12} className="mr-2" />
                            Customer
                          </h3>
                          <div className="space-y-4">
                             <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 border border-slate-200">
                                   <User size={14} />
                                </div>
                                <div>
                                   <p className="text-sm font-bold text-slate-900">{selectedOrder.customer_name || selectedOrder.shipping_address?.split(',')[0] || 'Anonymous'}</p>
                                   <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Customer ID: {(selectedOrder.user_id || '').substring(0, 8)}</p>
                                </div>
                             </div>
                             {(selectedOrder.customer_email || selectedOrder.customer_email === '') && (
                               <div className="flex items-start space-x-3">
                                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 border border-slate-200">
                                     <Mail size={14} />
                                  </div>
                                  <div>
                                     <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Email</p>
                                     <p className="text-sm text-slate-900">{selectedOrder.customer_email || '—'}</p>
                                  </div>
                               </div>
                             )}
                             {(selectedOrder.customer_phone || selectedOrder.customer_phone === '') && (
                               <div className="flex items-start space-x-3">
                                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 border border-slate-200">
                                     <Phone size={14} />
                                  </div>
                                  <div>
                                     <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Phone</p>
                                     <p className="text-sm text-slate-900">{selectedOrder.customer_phone || '—'}</p>
                                  </div>
                               </div>
                             )}
                          </div>
                       </div>

                       {/* Shipping Address */}
                       <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center">
                            <MapPin size={12} className="mr-2" />
                            Shipping
                          </h3>
                          <div className="space-y-4">
                             <p className="text-sm text-slate-600 leading-relaxed italic">
                                {selectedOrder.shipping_address}
                             </p>
                          </div>
                       </div>

                       {/* Status Management */}
                       <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-6 flex items-center">
                            <CreditCard size={12} className="mr-2" />
                            Quick Actions
                          </h3>
                          <div className="space-y-4">
                             <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Update Order Status</label>
                               <select 
                                  value={selectedOrder.status?.toLowerCase()} 
                                  onChange={(e) => handleStatusUpdate(selectedOrder.id || selectedOrder._id, e.target.value)}
                                  disabled={updatingId === (selectedOrder.id || selectedOrder._id) || selectedOrder.items?.every((i: any) => i.status === 'cancelled')}
                                  className="w-full bg-white border border-indigo-200 rounded-lg px-4 py-3 text-xs font-bold text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="processing">Processing</option>
                                  <option value="shipped">Shipped</option>
                                  <option value="delivered">Delivered</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                             </div>
                             <div className="pt-2">
                                <span className={clsx(
                                  "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                  selectedOrder.status === 'delivered' ? "bg-green-100 text-green-700" : 
                                  (selectedOrder.status === 'cancelled' ? "bg-red-100 text-red-700" : "bg-indigo-100 text-indigo-700")
                                )}>
                                  {selectedOrder.status}
                                </span>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
               )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 shrink-0 flex justify-end">
               <button 
                  onClick={closeViewModal}
                  className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
               >
                  Close
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
