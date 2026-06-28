"use client";

import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Trash2, Edit2, Loader2, Percent, AlertCircle,
  CheckCircle2, X, Calendar, Clock, Gift, ArrowUp, ArrowDown,
} from 'lucide-react';
import { offerApi, productApi } from '@/lib/api';
import { clsx } from 'clsx';

// Mongo via Motor returns naive datetimes (no tz suffix). When that bare
// string reaches `new Date(...)` the browser treats it as *local* time,
// which clobbers IST-saved offers by their UTC offset on the next read.
// Force-stamping a `Z` on any ISO string that has no offset keeps the
// round-trip lossless: backend always stores in UTC, frontend always
// displays in the admin's local zone (IST in our case).
function normalizeIso(iso: string): string {
  // Already has an explicit offset or Z — trust it.
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso)) return iso;
  return `${iso}Z`;
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(normalizeIso(iso));
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function plusHoursIso(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

interface OfferState {
  label: string;
  cls: string;
}

function getOfferState(o: any): OfferState {
  if (!o.is_active) return { label: 'Inactive', cls: 'bg-slate-100 text-slate-500 border border-slate-200' };
  const now = Date.now();
  const start = o.starts_at ? new Date(normalizeIso(o.starts_at)).getTime() : null;
  const end = o.ends_at ? new Date(normalizeIso(o.ends_at)).getTime() : null;
  if (start && start > now) return { label: 'Scheduled', cls: 'bg-blue-50 text-blue-700 border border-blue-200' };
  if (end && end <= now) return { label: 'Expired', cls: 'bg-red-50 text-red-700 border border-red-200' };
  if (!end) return { label: 'Live · No end date', cls: 'bg-amber-50 text-amber-700 border border-amber-200' };
  return { label: 'Live', cls: 'bg-green-50 text-green-700 border border-green-200' };
}

const OFFER_TYPES = [
  { value: 'free_decant', label: 'Free Decant' },
  { value: 'daily_deal', label: 'Daily Deal' },
  { value: 'mystery_gift', label: 'Mystery Gift' },
];

// Curated icon set the storefront ladder knows how to render. Stored as a
// plain string key on each tier so the value stays JSON-friendly.
const MYSTERY_TIER_ICONS = ['gift', 'sparkles', 'crown', 'gem', 'star', 'award', 'trophy'];

interface MysteryTier {
  id: string;
  name: string;
  min_subtotal: number;
  accent_color: string;
  icon: string;
  tagline: string;
}

const newTierId = () =>
  `t_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const makeTier = (overrides: Partial<MysteryTier> = {}): MysteryTier => ({
  id: newTierId(),
  name: '',
  min_subtotal: 2000,
  accent_color: '#7c3aed',
  icon: 'gift',
  tagline: '',
  ...overrides,
});

const QUALIFYING_TYPES = [
  { value: 'decant', label: 'Decants Only' },
  { value: 'sealed', label: 'Sealed Packs Only' },
  { value: 'both', label: 'Both (Decant + Sealed)' },
];

const APPLY_TO_TYPES = [
  { value: 'all', label: 'All Variants' },
  { value: 'decant', label: 'Decants Only' },
  { value: 'pack', label: 'Sealed Pack Only' },
];

// `config` carries the union of all offer-type-specific fields. A given form
// only mutates the slice it cares about; the other fields ride along untouched
// until the offer is saved.
const defaultConfig = {
  // free_decant
  min_qualifying_ml: 10,
  free_size_ml: 2,
  max_free_per_order: null as number | null,
  qualifying_type: 'decant',
  eligible_product_ids: [] as string[],
  // daily_deal
  product_ids: [] as string[],
  discount_percent: 50,
  apply_to: 'all',
  // mystery_gift
  tiers: [] as MysteryTier[],
};

const defaultDisplay = {
  // free_decant
  title: 'Free 2ml Decant',
  subtitle: 'Pick a free 2ml decant with every 10ml+ purchase',
  banner_text: 'You have unclaimed free decants!',
  // daily_deal (Decume Daily marketing surfaces)
  headline: 'Decume Daily',
  subheadline: '',
  marquee_text: '',
  cta_label: 'Shop Today\'s Deal',
  cta_href: '/deals/today',
  accent_color: '#dc2626',
  hero_image: '',
  // mystery_gift
  title_gift: 'Unlock a Mystery Gift',
  locked_prompt: 'Spend {remaining} more to unlock {next}',
  box_color: '#7c3aed',
};

interface OfferForm {
  name: string;
  type: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  config: typeof defaultConfig;
  display: typeof defaultDisplay;
}

const emptyForm = (): OfferForm => ({
  name: '',
  type: 'free_decant',
  is_active: true,
  starts_at: null,
  ends_at: null,
  config: { ...defaultConfig, eligible_product_ids: [], product_ids: [] },
  display: { ...defaultDisplay },
});

// Whether the picker on the modal should target `product_ids` (daily_deal) or
// `eligible_product_ids` (free_decant). Centralised so the toggle/select-all
// helpers stay type-agnostic.
function productIdsField(type: string): 'product_ids' | 'eligible_product_ids' {
  return type === 'daily_deal' ? 'product_ids' : 'eligible_product_ids';
}

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
      starts_at: offer.starts_at || null,
      ends_at: offer.ends_at || null,
      config: {
        // free_decant slice
        min_qualifying_ml: cfg.min_qualifying_ml ?? 10,
        free_size_ml: cfg.free_size_ml ?? 2,
        max_free_per_order: cfg.max_free_per_order ?? null,
        qualifying_type: cfg.qualifying_type ?? 'decant',
        eligible_product_ids: cfg.eligible_product_ids || [],
        // daily_deal slice
        product_ids: cfg.product_ids || [],
        discount_percent: cfg.discount_percent ?? 50,
        apply_to: cfg.apply_to ?? 'all',
        // mystery_gift slice
        tiers: Array.isArray(cfg.tiers)
          ? cfg.tiers.map((t: any) => makeTier({
              id: t.id || newTierId(),
              name: t.name || '',
              min_subtotal: Number(t.min_subtotal) || 0,
              accent_color: t.accent_color || '#7c3aed',
              icon: t.icon || 'gift',
              tagline: t.tagline || '',
            }))
          : [],
      },
      display: {
        // free_decant slice
        title: dsp.title || '',
        subtitle: dsp.subtitle || '',
        banner_text: dsp.banner_text || '',
        // daily_deal slice
        headline: dsp.headline || 'Decume Daily',
        subheadline: dsp.subheadline || '',
        marquee_text: dsp.marquee_text || '',
        cta_label: dsp.cta_label || 'Shop Today\'s Deal',
        cta_href: dsp.cta_href || '/deals/today',
        accent_color: dsp.accent_color || '#dc2626',
        hero_image: dsp.hero_image || '',
        // mystery_gift slice
        title_gift: dsp.title_gift || 'Unlock a Mystery Gift',
        locked_prompt: dsp.locked_prompt || 'Spend {remaining} more to unlock {next}',
        box_color: dsp.box_color || '#7c3aed',
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
      const field = productIdsField(prev.type);
      const ids = (prev.config as any)[field] as string[];
      return {
        ...prev,
        config: {
          ...prev.config,
          [field]: ids.includes(pid) ? ids.filter(id => id !== pid) : [...ids, pid],
        },
      };
    });
  };

  const selectAllProducts = () => {
    setForm(prev => {
      const field = productIdsField(prev.type);
      return {
        ...prev,
        config: {
          ...prev.config,
          [field]: filteredModalProducts.map(p => getId(p)),
        },
      };
    });
  };

  const removeAllProducts = () => {
    setForm(prev => {
      const field = productIdsField(prev.type);
      return {
        ...prev,
        config: { ...prev.config, [field]: [] },
      };
    });
  };

  // Currently-selected ids for the visible picker; switches between
  // eligible_product_ids and product_ids based on form.type.
  const selectedProductIds: string[] = (form.config as any)[productIdsField(form.type)] || [];

  const addTier = () => {
    setForm(prev => {
      const tiers = prev.config.tiers || [];
      const last = tiers[tiers.length - 1];
      return {
        ...prev,
        config: {
          ...prev.config,
          tiers: [
            ...tiers,
            makeTier({ min_subtotal: last ? Number(last.min_subtotal) + 1500 : 2000 }),
          ],
        },
      };
    });
  };

  const updateTier = (id: string, patch: Partial<MysteryTier>) => {
    setForm(prev => ({
      ...prev,
      config: {
        ...prev.config,
        tiers: (prev.config.tiers || []).map(t => (t.id === id ? { ...t, ...patch } : t)),
      },
    }));
  };

  const removeTier = (id: string) => {
    setForm(prev => ({
      ...prev,
      config: {
        ...prev.config,
        tiers: (prev.config.tiers || []).filter(t => t.id !== id),
      },
    }));
  };

  const moveTier = (id: string, dir: -1 | 1) => {
    setForm(prev => {
      const tiers = [...(prev.config.tiers || [])];
      const idx = tiers.findIndex(t => t.id === id);
      const swap = idx + dir;
      if (idx === -1 || swap < 0 || swap >= tiers.length) return prev;
      [tiers[idx], tiers[swap]] = [tiers[swap], tiers[idx]];
      return { ...prev, config: { ...prev.config, tiers } };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    if (form.starts_at && form.ends_at) {
      const s = new Date(form.starts_at).getTime();
      const en = new Date(form.ends_at).getTime();
      if (en <= s) {
        setModalError('End date must be after start date.');
        setModalLoading(false);
        return;
      }
    }
    if (form.type === 'mystery_gift') {
      const tiers = form.config.tiers || [];
      if (tiers.length === 0) {
        setModalError('Add at least one mystery gift tier.');
        setModalLoading(false);
        return;
      }
      if (tiers.some(t => !t.name.trim())) {
        setModalError('Every tier needs a name.');
        setModalLoading(false);
        return;
      }
      if (tiers.some(t => !t.min_subtotal || t.min_subtotal <= 0)) {
        setModalError('Every tier needs an unlock amount greater than 0.');
        setModalLoading(false);
        return;
      }
    }
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

      {(() => {
        const needsAttention = offers.filter(o => o.is_active && !o.ends_at).length;
        if (needsAttention === 0) return null;
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
            <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
            <p className="text-amber-800">
              <span className="font-bold">{needsAttention} offer{needsAttention > 1 ? 's' : ''}</span> running with no end date — manual stop required.
            </p>
          </div>
        );
      })()}

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-slate-500 font-medium">Fetching offers...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffers.map(offer => {
            const cfg = offer.config || {};
            const eligibleCount = offer.type === 'daily_deal'
              ? (cfg.product_ids || []).length
              : (cfg.eligible_product_ids || []).length;
            const state = getOfferState(offer);
            return (
              <div
                key={offer._id}
                className={clsx(
                  'bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden',
                  !offer.is_active && 'opacity-60'
                )}
              >
                <div className="h-24 w-full bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center relative">
                  <Percent size={36} className="text-amber-400" />
                  <span className={clsx(
                    'absolute top-3 right-3 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full',
                    state.cls
                  )}>
                    {state.label}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-lg truncate">{offer.name}</h3>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
                        {offer.type?.replace('_', ' ')}
                      </p>
                      {offer.type === 'daily_deal' ? (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[10px] uppercase tracking-widest text-slate-400">
                          <span className="text-rose-500 font-bold">{cfg.discount_percent || 0}% OFF</span>
                          <span>
                            {cfg.apply_to === 'decant' ? 'Decant variants' : cfg.apply_to === 'pack' ? 'Sealed packs' : 'All variants'}
                          </span>
                        </div>
                      ) : offer.type === 'mystery_gift' ? (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[10px] uppercase tracking-widest text-slate-400">
                          {(cfg.tiers || []).length === 0 ? (
                            <span className="text-amber-500">No tiers configured</span>
                          ) : (
                            [...(cfg.tiers || [])]
                              .sort((a: any, b: any) => (a.min_subtotal || 0) - (b.min_subtotal || 0))
                              .map((t: any) => (
                                <span key={t.id} className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full" style={{ background: t.accent_color || '#7c3aed' }} />
                                  {t.name || 'Tier'} · ₹{t.min_subtotal}
                                </span>
                              ))
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[10px] uppercase tracking-widest text-slate-400">
                          <span>Min {cfg.min_qualifying_ml || 10}ml</span>
                          <span>Free {cfg.free_size_ml || 2}ml</span>
                          <span>{cfg.max_free_per_order ? `Max ${cfg.max_free_per_order}/order` : 'Unlimited'}</span>
                          <span className="text-indigo-400">
                            {cfg.qualifying_type === 'sealed' ? 'Sealed only' : cfg.qualifying_type === 'both' ? 'Decant + Sealed' : 'Decant only'}
                          </span>
                        </div>
                      )}
                      {offer.type === 'mystery_gift' ? (
                        <p className="text-[10px] uppercase tracking-widest text-indigo-500 font-bold mt-1">
                          {(cfg.tiers || []).length} Tier{(cfg.tiers || []).length === 1 ? '' : 's'}
                        </p>
                      ) : (
                        <p className="text-[10px] uppercase tracking-widest text-indigo-500 font-bold mt-1">
                          {eligibleCount} {offer.type === 'daily_deal' ? 'Deal' : 'Eligible'} Products
                        </p>
                      )}
                      {(offer.starts_at || offer.ends_at) && (
                        <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                          <Calendar size={10} />
                          {offer.starts_at ? new Date(normalizeIso(offer.starts_at)).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Now'}
                          <span className="text-slate-300 mx-0.5">→</span>
                          {offer.ends_at ? new Date(normalizeIso(offer.ends_at)).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Manual stop'}
                        </p>
                      )}
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

                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-900 font-bold flex items-center gap-2">
                      <Clock size={16} className="text-indigo-600" /> Schedule
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">Times shown in your local timezone</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Start Date & Time</label>
                        <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.starts_at === null}
                            onChange={e => setForm({ ...form, starts_at: e.target.checked ? null : plusHoursIso(0) })}
                            className="w-3.5 h-3.5 accent-indigo-600"
                          />
                          Start now
                        </label>
                      </div>
                      <input
                        type="datetime-local"
                        disabled={form.starts_at === null}
                        value={toLocalInput(form.starts_at)}
                        onChange={e => setForm({ ...form, starts_at: fromLocalInput(e.target.value) })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">End Date & Time</label>
                        <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.ends_at === null}
                            onChange={e => setForm({ ...form, ends_at: e.target.checked ? null : plusHoursIso(24 * 7) })}
                            className="w-3.5 h-3.5 accent-indigo-600"
                          />
                          No end date
                        </label>
                      </div>
                      <input
                        type="datetime-local"
                        disabled={form.ends_at === null}
                        value={toLocalInput(form.ends_at)}
                        onChange={e => setForm({ ...form, ends_at: fromLocalInput(e.target.value) })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {form.ends_at === null && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-1.5">
                      <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                      No end date set — this offer will run until you stop it manually.
                    </p>
                  )}
                </div>

                {form.type === 'daily_deal' && (
                  <>
                    <div className="border-t border-slate-100 pt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-slate-900 font-bold">Daily Deal Configuration</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Set window via Schedule above</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Discount %</label>
                          <input
                            type="number" min={1} max={90}
                            value={form.config.discount_percent}
                            onChange={e => setForm({ ...form, config: { ...form.config, discount_percent: parseInt(e.target.value || '0') } })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Apply To</label>
                          <select
                            value={form.config.apply_to}
                            onChange={e => setForm({ ...form, config: { ...form.config, apply_to: e.target.value } })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          >
                            {APPLY_TO_TYPES.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-slate-100 pt-6">
                      <p className="text-slate-900 font-bold">Decume Daily — Marketing Copy</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Headline (brand mark)</label>
                          <input
                            type="text"
                            value={form.display.headline}
                            onChange={e => setForm({ ...form, display: { ...form.display, headline: e.target.value } })}
                            placeholder="Decume Daily"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Subheadline</label>
                          <input
                            type="text"
                            value={form.display.subheadline}
                            onChange={e => setForm({ ...form, display: { ...form.display, subheadline: e.target.value } })}
                            placeholder="50% OFF on Versace Eros and Interlude 53"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Marquee Text</label>
                        <input
                          type="text"
                          value={form.display.marquee_text}
                          onChange={e => setForm({ ...form, display: { ...form.display, marquee_text: e.target.value } })}
                          placeholder="Versace Eros · Interlude 53 · 50% OFF until midnight"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">CTA Label</label>
                          <input
                            type="text"
                            value={form.display.cta_label}
                            onChange={e => setForm({ ...form, display: { ...form.display, cta_label: e.target.value } })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">CTA Link</label>
                          <input
                            type="text"
                            value={form.display.cta_href}
                            onChange={e => setForm({ ...form, display: { ...form.display, cta_href: e.target.value } })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Accent Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={form.display.accent_color}
                              onChange={e => setForm({ ...form, display: { ...form.display, accent_color: e.target.value } })}
                              className="w-12 h-[46px] rounded-lg border border-slate-200 bg-slate-50 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={form.display.accent_color}
                              onChange={e => setForm({ ...form, display: { ...form.display, accent_color: e.target.value } })}
                              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Hero Image URL (optional)</label>
                        <input
                          type="text"
                          value={form.display.hero_image}
                          onChange={e => setForm({ ...form, display: { ...form.display, hero_image: e.target.value } })}
                          placeholder="https://..."
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}

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
                  </>
                )}

                {form.type === 'mystery_gift' && (
                  <>
                    <div className="border-t border-slate-100 pt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-slate-900 font-bold flex items-center gap-2">
                          <Gift size={16} className="text-indigo-600" /> Mystery Gift Tiers
                        </p>
                        <button
                          type="button"
                          onClick={addTier}
                          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all flex items-center gap-1"
                        >
                          <Plus size={12} /> Add Tier
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Customers unlock the highest tier their cart subtotal reaches. Gifts are fulfilled offline.
                      </p>

                      {(form.config.tiers || []).length === 0 && (
                        <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                          No tiers yet. Add your first milestone.
                        </div>
                      )}

                      <div className="space-y-4">
                        {(form.config.tiers || []).map((tier, idx) => (
                          <div
                            key={tier.id}
                            className="rounded-xl border border-slate-200 p-4 space-y-3 relative"
                            style={{ borderLeft: `4px solid ${tier.accent_color || '#7c3aed'}` }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Tier {idx + 1}
                              </span>
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => moveTier(tier.id, -1)} disabled={idx === 0}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-30 disabled:cursor-not-allowed">
                                  <ArrowUp size={14} />
                                </button>
                                <button type="button" onClick={() => moveTier(tier.id, 1)} disabled={idx === (form.config.tiers || []).length - 1}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-30 disabled:cursor-not-allowed">
                                  <ArrowDown size={14} />
                                </button>
                                <button type="button" onClick={() => removeTier(tier.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tier Name</label>
                                <input
                                  type="text"
                                  value={tier.name}
                                  onChange={e => updateTier(tier.id, { name: e.target.value })}
                                  placeholder="e.g. Mystery Deluxe"
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Unlock At (₹)</label>
                                <input
                                  type="number" min={1}
                                  value={tier.min_subtotal}
                                  onChange={e => updateTier(tier.id, { min_subtotal: parseInt(e.target.value || '0') })}
                                  placeholder="2000"
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Icon</label>
                                <select
                                  value={tier.icon}
                                  onChange={e => updateTier(tier.id, { icon: e.target.value })}
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none capitalize"
                                >
                                  {MYSTERY_TIER_ICONS.map(ic => (
                                    <option key={ic} value={ic}>{ic}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Accent Color</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={tier.accent_color}
                                    onChange={e => updateTier(tier.id, { accent_color: e.target.value })}
                                    className="w-12 h-[46px] rounded-lg border border-slate-200 bg-slate-50 cursor-pointer"
                                  />
                                  <input
                                    type="text"
                                    value={tier.accent_color}
                                    onChange={e => updateTier(tier.id, { accent_color: e.target.value })}
                                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tagline</label>
                              <input
                                type="text"
                                value={tier.tagline}
                                onChange={e => updateTier(tier.id, { tagline: e.target.value })}
                                placeholder="e.g. Our most-loved picks"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-slate-100 pt-6">
                      <p className="text-slate-900 font-bold">Display Texts</p>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Section Title</label>
                        <input
                          type="text"
                          value={form.display.title_gift}
                          onChange={e => setForm({ ...form, display: { ...form.display, title_gift: e.target.value } })}
                          placeholder="Unlock a Mystery Gift"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Locked Prompt</label>
                        <input
                          type="text"
                          value={form.display.locked_prompt}
                          onChange={e => setForm({ ...form, display: { ...form.display, locked_prompt: e.target.value } })}
                          placeholder="Spend {remaining} more to unlock {next}"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                        <p className="text-[10px] text-slate-400">Use {'{remaining}'} for the amount left and {'{next}'} for the next tier name.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Mystery Box Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={form.display.box_color}
                            onChange={e => setForm({ ...form, display: { ...form.display, box_color: e.target.value } })}
                            className="w-12 h-[46px] rounded-lg border border-slate-200 bg-slate-50 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={form.display.box_color}
                            onChange={e => setForm({ ...form, display: { ...form.display, box_color: e.target.value } })}
                            placeholder="#7c3aed"
                            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400">Color of the animated mystery box on the homepage section (independent of tier colors).</p>
                      </div>
                    </div>
                  </>
                )}

                {(form.type === 'free_decant' || form.type === 'daily_deal') && (
                  <>
                    <div className="space-y-4 border-t border-slate-100 pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-900 font-bold">
                            {form.type === 'daily_deal' ? 'Deal Products' : 'Eligible Products'}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{selectedProductIds.length} of {allProducts.length} selected</p>
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
                          const isSelected = selectedProductIds.includes(pid);
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
