"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  AlertTriangle, 
  ArrowUpRight, 
  RefreshCw,
  Loader2,
  PackageCheck,
  PackageX
} from 'lucide-react';
import { productApi } from '@/lib/api';
import { clsx } from 'clsx';

export default function InventoryManagement() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await productApi.getAll({ include_inactive: true });
      setProducts(response.data);
    } catch (err) {
      console.error("Error fetching inventory", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const flattenedInventory = useMemo(() => {
    return products.map((product) => {
      const pid = product.id || product._id;
      return {
        skuId: pid,
        productId: pid,
        name: product.name,
        brand: product.brand,
        stock: product.stock_ml || 0,
        threshold: 50,
      };
    });
  }, [products]);

  const filteredInventory = flattenedInventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = useMemo(() => {
    const lowStock = flattenedInventory.filter(i => i.stock < i.threshold && i.stock > 0).length;
    const outOfStock = flattenedInventory.filter(i => i.stock === 0).length;
    return {
      total: flattenedInventory.length,
      lowStock,
      outOfStock
    };
  }, [flattenedInventory]);

  const updateStock = async (item: any, delta: number) => {
    const product = products.find(p => (p.id || p._id) === item.productId);
    if (!product) return;

    const newStock = Math.max(0, item.stock + delta);

    setUpdatingId(item.skuId);
    try {
      await productApi.update(item.productId, { ...product, stock_ml: newStock });
      setProducts(products.map(p => (p.id || p._id) === item.productId ? { ...p, stock_ml: newStock } : p));
    } catch (err) {
      console.error("Error updating stock", err);
      alert('Failed to update stock');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-slate-500 mt-1">Real-time stock levels and low-stock alerts.</p>
        </div>
        <button 
          onClick={fetchInventory}
          className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Total Products</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
            <PackageCheck size={20} className="text-indigo-600 mb-1" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Low Stock Alerts</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold text-amber-600">{stats.lowStock}</h3>
            <AlertTriangle size={20} className="text-amber-500 mb-1" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Out of Stock</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold text-red-600">{stats.outOfStock}</h3>
            <PackageX size={20} className="text-red-500 mb-1" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Stock Levels</h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by product..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-950 font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400"
            />
          </div>
        </div>

        {loading ? (
             <div className="h-64 flex items-center justify-center">
             <Loader2 className="animate-spin text-indigo-600" size={32} />
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3 text-center">In Stock (ml)</th>
                  <th className="px-6 py-3 text-center">Threshold</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Quick Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 italic">
                {filteredInventory.map((item) => (
                  <tr key={item.skuId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{item.name}</span>
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-500 uppercase tracking-widest">ML</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-bold">
                      <span className={clsx(item.stock === 0 ? "text-red-500" : (item.stock < item.threshold ? "text-amber-500" : "text-green-600"))}>
                        {item.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-400 text-sm">{item.threshold}</td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter",
                        item.stock === 0 ? "text-red-600 bg-red-50" : (item.stock < item.threshold ? "text-amber-600 bg-amber-50" : "text-green-600 bg-green-50")
                      )}>
                        {item.stock === 0 ? 'Out of Stock' : (item.stock < item.threshold ? 'Low Stock' : 'Optimized')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                            disabled={updatingId === item.skuId}
                            onClick={() => updateStock(item, -10)}
                            className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
                        >-</button>
                        <span className="w-8 text-center text-xs font-bold">
                            {updatingId === item.skuId ? '...' : item.stock}
                        </span>
                        <button 
                            disabled={updatingId === item.skuId}
                            onClick={() => updateStock(item, 10)}
                            className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
                        >+</button>
                      </div>
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
