"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit2, 
  Loader2,
  Tag,
  AlertCircle,
  CheckCircle2,
  X,
  GripVertical
} from 'lucide-react';
import { fragranceFamilyApi } from '@/lib/api';
import { clsx } from 'clsx';

export default function FragranceFamilyManagement() {
  const [families, setFamilies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentFamily, setCurrentFamily] = useState({ 
    name: '', 
    description: '', 
    icon: '', 
    image_url: '', 
    is_featured: false,
    sort_order: 0
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const fetchFamilies = async () => {
    setLoading(true);
    try {
      const response = await fragranceFamilyApi.getAll();
      setFamilies(response.data);
    } catch (err) {
      console.error("Error fetching fragrance families:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilies();
  }, []);

  const openAddModal = () => {
    setModalMode('add');
    setCurrentFamily({ name: '', description: '', icon: '', image_url: '', is_featured: false, sort_order: 0 });
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (family: any) => {
    setModalMode('edit');
    setEditingId(family._id);
    setCurrentFamily({ 
      name: family.name, 
      description: family.description || '', 
      icon: family.icon || '',
      image_url: family.image_url || '',
      is_featured: family.is_featured || false,
      sort_order: family.sort_order ?? 0
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setCurrentFamily({ name: '', description: '', icon: '', image_url: '', is_featured: false, sort_order: 0 });
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    try {
      if (modalMode === 'add') {
        await fragranceFamilyApi.create(currentFamily);
      } else if (editingId) {
        await fragranceFamilyApi.update(editingId, currentFamily);
      }
      await fetchFamilies();
      closeModal();
    } catch (err: any) {
      console.error("Error saving fragrance family:", err);
      setModalError(err.response?.data?.detail || "Failed to save fragrance family. Please ensure the name is unique.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this fragrance family? Products linked to it might need updating.")) return;
    
    try {
      await fragranceFamilyApi.delete(id);
      await fetchFamilies();
    } catch (err) {
      console.error("Error deleting fragrance family:", err);
      alert("Failed to delete fragrance family.");
    }
  };

  const filteredFamilies = families.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedFamilies = [...filteredFamilies].sort((a, b) => {
    const aOrder = a.sort_order ?? 0;
    const bOrder = b.sort_order ?? 0;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });

  const handleDrop = async (targetId: string) => {
    if (!draggingId || draggingId === targetId || searchTerm.trim().length > 0) return;
    const current = [...families].sort((a, b) => {
      const aOrder = a.sort_order ?? 0;
      const bOrder = b.sort_order ?? 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });
    const fromIndex = current.findIndex((c) => c._id === draggingId);
    const toIndex = current.findIndex((c) => c._id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const prevOrderMap = new Map(current.map((c) => [c._id, c.sort_order ?? 0]));
    const moved = current.splice(fromIndex, 1)[0];
    current.splice(toIndex, 0, moved);
    const updated = current.map((c, idx) => ({ ...c, sort_order: idx + 1 }));

    setFamilies((prev) =>
      prev.map((c) => {
        const found = updated.find((u) => u._id === c._id);
        return found ? { ...c, sort_order: found.sort_order } : c;
      })
    );

    const changed = updated.filter((c) => prevOrderMap.get(c._id) !== c.sort_order);
    if (changed.length === 0) return;

    setSavingOrder(true);
    try {
      await Promise.all(
        changed.map((c) => fragranceFamilyApi.update(c._id, { sort_order: c.sort_order }))
      );
    } catch (err) {
      console.error("Error updating fragrance family order", err);
      alert('Failed to save order. Please try again.');
      await fetchFamilies();
    } finally {
      setSavingOrder(false);
      setDraggingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fragrance Families</h1>
          <p className="text-slate-500 mt-1">Create and manage fragrance families for your products.</p>
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
          <span>New Family</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search fragrance families..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {filteredFamilies.length} Families Total
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-slate-500 font-medium">Fetching fragrance families...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedFamilies.map((family) => (
            <div
              key={family._id}
              draggable={searchTerm.trim().length === 0}
              onDragStart={() => setDraggingId(family._id)}
              onDragOver={(e) => {
                if (searchTerm.trim().length === 0) e.preventDefault();
              }}
              onDrop={() => handleDrop(family._id)}
              className={clsx(
                "bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden",
                draggingId === family._id && "bg-indigo-50/60"
              )}
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl overflow-hidden">
                    {family.image_url ? (
                      <img src={family.image_url} alt={family.name} className="w-full h-full object-cover" />
                    ) : (
                      family.icon || <Tag size={24} />
                    )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                         <h3 className="font-bold text-slate-900 text-lg">{family.name}</h3>
                         {family.is_featured && (
                           <span className="bg-amber-100 text-amber-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-tighter">Featured</span>
                         )}
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-1">{family.description || 'No description provided'}</p>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">Order {family.sort_order ?? 0}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical size={16} className={clsx("text-slate-300 cursor-grab", searchTerm.trim().length > 0 && "opacity-40 cursor-not-allowed")} />
                  <button 
                    onClick={() => openEditModal(family)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(family._id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="absolute top-0 right-0 p-1 bg-indigo-600/5 rounded-bl-3xl transform translate-x-1 -translate-y-1 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform" />
            </div>
          ))}
          {filteredFamilies.length === 0 && (
            <div className="col-span-full py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-white rounded-full text-slate-300">
                <Tag size={40} />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-900 text-lg">No Fragrance Families Found</h3>
                <p className="text-slate-500 text-sm">Get started by creating your first fragrance family.</p>
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
                    {modalMode === 'add' ? 'Create Fragrance Family' : 'Edit Fragrance Family'}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">Enter the details for this fragrance family.</p>
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
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Family Name</label>
                  <input 
                    type="text" 
                    required
                    value={currentFamily.name}
                    onChange={(e) => setCurrentFamily({...currentFamily, name: e.target.value})}
                    placeholder="e.g. Woody, Floral, Oriental"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Icon (Emoji)</label>
                    <input 
                      type="text" 
                      value={currentFamily.icon}
                      onChange={(e) => setCurrentFamily({...currentFamily, icon: e.target.value})}
                      placeholder="e.g. 🌲"
                      maxLength={2}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Featured</label>
                    <div className="flex h-[46px] items-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={currentFamily.is_featured}
                          onChange={(e) => setCurrentFamily({...currentFamily, is_featured: e.target.checked})}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        <span className="ml-3 text-xs font-bold text-slate-500">Show in Curated Grid</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Image URL</label>
                  <input 
                    type="text" 
                    value={currentFamily.image_url}
                    onChange={(e) => setCurrentFamily({...currentFamily, image_url: e.target.value})}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Display Order</label>
                  <input 
                    type="number" 
                    min={0}
                    value={currentFamily.sort_order}
                    onChange={(e) => setCurrentFamily({...currentFamily, sort_order: parseInt(e.target.value || '0', 10)})}
                    placeholder="e.g. 1"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                  <p className="text-[10px] text-slate-400">Lower numbers appear first on the site.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Description</label>
                  <textarea 
                    rows={2}
                    value={currentFamily.description}
                    onChange={(e) => setCurrentFamily({...currentFamily, description: e.target.value})}
                    placeholder="Short description of this fragrance family..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>

                <div className="flex items-center space-x-4 pt-4">
                  <button 
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={modalLoading}
                    className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {modalLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    <span>{modalMode === 'add' ? 'Create Family' : 'Save Changes'}</span>
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
