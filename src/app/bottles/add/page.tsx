"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { bottleApi } from '@/lib/api';

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function AddBottle() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSize, setNewSize] = useState(5);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => {
      const updated = { ...prev, [name]: val };
      if (name === 'name') updated.slug = slugify(value);
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
      await bottleApi.create(payload);
      setSuccess(true);
      setTimeout(() => router.push('/bottles'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create bottle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center space-x-4">
        <Link href="/bottles" className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Bottle</h1>
          <p className="text-slate-500 mt-1">Create a new bottle type.</p>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center space-x-3 border border-green-200">
          <CheckCircle2 size={20} /><span className="font-bold text-sm">Bottle created successfully!</span>
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

        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50">
          {loading ? 'Creating...' : 'Create Bottle'}
        </button>
      </form>
    </div>
  );
}
