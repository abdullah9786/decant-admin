"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2, Loader2, RefreshCw, AlertTriangle, Gift, GripVertical } from 'lucide-react';
import { giftBoxApi } from '@/lib/api';
import { clsx } from 'clsx';

export default function GiftBoxList() {
  const [boxes, setBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const fetchBoxes = async () => {
    setLoading(true);
    try {
      const response = await giftBoxApi.getAll({ include_inactive: true });
      setBoxes(response.data);
    } catch (err) {
      console.error("Error fetching gift boxes", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBoxes(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this gift box?')) return;
    setDeletingId(id);
    try {
      await giftBoxApi.delete(id);
      setBoxes(boxes.filter(b => getId(b) !== id));
    } catch (err) {
      console.error("Error deleting gift box", err);
      alert('Failed to delete gift box');
    } finally {
      setDeletingId(null);
    }
  };

  const getId = (b: any) => b.id || b._id;

  const sortedBoxes = [...boxes].sort((a, b) => {
    const aOrder = a.sort_order ?? 0;
    const bOrder = b.sort_order ?? 0;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bCreated - aCreated;
  });

  const filtered = sortedBoxes.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDrop = async (targetId: string) => {
    if (!draggingId || draggingId === targetId || searchTerm.trim().length > 0) return;
    const current = [...sortedBoxes];
    const fromIndex = current.findIndex((b) => getId(b) === draggingId);
    const toIndex = current.findIndex((b) => getId(b) === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const prevOrderMap = new Map(current.map((b) => [getId(b), b.sort_order ?? 0]));
    const moved = current.splice(fromIndex, 1)[0];
    current.splice(toIndex, 0, moved);

    const updated = current.map((b, idx) => ({ ...b, sort_order: idx + 1 }));
    setBoxes((prev) =>
      prev.map((b) => {
        const found = updated.find((u) => getId(u) === getId(b));
        return found ? { ...b, sort_order: found.sort_order } : b;
      })
    );

    const changed = updated.filter((b) => prevOrderMap.get(getId(b)) !== b.sort_order);
    if (changed.length === 0) return;

    setSavingOrder(true);
    try {
      await Promise.all(
        changed.map((b) => giftBoxApi.update(getId(b), { sort_order: b.sort_order }))
      );
    } catch (err) {
      console.error("Error updating gift box order", err);
      alert('Failed to save order. Please try again.');
      fetchBoxes();
    } finally {
      setSavingOrder(false);
      setDraggingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gift Boxes</h1>
          <p className="text-slate-500 mt-1">Manage gift box configurations and stock.</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-2">
            Drag rows to reorder
            {searchTerm.trim().length > 0 ? ' (clear search to reorder)' : ''}
            {savingOrder ? ' • saving…' : ''}
          </p>
        </div>
        <div className="flex space-x-3">
          <button onClick={fetchBoxes} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all" title="Refresh">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <Link href="/gift-boxes/add" className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg flex items-center space-x-2 font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
            <Plus size={18} />
            <span>Add Gift Box</span>
          </Link>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400" />
        </div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{filtered.length} Results</div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
        ) : filtered.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-4">
            <AlertTriangle className="text-slate-300" size={48} />
            <p className="text-slate-500 font-medium italic">No gift boxes found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Move</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Name</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Size</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Slots</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Box Price</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Tier</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Stock</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Order</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((box) => {
                  const id = getId(box);
                  return (
                    <tr
                      key={id}
                      draggable={searchTerm.trim().length === 0}
                      onDragStart={() => setDraggingId(id)}
                      onDragOver={(e) => {
                        if (searchTerm.trim().length === 0) e.preventDefault();
                      }}
                      onDrop={() => handleDrop(id)}
                      className={clsx(
                        "hover:bg-slate-50/50 transition-colors group",
                        draggingId === id && "bg-indigo-50/60"
                      )}
                    >
                      <td className="px-4 py-4 text-slate-400">
                        <GripVertical size={16} className={clsx("cursor-grab", searchTerm.trim().length > 0 && "opacity-40 cursor-not-allowed")} />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                            {box.image_url ? <img src={box.image_url} alt="" className="w-full h-full object-cover rounded-lg" /> : <Gift size={18} className="text-indigo-400" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{box.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{box.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-600">{box.size_ml}ml</td>
                      <td className="px-6 py-4 text-sm font-bold text-indigo-600">{box.slot_count}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-600">₹{box.box_price}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", box.tier === 'premium' ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500")}>{box.tier}</span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", box.stock < 5 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600")}>{box.stock} units</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-600">
                        {box.sort_order ?? 0}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", box.is_active ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400")}>{box.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/gift-boxes/edit/${id}`} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit size={16} /></Link>
                          <button onClick={() => handleDelete(id)} disabled={deletingId === id} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50">
                            {deletingId === id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
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
    </div>
  );
}
