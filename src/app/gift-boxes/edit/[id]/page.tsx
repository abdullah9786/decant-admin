"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, AlertTriangle, Trash2, Plus, Loader2, X } from 'lucide-react';
import { giftBoxApi } from '@/lib/api';

export default function EditGiftBox() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    images: [] as string[],
    box_type: 'fixed' as 'fixed' | 'combo',
    size_ml: 5,
    slot_count: 4,
    slot_sizes: [] as number[],
    box_price: 0,
    tier: 'standard',
    stock: 0,
    sort_order: 0,
    is_active: true,
  });
  const [newSlotSize, setNewSlotSize] = useState(5);

  useEffect(() => {
    const fetchBox = async () => {
      try {
        const res = await giftBoxApi.getOne(id);
        const box = res.data;
        setFormData({
          name: box.name || '',
          slug: box.slug || '',
          description: box.description || '',
          image_url: box.image_url || '',
          images: box.images || [],
          box_type: box.box_type || 'fixed',
          size_ml: box.size_ml || 5,
          slot_count: box.slot_count || 4,
          slot_sizes: box.slot_sizes || [],
          box_price: box.box_price || 0,
          tier: box.tier || 'standard',
          stock: box.stock || 0,
          sort_order: box.sort_order || 0,
          is_active: box.is_active !== undefined ? box.is_active : true,
        });
      } catch {
        setError('Failed to load gift box.');
      } finally {
        setLoading(false);
      }
    };
    fetchBox();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const addImage = () => setFormData(prev => ({ ...prev, images: [...prev.images, ''] }));
  const removeImage = (i: number) => setFormData(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }));
  const handleImageChange = (i: number, value: string) => {
    const imgs = [...formData.images];
    imgs[i] = value;
    setFormData(prev => ({ ...prev, images: imgs }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const isCombo = formData.box_type === 'combo';
      const payload = {
        ...formData,
        box_price: parseFloat(String(formData.box_price)),
        stock: parseInt(String(formData.stock)),
        sort_order: parseInt(String(formData.sort_order)),
        size_ml: isCombo ? 0 : parseInt(String(formData.size_ml)),
        slot_count: isCombo ? formData.slot_sizes.length : parseInt(String(formData.slot_count)),
        slot_sizes: isCombo ? formData.slot_sizes : [],
      };
      await giftBoxApi.update(id, payload);
      setSuccess(true);
      setTimeout(() => router.push('/gift-boxes'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update gift box');
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
        <Link href="/gift-boxes" className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Gift Box</h1>
          <p className="text-slate-500 mt-1">Update gift box configuration.</p>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center space-x-3 border border-green-200">
          <CheckCircle2 size={20} /><span className="font-bold text-sm">Gift box updated successfully!</span>
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
        </section>

        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="text-slate-900 font-bold">Images</div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Primary Image URL</label>
            <input name="image_url" value={formData.image_url} onChange={handleChange} placeholder="https://..." className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Additional Images</label>
              <button type="button" onClick={addImage} className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline flex items-center space-x-1"><Plus size={14} /><span>Add Image</span></button>
            </div>
            {formData.images.map((img, i) => (
              <div key={i} className="flex items-center space-x-2">
                <input value={img} onChange={(e) => handleImageChange(i, e.target.value)} placeholder="https://..." className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400" />
                <button type="button" onClick={() => removeImage(i)} className="p-2 text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="text-slate-900 font-bold">Configuration</div>

          {/* Box Type Toggle */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Box Type</label>
            <div className="flex space-x-2">
              {(['fixed', 'combo'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setFormData(prev => ({ ...prev, box_type: t }))}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border ${formData.box_type === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-300 hover:border-indigo-400'}`}>
                  {t === 'fixed' ? 'Fixed Size' : 'Combo (Mixed)'}
                </button>
              ))}
            </div>
          </div>

          {formData.box_type === 'fixed' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Size (ML)</label>
              <input type="number" name="size_ml" value={formData.size_ml} onChange={handleChange} min={1} placeholder="5" className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Slot Count</label>
              <input type="number" name="slot_count" value={formData.slot_count} onChange={handleChange} min={1} className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Box Price (₹)</label>
              <input type="number" name="box_price" value={formData.box_price} onChange={handleChange} min={0} className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tier</label>
              <select name="tier" value={formData.tier} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none">
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </div>
          </div>
          ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Box Price (₹)</label>
                <input type="number" name="box_price" value={formData.box_price} onChange={handleChange} min={0} className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tier</label>
                <select name="tier" value={formData.tier} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none">
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Slot Sizes ({formData.slot_sizes.length} slots)</label>
              <div className="flex flex-wrap gap-2">
                {formData.slot_sizes.map((sz, i) => (
                  <span key={i} className="inline-flex items-center space-x-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full border border-indigo-200">
                    <span>{sz}ml</span>
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, slot_sizes: prev.slot_sizes.filter((_, idx) => idx !== i) }))} className="text-indigo-400 hover:text-red-500 transition-colors"><X size={12} /></button>
                  </span>
                ))}
                {formData.slot_sizes.length === 0 && <span className="text-xs text-slate-400 italic">No slots added yet</span>}
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <input type="number" value={newSlotSize} onChange={(e) => setNewSlotSize(parseInt(e.target.value) || 0)} min={1} placeholder="5" className="w-24 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">ml</span>
                <button type="button" onClick={() => { if (newSlotSize > 0) setFormData(prev => ({ ...prev, slot_sizes: [...prev.slot_sizes, newSlotSize] })); }} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all">Add Slot</button>
              </div>
            </div>
          </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Stock (Units)</label>
              <input type="number" name="stock" value={formData.stock} onChange={handleChange} min={0} className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sort Order</label>
              <input type="number" name="sort_order" value={formData.sort_order} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} className="sr-only peer" />
                <div className="w-9 h-5 bg-slate-200 peer-checked:bg-indigo-600 rounded-full relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-4" />
                <span className="text-sm font-bold text-slate-700">Active</span>
              </label>
            </div>
          </div>
        </section>

        <button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
