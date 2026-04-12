"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, AlertTriangle, Loader2, X, Search } from 'lucide-react';
import { bottleApi, productApi } from '@/lib/api';
import { clsx } from 'clsx';

export default function EditBottle() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSize, setNewSize] = useState(5);

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [initialProductIds, setInitialProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    compatible_sizes: [] as number[],
    size_prices: {} as Record<string, number>,
    is_default: false,
    is_active: true,
    sort_order: 0,
  });

  const getId = (p: any) => p.id || p._id;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bottleRes, productsRes] = await Promise.all([
          bottleApi.getOne(id),
          productApi.getAll({ include_inactive: true }),
        ]);
        const b = bottleRes.data;
        setFormData({
          name: b.name || '',
          slug: b.slug || '',
          description: b.description || '',
          image_url: b.image_url || '',
          compatible_sizes: b.compatible_sizes || [],
          size_prices: b.size_prices || {},
          is_default: !!b.is_default,
          is_active: b.is_active !== undefined ? b.is_active : true,
          sort_order: b.sort_order || 0,
        });

        const products = productsRes.data;
        setAllProducts(products);

        const mapped = products
          .filter((p: any) => (p.bottle_ids || []).includes(id))
          .map((p: any) => getId(p));
        setSelectedProductIds(mapped);
        setInitialProductIds(mapped);
      } catch {
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const filteredProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.brand || '').toLowerCase().includes(productSearch.toLowerCase())
  );

  const toggleProduct = (pid: string) => {
    setSelectedProductIds(prev =>
      prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid]
    );
  };

  const selectAll = () => {
    setSelectedProductIds(filteredProducts.map(p => getId(p)));
  };

  const removeAll = () => {
    setSelectedProductIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const cleanedPrices: Record<string, number> = {};
      for (const sz of formData.compatible_sizes) {
        cleanedPrices[String(sz)] = parseFloat(String(formData.size_prices[String(sz)] ?? 0));
      }
      const payload = {
        ...formData,
        size_prices: cleanedPrices,
        sort_order: parseInt(String(formData.sort_order)),
      };
      await bottleApi.update(id, payload);

      const added = selectedProductIds.filter(pid => !initialProductIds.includes(pid));
      const removed = initialProductIds.filter(pid => !selectedProductIds.includes(pid));

      const updates: Promise<any>[] = [];

      for (const pid of added) {
        const product = allProducts.find(p => getId(p) === pid);
        const existing: string[] = product?.bottle_ids || [];
        if (!existing.includes(id)) {
          updates.push(productApi.update(pid, { bottle_ids: [...existing, id] }));
        }
      }

      for (const pid of removed) {
        const product = allProducts.find(p => getId(p) === pid);
        const existing: string[] = product?.bottle_ids || [];
        updates.push(productApi.update(pid, { bottle_ids: existing.filter(bid => bid !== id) }));
      }

      if (updates.length > 0) await Promise.all(updates);

      setSuccess(true);
      setTimeout(() => router.push('/bottles'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update bottle');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center space-x-4">
        <Link href="/bottles" className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Bottle</h1>
          <p className="text-slate-500 mt-1">Update bottle configuration.</p>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center space-x-3 border border-green-200">
          <CheckCircle2 size={20} /><span className="font-bold text-sm">Bottle updated successfully!</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center space-x-3 border border-red-200">
          <AlertTriangle size={20} /><span className="font-bold text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="text-slate-900 font-bold">Basic Info</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Name</label>
              <input name="name" value={formData.name} onChange={handleChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Slug</label>
              <input name="slug" value={formData.slug} onChange={handleChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Image URL</label>
            <input name="image_url" value={formData.image_url} onChange={handleChange} placeholder="https://..." className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400" />
          </div>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="text-slate-900 font-bold">Configuration</div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Compatible Sizes ({formData.compatible_sizes.length})</label>
            <div className="flex flex-wrap gap-2">
              {formData.compatible_sizes.map((sz, i) => (
                <span key={i} className="inline-flex items-center space-x-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full border border-indigo-200">
                  <span>{sz}ml</span>
                  <button type="button" onClick={() => setFormData(prev => {
                    const sizes = prev.compatible_sizes.filter((_, idx) => idx !== i);
                    const prices = { ...prev.size_prices };
                    delete prices[String(sz)];
                    return { ...prev, compatible_sizes: sizes, size_prices: prices };
                  })} className="text-indigo-400 hover:text-red-500 transition-colors"><X size={12} /></button>
                </span>
              ))}
              {formData.compatible_sizes.length === 0 && <span className="text-xs text-slate-400 italic">No sizes added yet</span>}
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <input type="number" value={newSize} onChange={(e) => setNewSize(parseInt(e.target.value) || 0)} min={1} className="w-24 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">ml</span>
              <button type="button" onClick={() => {
                if (newSize > 0 && !formData.compatible_sizes.includes(newSize))
                  setFormData(prev => ({
                    ...prev,
                    compatible_sizes: [...prev.compatible_sizes, newSize].sort((a, b) => a - b),
                    size_prices: { ...prev.size_prices, [String(newSize)]: prev.size_prices[String(newSize)] ?? 0 },
                  }));
              }} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all">Add Size</button>
            </div>
          </div>

          {formData.compatible_sizes.length > 0 && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Additional Price per Size (₹)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {formData.compatible_sizes.map((sz) => (
                <div key={sz} className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <span className="text-xs font-bold text-indigo-600 w-12">{sz}ml</span>
                  <input
                    type="number"
                    value={formData.size_prices[String(sz)] ?? 0}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      size_prices: { ...prev.size_prices, [String(sz)]: parseFloat(e.target.value) || 0 },
                    }))}
                    min={0}
                    className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                  <span className="text-[10px] text-slate-400">₹</span>
                </div>
              ))}
            </div>
          </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sort Order</label>
              <input type="number" name="sort_order" value={formData.sort_order} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" />
            </div>
            <div className="flex items-end pb-1 space-x-6">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" name="is_default" checked={formData.is_default} onChange={handleChange} className="sr-only peer" />
                <div className="w-9 h-5 bg-slate-200 peer-checked:bg-amber-500 rounded-full relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-4" />
                <span className="text-sm font-bold text-slate-700">Default</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} className="sr-only peer" />
                <div className="w-9 h-5 bg-slate-200 peer-checked:bg-indigo-600 rounded-full relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-4" />
                <span className="text-sm font-bold text-slate-700">Active</span>
              </label>
            </div>
          </div>
        </section>

        {/* Map to Products */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-900 font-bold">Map to Products</div>
              <p className="text-xs text-slate-400 mt-0.5">{selectedProductIds.length} of {allProducts.length} selected</p>
            </div>
            <div className="flex items-center space-x-2">
              <button type="button" onClick={selectAll} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all">Select All</button>
              <button type="button" onClick={removeAll} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all">Remove All</button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-2">
            {filteredProducts.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">No products found</p>
            ) : filteredProducts.map(product => {
              const pid = getId(product);
              const isSelected = selectedProductIds.includes(pid);
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => toggleProduct(pid)}
                  className={clsx(
                    "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all",
                    isSelected ? "bg-indigo-50 border border-indigo-200" : "hover:bg-slate-50 border border-transparent"
                  )}
                >
                  <div className={clsx(
                    "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all",
                    isSelected ? "bg-indigo-600 border-indigo-600" : "border-slate-300"
                  )}>
                    {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <div className="w-8 h-8 rounded bg-slate-100 overflow-hidden flex-shrink-0">
                    {product.image_url ? <img src={product.image_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[8px] text-slate-400 flex items-center justify-center h-full">IMG</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{product.name}</p>
                    <p className="text-[10px] text-slate-400">{product.brand}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
