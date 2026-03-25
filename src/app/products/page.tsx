"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  ExternalLink,
  Loader2,
  RefreshCw,
  AlertTriangle,
  GripVertical
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
      setProducts(products.filter(p => p.id !== id));
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
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Move</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Product</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Brand</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Category</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Order</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Variants</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Stock Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const totalStock = product.stock_ml || 0;
                  const isLowStock = totalStock > 0 && totalStock < 50;

                  const productId = product.id || product._id;
                  return (
                    <tr
                      key={productId}
                      draggable={searchTerm.trim().length === 0}
                      onDragStart={() => setDraggingId(productId)}
                      onDragOver={(e) => {
                        if (searchTerm.trim().length === 0) e.preventDefault();
                      }}
                      onDrop={() => handleDrop(productId)}
                      className={clsx(
                        "hover:bg-slate-50/50 transition-colors group",
                        draggingId === productId && "bg-indigo-50/60"
                      )}
                    >
                      <td className="px-4 py-4 text-slate-400">
                        <GripVertical size={16} className={clsx("cursor-grab", searchTerm.trim().length > 0 && "opacity-40 cursor-not-allowed")} />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-[10px] font-bold text-slate-400">NO IMG</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-none">{product.name}</p>
                            <p className="text-xs text-slate-400 mt-1 uppercase tracking-tighter">ID: {(productId || '').substring(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{product.brand}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold uppercase text-slate-500">
                            {product.category || 'Niche'}
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
                          {isLowStock && <span className="text-[10px] text-red-500 font-bold uppercase animate-pulse">Low Stock Detected</span>}
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
                            href={`http://localhost:3000/products/${productId}`} 
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
    </div>
  );
}
