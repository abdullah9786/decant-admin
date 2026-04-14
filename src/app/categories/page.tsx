"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Trash2, Edit2, Loader2, FolderOpen, AlertCircle,
  CheckCircle2, X, GripVertical, Eye, EyeOff
} from 'lucide-react';
import { categoryApi, productApi } from '@/lib/api';
import { clsx } from 'clsx';

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function CategoryManagement() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentCategory, setCurrentCategory] = useState({
    name: '', slug: '', description: '', image_url: '', is_active: true, sort_order: 0
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [slugManual, setSlugManual] = useState(false);

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await categoryApi.getAll({ include_inactive: true });
      setCategories(response.data);
    } catch (err) {
      console.error("Error fetching categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    productApi.getAll({ include_inactive: true }).then(res => setAllProducts(res.data || [])).catch(() => {});
  }, []);

  const resetForm = () => ({
    name: '', slug: '', description: '', image_url: '', is_active: true, sort_order: 0
  });

  const getId = (p: any) => p.id || p._id;

  const openAddModal = () => {
    setModalMode('add');
    setCurrentCategory(resetForm());
    setSelectedProductIds([]);
    setProductSearch('');
    setSlugManual(false);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: any) => {
    setModalMode('edit');
    setEditingId(cat._id);
    setCurrentCategory({
      name: cat.name,
      slug: cat.slug || '',
      description: cat.description || '',
      image_url: cat.image_url || '',
      is_active: cat.is_active !== false,
      sort_order: cat.sort_order ?? 0
    });
    const catId = cat._id;
    const mapped = allProducts.filter(p => (p.category_ids || []).includes(catId)).map(p => getId(p));
    setSelectedProductIds(mapped);
    setProductSearch('');
    setSlugManual(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setCurrentCategory(resetForm());
    setSelectedProductIds([]);
    setProductSearch('');
  };

  const filteredModalProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.brand || '').toLowerCase().includes(productSearch.toLowerCase())
  );

  const toggleProduct = (pid: string) => {
    setSelectedProductIds(prev =>
      prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]
    );
  };

  const selectAllProducts = () => {
    setSelectedProductIds(filteredModalProducts.map(p => getId(p)));
  };

  const removeAllProducts = () => {
    setSelectedProductIds([]);
  };

  const handleNameChange = (value: string) => {
    setCurrentCategory(prev => ({
      ...prev,
      name: value,
      ...(slugManual ? {} : { slug: slugify(value) })
    }));
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    const payload = {
      ...currentCategory,
      slug: currentCategory.slug || slugify(currentCategory.name)
    };

    try {
      let catId: string;

      if (modalMode === 'add') {
        const res = await categoryApi.create(payload);
        catId = res.data._id || res.data.id;
      } else {
        catId = editingId!;
        await categoryApi.update(catId, payload);
      }

      const updates: Promise<any>[] = [];
      for (const pid of selectedProductIds) {
        const product = allProducts.find(p => getId(p) === pid);
        const existing: string[] = product?.category_ids || [];
        if (!existing.includes(catId)) {
          updates.push(productApi.update(pid, { category_ids: [...existing, catId] }));
        }
      }
      const previouslyMapped = allProducts.filter(p => (p.category_ids || []).includes(catId)).map(p => getId(p));
      for (const pid of previouslyMapped) {
        if (!selectedProductIds.includes(pid)) {
          const product = allProducts.find(p => getId(p) === pid);
          const existing: string[] = product?.category_ids || [];
          updates.push(productApi.update(pid, { category_ids: existing.filter(c => c !== catId) }));
        }
      }
      if (updates.length > 0) await Promise.all(updates);

      const freshProducts = await productApi.getAll({ include_inactive: true });
      setAllProducts(freshProducts.data || []);
      await fetchCategories();
      closeModal();
    } catch (err: any) {
      console.error("Error saving category:", err);
      setModalError(err.response?.data?.detail || "Failed to save category.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      await categoryApi.delete(id);
      await fetchCategories();
    } catch (err) {
      console.error("Error deleting category:", err);
      alert("Failed to delete category.");
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedCategories = [...filteredCategories].sort((a, b) => {
    const aOrder = a.sort_order ?? 0;
    const bOrder = b.sort_order ?? 0;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });

  const handleDrop = async (targetId: string) => {
    if (!draggingId || draggingId === targetId || searchTerm.trim().length > 0) return;
    const current = [...categories].sort((a, b) => {
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

    setCategories((prev) =>
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
        changed.map((c) => categoryApi.update(c._id, { sort_order: c.sort_order }))
      );
    } catch (err) {
      console.error("Error updating category order", err);
      alert('Failed to save order.');
      await fetchCategories();
    } finally {
      setSavingOrder(false);
      setDraggingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="text-slate-500 mt-1">Organize products into browsable collections like "For Men", "Under ₹999", etc.</p>
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
          <span>New Category</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search categories..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {filteredCategories.length} Categories
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-slate-500 font-medium">Fetching categories...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCategories.map((cat) => (
            <div
              key={cat._id}
              draggable={searchTerm.trim().length === 0}
              onDragStart={() => setDraggingId(cat._id)}
              onDragOver={(e) => { if (searchTerm.trim().length === 0) e.preventDefault(); }}
              onDrop={() => handleDrop(cat._id)}
              className={clsx(
                "bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden",
                draggingId === cat._id && "bg-indigo-50/60",
                !cat.is_active && "opacity-60"
              )}
            >
              {cat.image_url ? (
                <div className="h-36 w-full overflow-hidden">
                  <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              ) : (
                <div className="h-36 w-full bg-gradient-to-br from-indigo-50 to-slate-50 flex items-center justify-center">
                  <FolderOpen size={40} className="text-indigo-300" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-slate-900 text-lg truncate">{cat.name}</h3>
                      {!cat.is_active && (
                        <span className="bg-slate-100 text-slate-500 text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-tighter shrink-0">Hidden</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">/{cat.slug}</p>
                    <p className="text-sm text-slate-500 line-clamp-2 mt-2">{cat.description || 'No description'}</p>
                    <div className="flex items-center space-x-3 mt-2">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400">Order {cat.sort_order ?? 0}</p>
                      <p className="text-[10px] uppercase tracking-widest text-indigo-500 font-bold">
                        {allProducts.filter(p => (p.category_ids || []).includes(cat._id)).length} Products
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                    <GripVertical size={16} className={clsx("text-slate-300 cursor-grab", searchTerm.trim().length > 0 && "opacity-40 cursor-not-allowed")} />
                    <button onClick={() => openEditModal(cat)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(cat._id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredCategories.length === 0 && (
            <div className="col-span-full py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-white rounded-full text-slate-300">
                <FolderOpen size={40} />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-900 text-lg">No Categories Found</h3>
                <p className="text-slate-500 text-sm">Create your first category to organize products.</p>
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
                    {modalMode === 'add' ? 'Create Category' : 'Edit Category'}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">e.g. "For Men", "For Women", "Under ₹999"</p>
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
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Category Name</label>
                  <input 
                    type="text" required
                    value={currentCategory.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. For Men, Under ₹999, Best Sellers"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Slug (URL)</label>
                  <input 
                    type="text"
                    value={currentCategory.slug}
                    onChange={(e) => { setSlugManual(true); setCurrentCategory({...currentCategory, slug: e.target.value}); }}
                    placeholder="auto-generated-from-name"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                  <p className="text-[10px] text-slate-400">Used in the URL: /categories/{currentCategory.slug || 'slug'}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Image URL</label>
                  <input 
                    type="text"
                    value={currentCategory.image_url}
                    onChange={(e) => setCurrentCategory({...currentCategory, image_url: e.target.value})}
                    placeholder="https://..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                  {currentCategory.image_url && (
                    <div className="mt-2 h-24 w-full rounded-lg overflow-hidden bg-slate-100">
                      <img src={currentCategory.image_url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Display Order</label>
                    <input 
                      type="number" min={0}
                      value={currentCategory.sort_order}
                      onChange={(e) => setCurrentCategory({...currentCategory, sort_order: parseInt(e.target.value || '0', 10)})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Visibility</label>
                    <div className="flex h-[46px] items-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" className="sr-only peer"
                          checked={currentCategory.is_active}
                          onChange={(e) => setCurrentCategory({...currentCategory, is_active: e.target.checked})}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        <span className="ml-3 text-xs font-bold text-slate-500">
                          {currentCategory.is_active ? 'Active' : 'Hidden'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Description</label>
                  <textarea 
                    rows={2}
                    value={currentCategory.description}
                    onChange={(e) => setCurrentCategory({...currentCategory, description: e.target.value})}
                    placeholder="Short description shown on the category page..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>

                {/* Map to Products */}
                <div className="space-y-4 border-t border-slate-100 pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-900 font-bold">Map to Products</p>
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
                      onChange={(e) => setProductSearch(e.target.value)}
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
                </div>

                <div className="flex items-center space-x-4 pt-4">
                  <button type="button" onClick={closeModal}
                    className="flex-1 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={modalLoading}
                    className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center justify-center space-x-2">
                    {modalLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    <span>{modalMode === 'add' ? 'Create Category' : 'Save Changes'}</span>
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
