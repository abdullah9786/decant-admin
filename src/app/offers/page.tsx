"use client";

import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Trash2, Edit2, Loader2, Percent, AlertCircle,
  CheckCircle2, X,
} from 'lucide-react';
import { offerApi, productApi } from '@/lib/api';
import { clsx } from 'clsx';

const OFFER_TYPES = [
  { value: 'free_decant', label: 'Free Decant' },
];

const QUALIFYING_TYPES = [
  { value: 'decant', label: 'Decants Only' },
  { value: 'sealed', label: 'Sealed Packs Only' },
  { value: 'both', label: 'Both (Decant + Sealed)' },
];

const defaultConfig = {
  min_qualifying_ml: 10,
  free_size_ml: 2,
  max_free_per_order: null as number | null,
  qualifying_type: 'decant',
  eligible_product_ids: [] as string[],
};

const defaultDisplay = {
  title: 'Free 2ml Decant',
  subtitle: 'Pick a free 2ml decant with every 10ml+ purchase',
  banner_text: 'You have unclaimed free decants!',
};

interface OfferForm {
  name: string;
  type: string;
  is_active: boolean;
  config: typeof defaultConfig;
  display: typeof defaultDisplay;
}

const emptyForm = (): OfferForm => ({
  name: '',
  type: 'free_decant',
  is_active: true,
  config: { ...defaultConfig, eligible_product_ids: [] },
  display: { ...defaultDisplay },
});

export default function OfferManagement() {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [form, setForm] = useState<OfferForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const getId = (p: any) => p.id || p._id;

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const res = await offerApi.getAll();
      setOffers(res.data);
    } catch (err) {
      console.error('Error fetching offers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
    productApi.getAll({ include_inactive: true }).then(res => setAllProducts(res.data || [])).catch(() => {});
  }, []);

  const openAddModal = () => {
    setModalMode('add');
    setForm(emptyForm());
    setProductSearch('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (offer: any) => {
    setModalMode('edit');
    setEditingId(offer._id);
    const cfg = offer.config || {};
    const dsp = offer.display || {};
    setForm({
      name: offer.name || '',
      type: offer.type || 'free_decant',
      is_active: offer.is_active !== false,
      config: {
        min_qualifying_ml: cfg.min_qualifying_ml ?? 10,
        free_size_ml: cfg.free_size_ml ?? 2,
        max_free_per_order: cfg.max_free_per_order ?? null,
        qualifying_type: cfg.qualifying_type ?? 'decant',
        eligible_product_ids: cfg.eligible_product_ids || [],
      },
      display: {
        title: dsp.title || '',
        subtitle: dsp.subtitle || '',
        banner_text: dsp.banner_text || '',
      },
    });
    setProductSearch('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setProductSearch('');
  };

  const filteredModalProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.brand || '').toLowerCase().includes(productSearch.toLowerCase())
  );

  const toggleProduct = (pid: string) => {
    setForm(prev => {
      const ids = prev.config.eligible_product_ids;
      return {
        ...prev,
        config: {
          ...prev.config,
          eligible_product_ids: ids.includes(pid) ? ids.filter(id => id !== pid) : [...ids, pid],
        },
      };
    });
  };

  const selectAllProducts = () => {
    setForm(prev => ({
      ...prev,
      config: {
        ...prev.config,
        eligible_product_ids: filteredModalProducts.map(p => getId(p)),
      },
    }));
  };

  const removeAllProducts = () => {
    setForm(prev => ({
      ...prev,
      config: { ...prev.config, eligible_product_ids: [] },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      if (modalMode === 'add') {
        await offerApi.create(form);
      } else {
        await offerApi.update(editingId!, form);
      }
      await fetchOffers();
      closeModal();
    } catch (err: any) {
      console.error('Error saving offer:', err);
      setModalError(err.response?.data?.detail || 'Failed to save offer.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this offer?')) return;
    try {
      await offerApi.delete(id);
      await fetchOffers();
    } catch (err) {
      console.error('Error deleting offer:', err);
      alert('Failed to delete offer.');
    }
  };

  const handleToggleActive = async (offer: any) => {
    try {
      await offerApi.update(offer._id, { is_active: !offer.is_active });
      await fetchOffers();
    } catch (err) {
      console.error('Error toggling offer:', err);
    }
  };

  const filteredOffers = offers.filter(o =>
    o.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Offers</h1>
          <p className="text-slate-500 mt-1">Manage promotional offers like free decants with qualifying purchases.</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl flex items-center justify-center space-x-2 font-bold text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
        >
          <Plus size={18} />
          <span>New Offer</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search offers..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {filteredOffers.length} Offers
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-slate-500 font-medium">Fetching offers...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffers.map(offer => {
            const cfg = offer.config || {};
            const eligibleCount = (cfg.eligible_product_ids || []).length;
            return (
              <div
                key={offer._id}
                className={clsx(
                  'bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden',
                  !offer.is_active && 'opacity-60'
                )}
              >
                <div className="h-24 w-full bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                  <Percent size={36} className="text-amber-400" />
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-slate-900 text-lg truncate">{offer.name}</h3>
                        {!offer.is_active && (
                          <span className="bg-slate-100 text-slate-500 text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-tighter shrink-0">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
                        {offer.type?.replace('_', ' ')}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[10px] uppercase tracking-widest text-slate-400">
                        <span>Min {cfg.min_qualifying_ml || 10}ml</span>
                        <span>Free {cfg.free_size_ml || 2}ml</span>
                        <span>{cfg.max_free_per_order ? `Max ${cfg.max_free_per_order}/order` : 'Unlimited'}</span>
                        <span className="text-indigo-400">
                          {cfg.qualifying_type === 'sealed' ? 'Sealed only' : cfg.qualifying_type === 'both' ? 'Decant + Sealed' : 'Decant only'}
                        </span>
                      </div>
                      <p className="text-[10px] uppercase tracking-widest text-indigo-500 font-bold mt-1">
                        {eligibleCount} Eligible Products
                      </p>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                      <button
                        onClick={() => handleToggleActive(offer)}
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title={offer.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {offer.is_active ? (
                          <CheckCircle2 size={16} className="text-green-500" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                        )}
                      </button>
                      <button onClick={() => openEditModal(offer)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(offer._id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredOffers.length === 0 && (
            <div className="col-span-full py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-white rounded-full text-slate-300">
                <Percent size={40} />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-900 text-lg">No Offers Found</h3>
                <p className="text-slate-500 text-sm">Create your first promotional offer.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="h-2 bg-indigo-600 w-full" />
            <div className="p-8 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {modalMode === 'add' ? 'Create Offer' : 'Edit Offer'}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">Configure the offer rules and eligible products.</p>
                </div>
                <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {modalError && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-start space-x-3 text-sm font-medium animate-in slide-in-from-top-2">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Offer Name</label>
                  <input
                    type="text" required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Free 2ml Decant with 10ml+"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Offer Type</label>
                    <select
                      value={form.type}
                      onChange={e => setForm({ ...form, type: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    >
                      {OFFER_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</label>
                    <div className="flex h-[46px] items-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox" className="sr-only peer"
                          checked={form.is_active}
                          onChange={e => setForm({ ...form, is_active: e.target.checked })}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                        <span className="ml-3 text-xs font-bold text-slate-500">
                          {form.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {form.type === 'free_decant' && (
                  <>
                    <div className="border-t border-slate-100 pt-6 space-y-4">
                      <p className="text-slate-900 font-bold">Free Decant Configuration</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Min Qualifying (ml)</label>
                          <input
                            type="number" min={1}
                            value={form.config.min_qualifying_ml}
                            onChange={e => setForm({ ...form, config: { ...form.config, min_qualifying_ml: parseInt(e.target.value || '10') } })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Free Size (ml)</label>
                          <input
                            type="number" min={1}
                            value={form.config.free_size_ml}
                            onChange={e => setForm({ ...form, config: { ...form.config, free_size_ml: parseInt(e.target.value || '2') } })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Max Free / Order</label>
                          <input
                            type="number" min={0}
                            value={form.config.max_free_per_order ?? ''}
                            onChange={e => {
                              const v = e.target.value;
                              setForm({ ...form, config: { ...form.config, max_free_per_order: v === '' ? null : parseInt(v) } });
                            }}
                            placeholder="Unlimited"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Applies To</label>
                          <select
                            value={form.config.qualifying_type}
                            onChange={e => setForm({ ...form, config: { ...form.config, qualifying_type: e.target.value } })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          >
                            {QUALIFYING_TYPES.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-slate-100 pt-6">
                      <p className="text-slate-900 font-bold">Display Texts</p>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Title</label>
                          <input
                            type="text"
                            value={form.display.title}
                            onChange={e => setForm({ ...form, display: { ...form.display, title: e.target.value } })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Subtitle</label>
                          <input
                            type="text"
                            value={form.display.subtitle}
                            onChange={e => setForm({ ...form, display: { ...form.display, subtitle: e.target.value } })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Checkout Banner Text</label>
                          <input
                            type="text"
                            value={form.display.banner_text}
                            onChange={e => setForm({ ...form, display: { ...form.display, banner_text: e.target.value } })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-slate-100 pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-900 font-bold">Eligible Products</p>
                          <p className="text-xs text-slate-400 mt-0.5">{form.config.eligible_product_ids.length} of {allProducts.length} selected</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button type="button" onClick={selectAllProducts} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all">Select All</button>
                          <button type="button" onClick={removeAllProducts} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all">Remove All</button>
                        </div>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                          type="text"
                          value={productSearch}
                          onChange={e => setProductSearch(e.target.value)}
                          placeholder="Search products..."
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400"
                        />
                      </div>
                      <div className="max-h-56 overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-2">
                        {filteredModalProducts.length === 0 ? (
                          <p className="text-xs text-slate-400 italic text-center py-4">No products found</p>
                        ) : filteredModalProducts.map(product => {
                          const pid = getId(product);
                          const isSelected = form.config.eligible_product_ids.includes(pid);
                          return (
                            <button
                              key={pid}
                              type="button"
                              onClick={() => toggleProduct(pid)}
                              className={clsx(
                                'w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all',
                                isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50 border border-transparent'
                              )}
                            >
                              <div className={clsx(
                                'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                                isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
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
                    </div>
                  </>
                )}

                <div className="flex items-center space-x-4 pt-4">
                  <button type="button" onClick={closeModal}
                    className="flex-1 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={modalLoading}
                    className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center justify-center space-x-2">
                    {modalLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    <span>{modalMode === 'add' ? 'Create Offer' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
