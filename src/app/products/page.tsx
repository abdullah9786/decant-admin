"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  Loader2,
  RefreshCw,
  AlertTriangle,
  GripVertical,
  CheckCircle2,
  XCircle,
  Star,
  Sparkles,
  X,
} from 'lucide-react';
import { productApi } from '@/lib/api';
import { clsx } from 'clsx';

export default function ProductList() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<{
    action: string;
    title: string;
    message: string;
    confirmLabel: string;
    destructive?: boolean;
    run: () => Promise<void>;
  } | null>(null);
  const [bulkResult, setBulkResult] = useState<{ ok: number; fail: number; action: string } | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await productApi.getAll({ include_inactive: true });
      setProducts(response.data);
    } catch (err) {
      console.error("Error fetching products", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    setDeletingId(id);
    try {
      await productApi.delete(id);
      setProducts(products.filter(p => p.id !== id && p._id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error("Error deleting product", err);
      alert('Failed to delete product');
    } finally {
      setDeletingId(null);
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    const aOrder = a.sort_order ?? 0;
    const bOrder = b.sort_order ?? 0;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bCreated - aCreated;
  });

  const filteredProducts = sortedProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getId = (product: any) => product.id || product._id;

  const filteredIds = useMemo(() => filteredProducts.map(getId), [filteredProducts]);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.has(id));
  const someFilteredSelected = filteredIds.some(id => selectedIds.has(id));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredIds.forEach(id => next.delete(id));
      } else {
        filteredIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleDrop = async (targetId: string) => {
    if (!draggingId || draggingId === targetId || searchTerm.trim().length > 0) return;
    const current = [...sortedProducts];
    const fromIndex = current.findIndex((p) => getId(p) === draggingId);
    const toIndex = current.findIndex((p) => getId(p) === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const prevOrderMap = new Map(current.map((p) => [getId(p), p.sort_order ?? 0]));
    const moved = current.splice(fromIndex, 1)[0];
    current.splice(toIndex, 0, moved);

    const updated = current.map((p, idx) => ({ ...p, sort_order: idx + 1 }));
    setProducts((prev) =>
      prev.map((p) => {
        const found = updated.find((u) => getId(u) === getId(p));
        return found ? { ...p, sort_order: found.sort_order } : p;
      })
    );

    const changed = updated.filter((p) => prevOrderMap.get(getId(p)) !== p.sort_order);
    if (changed.length === 0) return;

    setSavingOrder(true);
    try {
      await Promise.all(
        changed.map((p) => productApi.update(getId(p), { sort_order: p.sort_order }))
      );
    } catch (err) {
      console.error("Error updating product order", err);
      alert('Failed to save order. Please try again.');
      fetchProducts();
    } finally {
      setSavingOrder(false);
      setDraggingId(null);
    }
  };

  const runBulkUpdate = async (
    actionKey: string,
    payload: Record<string, any>,
    optimisticPatch?: Record<string, any>,
  ) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkLoading(actionKey);

    if (optimisticPatch) {
      setProducts(prev => prev.map(p => (selectedIds.has(getId(p)) ? { ...p, ...optimisticPatch } : p)));
    }

    const results = await Promise.allSettled(ids.map(id => productApi.update(id, payload)));
    const ok = results.filter(r => r.status === 'fulfilled').length;
    const fail = results.length - ok;

    if (fail > 0) await fetchProducts();
    setBulkResult({ ok, fail, action: actionKey });
    setBulkLoading(null);
    setTimeout(() => setBulkResult(null), 3500);
  };

  const runBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkLoading('delete');
    const results = await Promise.allSettled(ids.map(id => productApi.delete(id)));
    const ok = results.filter(r => r.status === 'fulfilled').length;
    const fail = results.length - ok;
    setProducts(prev => prev.filter(p => {
      const id = getId(p);
      const idx = ids.indexOf(id);
      if (idx === -1) return true;
      return results[idx].status === 'rejected';
    }));
    setSelectedIds(new Set());
    setBulkResult({ ok, fail, action: 'delete' });
    setBulkLoading(null);
    setTimeout(() => setBulkResult(null), 3500);
  };

  const selectionCount = selectedIds.size;
  const noun = `${selectionCount} product${selectionCount > 1 ? 's' : ''}`;

  const confirmBulkUpdate = (
    action: string,
    title: string,
    message: string,
    payload: Record<string, any>,
    optimisticPatch?: Record<string, any>,
    destructive = false,
  ) => {
    setBulkConfirm({
      action,
      title,
      message,
      confirmLabel: title,
      destructive,
      run: () => runBulkUpdate(action, payload, optimisticPatch),
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-500 mt-1">Manage your perfume catalog and decant variants.</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-2">
            Drag rows to reorder
            {searchTerm.trim().length > 0 ? ' (clear search to reorder)' : ''}
            {savingOrder ? ' • saving…' : ''}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchProducts}
            className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
            title="Refresh"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <Link
            href="/products/add"
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg flex items-center space-x-2 font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <Plus size={18} />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, brand..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center space-x-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
          {filteredProducts.length} Results
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectionCount > 0 && (
        <div className="sticky top-0 z-20 bg-indigo-600 text-white rounded-xl shadow-xl shadow-indigo-200 px-4 py-3 flex flex-wrap items-center gap-2 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3 mr-2">
            <span className="bg-white text-indigo-700 text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
              {selectionCount} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-xs font-bold uppercase tracking-widest text-indigo-100 hover:text-white inline-flex items-center gap-1"
              title="Clear selection"
            >
              <X size={12} /> Clear
            </button>
          </div>

          <div className="h-6 w-px bg-indigo-400/50 mx-1" />

          <BulkButton
            icon={<CheckCircle2 size={14} />}
            label="Activate"
            loading={bulkLoading === 'activate'}
            disabled={!!bulkLoading}
            onClick={() => confirmBulkUpdate(
              'activate',
              'Activate',
              `Activate ${noun}? They will become visible to customers.`,
              { is_active: true },
              { is_active: true },
            )}
          />
          <BulkButton
            icon={<XCircle size={14} />}
            label="Deactivate"
            loading={bulkLoading === 'deactivate'}
            disabled={!!bulkLoading}
            onClick={() => confirmBulkUpdate(
              'deactivate',
              'Deactivate',
              `Deactivate ${noun}? They will be hidden from customers.`,
              { is_active: false },
              { is_active: false },
            )}
          />

          <div className="h-6 w-px bg-indigo-400/50 mx-1" />

          <BulkButton
            icon={<Star size={14} />}
            label="Feature"
            loading={bulkLoading === 'feature'}
            disabled={!!bulkLoading}
            onClick={() => confirmBulkUpdate(
              'feature',
              'Mark as Featured',
              `Mark ${noun} as featured?`,
              { is_featured: true },
              { is_featured: true },
            )}
          />
          <BulkButton
            icon={<Star size={14} />}
            label="Unfeature"
            loading={bulkLoading === 'unfeature'}
            disabled={!!bulkLoading}
            onClick={() => confirmBulkUpdate(
              'unfeature',
              'Remove Featured',
              `Remove featured status from ${noun}?`,
              { is_featured: false },
              { is_featured: false },
            )}
          />

          <div className="h-6 w-px bg-indigo-400/50 mx-1" />

          <BulkButton
            icon={<Sparkles size={14} />}
            label="Mark New"
            loading={bulkLoading === 'mark-new'}
            disabled={!!bulkLoading}
            onClick={() => confirmBulkUpdate(
              'mark-new',
              'Mark as New Arrival',
              `Mark ${noun} as new arrivals?`,
              { is_new_arrival: true },
              { is_new_arrival: true },
            )}
          />
          <BulkButton
            icon={<Sparkles size={14} />}
            label="Unmark New"
            loading={bulkLoading === 'unmark-new'}
            disabled={!!bulkLoading}
            onClick={() => confirmBulkUpdate(
              'unmark-new',
              'Remove New Arrival',
              `Remove new arrival status from ${noun}?`,
              { is_new_arrival: false },
              { is_new_arrival: false },
            )}
          />

          <div className="ml-auto" />

          <BulkButton
            icon={<Trash2 size={14} />}
            label="Delete"
            loading={bulkLoading === 'delete'}
            disabled={!!bulkLoading}
            destructive
            onClick={() => setBulkConfirm({
              action: 'delete',
              title: 'Delete',
              message: `Permanently delete ${noun}? This cannot be undone.`,
              confirmLabel: 'Delete',
              destructive: true,
              run: runBulkDelete,
            })}
          />
        </div>
      )}

      {/* Result toast */}
      {bulkResult && (
        <div className={clsx(
          "fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-bold animate-in fade-in slide-in-from-bottom-2",
          bulkResult.fail === 0 ? "bg-green-600 text-white" : "bg-amber-600 text-white"
        )}>
          {bulkResult.fail === 0 ? (
            <span>{bulkResult.ok} product{bulkResult.ok > 1 ? 's' : ''} updated successfully</span>
          ) : (
            <span>{bulkResult.ok} succeeded · {bulkResult.fail} failed</span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-4">
            <AlertTriangle className="text-slate-300" size={48} />
            <p className="text-slate-500 font-medium italic">No products found matching your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      ref={el => {
                        if (el) el.indeterminate = !allFilteredSelected && someFilteredSelected;
                      }}
                      onChange={toggleSelectAllFiltered}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30 cursor-pointer"
                      title={allFilteredSelected ? 'Deselect all' : 'Select all'}
                    />
                  </th>
                  <th className="px-2 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 w-8">Move</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Product</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Brand</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Family</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Order</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Variants</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Stock</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const totalStock = product.stock_ml || 0;
                  const isLowStock = totalStock > 0 && totalStock < 50;
                  const productId = getId(product);
                  const isSelected = selectedIds.has(productId);
                  const dragEnabled = searchTerm.trim().length === 0 && !isSelected && selectionCount === 0;

                  return (
                    <tr
                      key={productId}
                      draggable={dragEnabled}
                      onDragStart={() => dragEnabled && setDraggingId(productId)}
                      onDragOver={(e) => {
                        if (dragEnabled) e.preventDefault();
                      }}
                      onDrop={() => handleDrop(productId)}
                      className={clsx(
                        "transition-colors group",
                        isSelected ? "bg-indigo-50/60 hover:bg-indigo-50" : "hover:bg-slate-50/50",
                        draggingId === productId && "ring-1 ring-indigo-300"
                      )}
                    >
                      <td className="px-4 py-4 w-10" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(productId)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30 cursor-pointer"
                        />
                      </td>
                      <td className="px-2 py-4 text-slate-400 w-8">
                        <GripVertical size={16} className={clsx(
                          "cursor-grab",
                          !dragEnabled && "opacity-30 cursor-not-allowed"
                        )} />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400">NO IMG</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-slate-900 leading-none">{product.name}</p>
                              {product.is_active === false && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[9px] font-bold uppercase tracking-wider">
                                  <XCircle size={10} /> Inactive
                                </span>
                              )}
                              {product.is_featured && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-bold uppercase tracking-wider">
                                  <Star size={10} /> Featured
                                </span>
                              )}
                              {product.is_new_arrival && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold uppercase tracking-wider">
                                  <Sparkles size={10} /> New
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1 uppercase tracking-tighter">
                              ID: {(productId || '').substring(0, 8)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{product.brand}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold uppercase text-slate-500">
                          {product.fragrance_family || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-bold">
                        {product.sort_order ?? 0}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-indigo-600">
                        {product.variants?.length || 0} Sizes
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-col space-y-1">
                          <span className={clsx(
                            "w-fit px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            isLowStock ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                          )}>
                            {totalStock} ml
                          </span>
                          {isLowStock && <span className="text-[10px] text-red-500 font-bold uppercase animate-pulse">Low Stock</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/products/edit/${productId}`} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                            <Edit size={16} />
                          </Link>
                          <button
                            onClick={() => handleDelete(productId)}
                            disabled={deletingId === productId}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                          >
                            {deletingId === productId ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </button>
                          <a
                            href={`http://localhost:3000/products/${product.slug || productId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            <ExternalLink size={16} />
                          </a>
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

      {/* Bulk confirm modal */}
      {bulkConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className={clsx(
                "w-12 h-12 rounded-full flex items-center justify-center mx-auto",
                bulkConfirm.destructive ? "bg-red-100" : "bg-indigo-100"
              )}>
                <AlertTriangle size={24} className={bulkConfirm.destructive ? "text-red-600" : "text-indigo-600"} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{bulkConfirm.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{bulkConfirm.message}</p>
              </div>
            </div>
            <div className="flex border-t border-slate-100">
              <button
                onClick={() => setBulkConfirm(null)}
                disabled={!!bulkLoading}
                className="flex-1 px-4 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const cfg = bulkConfirm;
                  setBulkConfirm(null);
                  await cfg.run();
                }}
                disabled={!!bulkLoading}
                className={clsx(
                  "flex-1 px-4 py-3.5 text-sm font-bold transition-colors border-l border-slate-100 disabled:opacity-50",
                  bulkConfirm.destructive
                    ? "text-red-600 hover:bg-red-50"
                    : "text-indigo-600 hover:bg-indigo-50"
                )}
              >
                {bulkConfirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BulkButton({
  icon,
  label,
  onClick,
  loading,
  disabled,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed",
        destructive
          ? "bg-red-500 text-white hover:bg-red-600"
          : "bg-white/15 text-white hover:bg-white/25"
      )}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      <span>{label}</span>
    </button>
  );
}
