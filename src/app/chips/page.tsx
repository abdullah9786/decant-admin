"use client";

import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Trash2, Edit2, Loader2, BadgeCheck, AlertCircle,
  CheckCircle2, X, Clock, Calendar,
} from 'lucide-react';
import { chipApi, productApi } from '@/lib/api';
import { clsx } from 'clsx';
import ConfirmDialog, { ConfirmDialogConfig } from '@/components/shared/ConfirmDialog';

const COLOR_OPTIONS = [
  { value: 'amber', label: 'Amber', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'red', label: 'Red', cls: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'orange', label: 'Orange', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'green', label: 'Green', cls: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'emerald', label: 'Emerald', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'blue', label: 'Blue', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'indigo', label: 'Indigo', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { value: 'purple', label: 'Purple', cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'pink', label: 'Pink', cls: 'bg-pink-100 text-pink-700 border-pink-200' },
  { value: 'slate', label: 'Slate', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
];

function chipColorCls(color: string): string {
  return COLOR_OPTIONS.find(c => c.value === color)?.cls || COLOR_OPTIONS[6].cls;
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
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

interface ChipState {
  label: string;
  cls: string;
}

function getChipState(c: any): ChipState {
  if (!c.is_active) return { label: 'Inactive', cls: 'bg-slate-100 text-slate-500 border border-slate-200' };
  const now = Date.now();
  const start = c.starts_at ? new Date(c.starts_at).getTime() : null;
  const end = c.ends_at ? new Date(c.ends_at).getTime() : null;
  if (start && start > now) return { label: 'Scheduled', cls: 'bg-blue-50 text-blue-700 border border-blue-200' };
  if (end && end <= now) return { label: 'Expired', cls: 'bg-red-50 text-red-700 border border-red-200' };
  if (!end) return { label: 'Live · No end date', cls: 'bg-amber-50 text-amber-700 border border-amber-200' };
  return { label: 'Live', cls: 'bg-green-50 text-green-700 border border-green-200' };
}

interface ChipForm {
  code: string;
  label: string;
  color: string;
  icon: string;
  priority: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

const emptyForm = (): ChipForm => ({
  code: '',
  label: '',
  color: 'indigo',
  icon: '',
  priority: 0,
  is_active: true,
  starts_at: null,
  ends_at: null,
});

function slugifyCode(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_\s-]/g, '')
    .replace(/[-\s]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export default function ChipManagement() {
  const [chips, setChips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [form, setForm] = useState<ChipForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [originalProductIds, setOriginalProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const [confirmCfg, setConfirmCfg] = useState<ConfirmDialogConfig | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [toast, setToast] = useState<{ kind: 'error' | 'success'; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const getId = (p: any) => p.id || p._id;

  const fetchChips = async () => {
    setLoading(true);
    try {
      const res = await chipApi.getAll();
      setChips(res.data);
    } catch (err) {
      console.error('Error fetching chips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChips();
    productApi.getAll({ include_inactive: true }).then(res => setAllProducts(res.data || [])).catch(() => {});
  }, []);

  const productsLinkedToChip = (chipId: string): string[] =>
    allProducts
      .filter(p => Array.isArray(p.chip_ids) && p.chip_ids.includes(chipId))
      .map(p => getId(p));

  const openAddModal = () => {
    setModalMode('add');
    setForm(emptyForm());
    setCodeManuallyEdited(false);
    setModalError(null);
    setSelectedProductIds([]);
    setOriginalProductIds([]);
    setProductSearch('');
    setIsModalOpen(true);
  };

  const openEditModal = (chip: any) => {
    setModalMode('edit');
    setEditingId(chip._id);
    setForm({
      code: chip.code || '',
      label: chip.label || '',
      color: chip.color || 'indigo',
      icon: chip.icon || '',
      priority: chip.priority ?? 0,
      is_active: chip.is_active !== false,
      starts_at: chip.starts_at || null,
      ends_at: chip.ends_at || null,
    });
    setCodeManuallyEdited(true);
    setModalError(null);
    const linked = productsLinkedToChip(chip._id);
    setOriginalProductIds(linked);
    setSelectedProductIds(linked);
    setProductSearch('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setCodeManuallyEdited(false);
    setSelectedProductIds([]);
    setOriginalProductIds([]);
    setProductSearch('');
  };

  const filteredModalProducts = allProducts.filter(p =>
    (p.name || '').toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.brand || '').toLowerCase().includes(productSearch.toLowerCase())
  );

  const toggleProduct = (pid: string) => {
    setSelectedProductIds(prev =>
      prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]
    );
  };

  const selectAllProducts = () => {
    const visibleIds = filteredModalProducts.map(p => getId(p));
    setSelectedProductIds(prev => Array.from(new Set([...prev, ...visibleIds])));
  };

  const removeAllProducts = () => {
    setSelectedProductIds([]);
  };

  const handleLabelChange = (label: string) => {
    setForm(prev => ({
      ...prev,
      label,
      code: codeManuallyEdited ? prev.code : slugifyCode(label),
    }));
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
    if (!form.code) {
      setModalError('Code is required.');
      setModalLoading(false);
      return;
    }
    try {
      let chipId = editingId;
      if (modalMode === 'add') {
        const res = await chipApi.create(form);
        chipId = res.data?._id || res.data?.id || null;
      } else {
        await chipApi.update(editingId!, form);
      }

      if (chipId) {
        const toAdd = selectedProductIds.filter(id => !originalProductIds.includes(id));
        const toRemove = originalProductIds.filter(id => !selectedProductIds.includes(id));

        if (toAdd.length > 0) {
          await productApi.bulkChips({ product_ids: toAdd, add: [chipId], remove: [] });
        }
        if (toRemove.length > 0) {
          await productApi.bulkChips({ product_ids: toRemove, add: [], remove: [chipId] });
        }

        if (toAdd.length > 0 || toRemove.length > 0) {
          const refreshed = await productApi.getAll({ include_inactive: true });
          setAllProducts(refreshed.data || []);
        }
      }

      await fetchChips();
      closeModal();
    } catch (err: any) {
      console.error('Error saving chip:', err);
      setModalError(err.response?.data?.detail || 'Failed to save chip.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = (chip: any) => {
    const linkedCount = productsLinkedToChip(chip._id).length;
    setConfirmCfg({
      title: 'Delete chip?',
      message:
        linkedCount > 0
          ? `"${chip.label}" will be permanently deleted and removed from ${linkedCount} product${linkedCount > 1 ? 's' : ''} currently using it. This action cannot be undone.`
          : `"${chip.label}" will be permanently deleted. This action cannot be undone.`,
      confirmLabel: 'Delete chip',
      destructive: true,
      run: async () => {
        try {
          await chipApi.delete(chip._id);
          await fetchChips();
          setToast({ kind: 'success', message: `Chip "${chip.label}" deleted.` });
        } catch (err) {
          console.error('Error deleting chip:', err);
          setToast({ kind: 'error', message: 'Failed to delete chip.' });
        }
      },
    });
  };

  const handleToggleActive = (chip: any) => {
    const turningOff = chip.is_active;
    setConfirmCfg({
      title: turningOff ? 'Deactivate chip?' : 'Activate chip?',
      message: turningOff
        ? `"${chip.label}" will be hidden from product cards immediately. You can reactivate it any time.`
        : `"${chip.label}" will start showing on its assigned products${chip.starts_at || chip.ends_at ? ' (subject to its schedule)' : ''}.`,
      confirmLabel: turningOff ? 'Deactivate' : 'Activate',
      destructive: turningOff,
      run: async () => {
        try {
          await chipApi.update(chip._id, { is_active: !chip.is_active });
          await fetchChips();
        } catch (err) {
          console.error('Error toggling chip:', err);
          setToast({ kind: 'error', message: 'Failed to update chip status.' });
        }
      },
    });
  };

  const runConfirm = async () => {
    if (!confirmCfg) return;
    const cfg = confirmCfg;
    setConfirmLoading(true);
    try {
      await cfg.run();
    } finally {
      setConfirmLoading(false);
      setConfirmCfg(null);
    }
  };

  const filteredChips = chips.filter(c =>
    (c.label || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chips</h1>
          <p className="text-slate-500 mt-1">Manage promotional chip labels (Hot Selling, Big Discount, Top Rated, etc.) shown on product cards.</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl flex items-center justify-center space-x-2 font-bold text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
        >
          <Plus size={18} />
          <span>New Chip</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search chips..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {filteredChips.length} Chips
        </div>
      </div>

      {(() => {
        const noEnd = chips.filter(c => c.is_active && !c.ends_at).length;
        if (noEnd === 0) return null;
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
            <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
            <p className="text-amber-800">
              <span className="font-bold">{noEnd} chip{noEnd > 1 ? 's' : ''}</span> running with no end date — manual stop required.
            </p>
          </div>
        );
      })()}

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-slate-500 font-medium">Fetching chips...</p>
        </div>
      ) : filteredChips.length === 0 ? (
        <div className="py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-white rounded-full text-slate-300">
            <BadgeCheck size={40} />
          </div>
          <div className="text-center">
            <h3 className="font-bold text-slate-900 text-lg">No Chips Found</h3>
            <p className="text-slate-500 text-sm">Create your first chip — for example &ldquo;Hot Selling&rdquo; or &ldquo;Big Discount&rdquo;.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Chip</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Code</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Priority</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Products</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Schedule</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredChips.map(chip => {
                  const state = getChipState(chip);
                  const productCount = productsLinkedToChip(chip._id).length;
                  return (
                    <tr
                      key={chip._id}
                      className={clsx(
                        'transition-colors group hover:bg-slate-50/50',
                        !chip.is_active && 'opacity-60'
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className={clsx(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm whitespace-nowrap',
                            chipColorCls(chip.color)
                          )}>
                            {chip.icon && <span>{chip.icon}</span>}
                            {chip.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                        {chip.code}
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap',
                          state.cls
                        )}>
                          {state.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-bold">
                        {chip.priority ?? 0}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {productCount > 0 ? (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                            {productCount}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[10px] text-slate-500">
                        {chip.starts_at || chip.ends_at ? (
                          <div className="flex items-center gap-1">
                            <Calendar size={10} className="text-slate-400 flex-shrink-0" />
                            <span className="whitespace-nowrap">
                              {chip.starts_at ? new Date(chip.starts_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Now'}
                              <span className="text-slate-300 mx-1">→</span>
                              {chip.ends_at ? new Date(chip.ends_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Manual stop'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 uppercase tracking-widest font-bold">Always</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleToggleActive(chip)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title={chip.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {chip.is_active ? (
                              <CheckCircle2 size={16} className="text-green-500" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                            )}
                          </button>
                          <button onClick={() => openEditModal(chip)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(chip)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
                    {modalMode === 'add' ? 'Create Chip' : 'Edit Chip'}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">Define a chip label, color and optional schedule.</p>
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

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-center">
                  <span className={clsx(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm',
                    chipColorCls(form.color)
                  )}>
                    {form.icon && <span>{form.icon}</span>}
                    {form.label || 'Live Preview'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Label</label>
                    <input
                      type="text" required
                      value={form.label}
                      onChange={e => handleLabelChange(e.target.value)}
                      placeholder="e.g. Hot Selling"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Code (machine name)</label>
                    <input
                      type="text" required
                      value={form.code}
                      onChange={e => { setForm({ ...form, code: slugifyCode(e.target.value) }); setCodeManuallyEdited(true); }}
                      placeholder="e.g. hot_selling"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm({ ...form, color: opt.value })}
                        className={clsx(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                          opt.cls,
                          form.color === opt.value ? 'ring-2 ring-offset-2 ring-indigo-500' : 'opacity-70 hover:opacity-100'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Icon (optional)</label>
                    <input
                      type="text"
                      value={form.icon}
                      onChange={e => setForm({ ...form, icon: e.target.value })}
                      placeholder="e.g. 🔥"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                    <p className="text-[10px] text-slate-400">Use an emoji for the simplest setup.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Priority</label>
                    <input
                      type="number"
                      value={form.priority}
                      onChange={e => setForm({ ...form, priority: parseInt(e.target.value || '0') })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                    <p className="text-[10px] text-slate-400">Lower = appears first.</p>
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
                      No end date set — this chip will run until you stop it manually.
                    </p>
                  )}
                </div>

                <div className="space-y-4 border-t border-slate-100 pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-900 font-bold">Products</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {selectedProductIds.length} of {allProducts.length} selected
                        {modalMode === 'edit' && (() => {
                          const toAdd = selectedProductIds.filter(id => !originalProductIds.includes(id)).length;
                          const toRemove = originalProductIds.filter(id => !selectedProductIds.includes(id)).length;
                          if (toAdd === 0 && toRemove === 0) return null;
                          return (
                            <span className="ml-2 text-indigo-500">
                              · {toAdd > 0 && `+${toAdd}`}{toAdd > 0 && toRemove > 0 && ' '}{toRemove > 0 && `−${toRemove}`} pending
                            </span>
                          );
                        })()}
                      </p>
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

                <div className="flex items-center space-x-4 pt-4">
                  <button type="button" onClick={closeModal}
                    className="flex-1 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={modalLoading}
                    className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center justify-center space-x-2">
                    {modalLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    <span>{modalMode === 'add' ? 'Create Chip' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        config={confirmCfg}
        loading={confirmLoading}
        onCancel={() => setConfirmCfg(null)}
        onConfirm={runConfirm}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-[120] animate-in slide-in-from-bottom-4 duration-200">
          <div className={clsx(
            'flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border max-w-sm',
            toast.kind === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-green-50 border-green-200 text-green-700',
          )}>
            {toast.kind === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <p className="text-sm font-medium">{toast.message}</p>
            <button onClick={() => setToast(null)} className="ml-2 text-current opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
