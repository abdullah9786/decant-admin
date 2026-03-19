"use client";

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Loader2,
  Sparkles,
  AlertCircle,
  X,
  GripVertical
} from 'lucide-react';
import { brandApi } from '@/lib/api';
import { clsx } from 'clsx';

export default function BrandManagement() {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentBrand, setCurrentBrand] = useState({
    name: '',
    description: '',
    image_url: '',
    sort_order: 0
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const response = await brandApi.getAll();
      setBrands(response.data);
    } catch (err) {
      console.error("Error fetching brands:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const openAddModal = () => {
    setModalMode('add');
    setCurrentBrand({ name: '', description: '', image_url: '', sort_order: 0 });
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (brand: any) => {
    setModalMode('edit');
    setEditingId(brand._id);
    setCurrentBrand({
      name: brand.name,
      description: brand.description || '',
      image_url: brand.image_url || '',
      sort_order: brand.sort_order ?? 0
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setCurrentBrand({ name: '', description: '', image_url: '', sort_order: 0 });
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    try {
      if (modalMode === 'add') {
        await brandApi.create(currentBrand);
      } else if (editingId) {
        await brandApi.update(editingId, currentBrand);
      }
      await fetchBrands();
      closeModal();
    } catch (err: any) {
      console.error("Error saving brand:", err);
      setModalError(err.response?.data?.detail || "Failed to save brand. Please ensure the name is unique.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this brand? Products linked to this brand will need updating.")) return;

    try {
      await brandApi.delete(id);
      await fetchBrands();
    } catch (err) {
      console.error("Error deleting brand:", err);
      alert("Failed to delete brand.");
    }
  };

  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedBrands = [...filteredBrands].sort((a, b) => {
    const aOrder = a.sort_order ?? 0;
    const bOrder = b.sort_order ?? 0;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });

  const handleDrop = async (targetId: string) => {
    if (!draggingId || draggingId === targetId || searchTerm.trim().length > 0) return;
    const current = [...brands].sort((a, b) => {
      const aOrder = a.sort_order ?? 0;
      const bOrder = b.sort_order ?? 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });
    const fromIndex = current.findIndex((b) => b._id === draggingId);
    const toIndex = current.findIndex((b) => b._id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const prevOrderMap = new Map(current.map((b) => [b._id, b.sort_order ?? 0]));
    const moved = current.splice(fromIndex, 1)[0];
    current.splice(toIndex, 0, moved);
    const updated = current.map((b, idx) => ({ ...b, sort_order: idx + 1 }));

    setBrands((prev) =>
      prev.map((b) => {
        const found = updated.find((u) => u._id === b._id);
        return found ? { ...b, sort_order: found.sort_order } : b;
      })
    );

    const changed = updated.filter((b) => prevOrderMap.get(b._id) !== b.sort_order);
    if (changed.length === 0) return;

    setSavingOrder(true);
    try {
      await Promise.all(
        changed.map((b) => brandApi.update(b._id, { sort_order: b.sort_order }))
      );
    } catch (err) {
      console.error("Error updating brand order", err);
      alert('Failed to save order. Please try again.');
      await fetchBrands();
    } finally {
      setSavingOrder(false);
      setDraggingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Brand Management</h1>
          <p className="text-slate-500 mt-1">Create and manage fragrance brands used in your products.</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-2">
            Drag cards to reorder
            {searchTerm.trim().length > 0 ? ' (clear search to reorder)' : ''}
            {savingOrder ? ' • saving…' : ''}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl flex items-center justify-center space-x-2 font-bold text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
        >
          <Plus size={18} />
          <span>New Brand</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search brands..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {filteredBrands.length} Brands Total
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-slate-500 font-medium">Fetching brands...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedBrands.map((brand) => (
            <div
              key={brand._id}
              draggable={searchTerm.trim().length === 0}
              onDragStart={() => setDraggingId(brand._id)}
              onDragOver={(e) => {
                if (searchTerm.trim().length === 0) e.preventDefault();
              }}
              onDrop={() => handleDrop(brand._id)}
              className={clsx(
                "bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden",
                draggingId === brand._id && "bg-indigo-50/60"
              )}
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl overflow-hidden">
                    {brand.image_url ? (
                      <img src={brand.image_url} alt={brand.name} className="w-full h-full object-cover" />
                    ) : (
                      <Sparkles size={24} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{brand.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-1">{brand.description || 'No description provided'}</p>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">Order {brand.sort_order ?? 0}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical size={16} className={clsx("text-slate-300 cursor-grab", searchTerm.trim().length > 0 && "opacity-40 cursor-not-allowed")} />
                  <button
                    onClick={() => openEditModal(brand)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(brand._id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="absolute top-0 right-0 p-1 bg-indigo-600/5 rounded-bl-3xl transform translate-x-1 -translate-y-1 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform" />
            </div>
          ))}
          {filteredBrands.length === 0 && (
            <div className="col-span-full py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-white rounded-full text-slate-300">
                <Sparkles size={40} />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-900 text-lg">No Brands Found</h3>
                <p className="text-slate-500 text-sm">Get started by creating your first brand.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="h-2 bg-indigo-600 w-full" />
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {modalMode === 'add' ? 'Create Brand' : 'Edit Brand'}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">Enter the details for this fragrance brand.</p>
                </div>
                <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleModalSubmit} className="space-y-6">
                {modalError && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-start space-x-3 text-sm font-medium animate-in slide-in-from-top-2">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Brand Name</label>
                  <input
                    type="text"
                    required
                    value={currentBrand.name}
                    onChange={(e) => setCurrentBrand({ ...currentBrand, name: e.target.value })}
                    placeholder="e.g. Creed"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Logo Image URL (Optional)</label>
                  <input
                    type="text"
                    value={currentBrand.image_url}
                    onChange={(e) => setCurrentBrand({ ...currentBrand, image_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Display Order</label>
                  <input
                    type="number"
                    min={0}
                    value={currentBrand.sort_order}
                    onChange={(e) => setCurrentBrand({ ...currentBrand, sort_order: parseInt(e.target.value || '0', 10) })}
                    placeholder="e.g. 1"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400"
                  />
                  <p className="text-[10px] text-slate-400">Lower numbers appear first on the site.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Description</label>
                  <textarea
                    value={currentBrand.description}
                    onChange={(e) => setCurrentBrand({ ...currentBrand, description: e.target.value })}
                    rows={4}
                    placeholder="Short description of the brand..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={modalLoading}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-60"
                >
                  {modalLoading ? 'Saving...' : modalMode === 'add' ? 'Create Brand' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
