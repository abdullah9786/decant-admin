"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Upload, 
  Plus, 
  Trash2, 
  Info,
  ChevronRight,
  Loader2,
  CheckCircle2,
  FileJson,
  X
} from 'lucide-react';
import { productApi, fragranceFamilyApi, categoryApi, brandApi, bottleApi } from '@/lib/api';
import RichTextEditor from '@/components/shared/RichTextEditor';

export default function AddProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    fragrance_family: '',
    description: '',
    image_url: '', // Primary Image
    images: [] as string[], // Additional Images
    stock_ml: 0,
    sort_order: 0,
    is_featured: false,
    is_new_arrival: false,
    is_active: true
    ,
    notes_top: '',
    notes_middle: '',
    notes_base: '',
    notes_top_desc: '',
    notes_middle_desc: '',
    notes_base_desc: '',
    bottle_ids: [] as string[],
    category_ids: [] as string[],
  });

  const [fragranceFamilies, setFragranceFamilies] = useState<any[]>([]);
  const [fetchingFamilies, setFetchingFamilies] = useState(true);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [allBottles, setAllBottles] = useState<any[]>([]);
  const [fetchingBrands, setFetchingBrands] = useState(true);

  React.useEffect(() => {
    const fetchFamilies = async () => {
      try {
        const response = await fragranceFamilyApi.getAll();
        setFragranceFamilies(response.data);
        if (response.data.length > 0) {
          setFormData(prev => ({ ...prev, fragrance_family: response.data[0].name }));
        }
      } catch (err) {
        console.error("Error fetching fragrance families:", err);
      } finally {
        setFetchingFamilies(false);
      }
    };
    fetchFamilies();
  }, []);

  React.useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await brandApi.getAll();
        setBrands(response.data);
        if (response.data.length > 0) {
          setFormData(prev => ({ ...prev, brand: response.data[0].name }));
        }
      } catch (err) {
        console.error("Error fetching brands:", err);
      } finally {
        setFetchingBrands(false);
      }
    };
    fetchBrands();
  }, []);

  React.useEffect(() => {
    bottleApi.getAll({ include_inactive: true }).then(res => {
      setAllBottles(res.data || []);
    }).catch(() => {});
    categoryApi.getAll({ include_inactive: true }).then(res => {
      setAllCategories(res.data || []);
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (allBottles.length === 0) return;
    const defaultIds = allBottles
      .filter((b: any) => b.is_default)
      .map((b: any) => b.id || b._id);
    if (defaultIds.length > 0) {
      setFormData(prev => {
        if (prev.bottle_ids.length > 0) return prev;
        return { ...prev, bottle_ids: defaultIds };
      });
    }
  }, [allBottles]);

  const toggleBottle = (id: string) => {
    setFormData(prev => ({
      ...prev,
      bottle_ids: prev.bottle_ids.includes(id)
        ? prev.bottle_ids.filter(b => b !== id)
        : [...prev.bottle_ids, id],
    }));
  };

  const toggleCategory = (id: string) => {
    setFormData(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(id)
        ? prev.category_ids.filter(c => c !== id)
        : [...prev.category_ids, id],
    }));
  };

  const [variants, setVariants] = useState<{ size_ml: number; price: number; is_pack: boolean; stock: number }[]>([
    { size_ml: 5, price: 0, is_pack: false, stock: 0 },
    { size_ml: 10, price: 0, is_pack: false, stock: 0 },
  ]);

  const [basePrice100ml, setBasePrice100ml] = useState<number | string>('');

  const handleBasePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBasePrice100ml(val);
    
    if (val && !isNaN(Number(val))) {
      const price = Number(val);
      setVariants(prev => prev.map(v =>
        v.is_pack ? v : { ...v, price: Math.round((price / 100) * v.size_ml) }
      ));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleVariantChange = (index: number, field: string, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const addVariant = () => {
    setVariants([...variants, { size_ml: 0, price: 0, is_pack: false, stock: 0 }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length === 1) return;
    setVariants(variants.filter((_, i) => i !== index));
  };

  const addImage = () => {
    setFormData(prev => ({ ...prev, images: [...prev.images, ''] }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const splitNotes = (value: string) =>
        value
          .split(/,|\n/)
          .map((v) => v.trim())
          .filter(Boolean);
      const productPayload = {
        ...formData,
        stock_ml: parseInt(String(formData.stock_ml || 0)),
        sort_order: parseInt(String(formData.sort_order || 0)),
        notes_top: splitNotes(formData.notes_top),
        notes_middle: splitNotes(formData.notes_middle),
        notes_base: splitNotes(formData.notes_base),
        variants: variants
          .filter(v => parseFloat(String(v.price)) > 0)
          .map(v => ({
            size_ml: parseInt(String(v.size_ml)),
            price: parseFloat(String(v.price)),
            is_pack: !!v.is_pack,
            stock: v.is_pack ? parseInt(String(v.stock || 0)) : 0,
          }))
      };

      if (productPayload.variants.length === 0) {
        setError("Please add at least one variant with a price.");
        setLoading(false);
        return;
      }

      const selectedBottles = allBottles.filter((b: any) => formData.bottle_ids.includes(b.id || b._id));
      if (selectedBottles.length > 0) {
        const decantSizes = new Set(
          productPayload.variants.filter((v: any) => !v.is_pack).map((v: any) => v.size_ml)
        );
        const allBottleSizes = new Set(selectedBottles.flatMap((b: any) => b.compatible_sizes || []));

        const unmatchedBottles = selectedBottles
          .filter((b: any) => !(b.compatible_sizes || []).some((sz: number) => decantSizes.has(sz)));
        if (unmatchedBottles.length > 0) {
          setError(`No matching variants for: ${unmatchedBottles.map((b: any) => b.name).join(', ')}`);
          setLoading(false);
          return;
        }

        const uncoveredSizes = [...decantSizes].filter(sz => !allBottleSizes.has(sz));
        if (uncoveredSizes.length > 0) {
          setError(`No bottle covers: ${uncoveredSizes.map(s => `${s}ml`).join(', ')}`);
          setLoading(false);
          return;
        }
      }

      await productApi.create(productPayload);
      setSuccess(true);
      setTimeout(() => {
        router.push('/products');
      }, 1500);
    } catch (err: any) {
      console.error("Error creating product:", err);
      // Detailed error logging for debugging
      if (err.response?.data?.detail) {
        console.log("Validation details:", JSON.stringify(err.response.data.detail, null, 2));
      }
      setError(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || "Failed to create product. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleJsonImport = () => {
    setJsonError(null);
    try {
      const data = JSON.parse(jsonText);

      const toCommaStr = (val: any): string => {
        if (Array.isArray(val)) return val.join(', ');
        if (typeof val === 'string') return val;
        return '';
      };

      setFormData(prev => ({
        ...prev,
        name: data.name ?? prev.name,
        brand: data.brand ?? prev.brand,
        fragrance_family: data.fragrance_family ?? prev.fragrance_family,
        description: data.description ?? prev.description,
        image_url: data.image_url ?? prev.image_url,
        images: Array.isArray(data.images) ? data.images : prev.images,
        stock_ml: data.stock_ml ?? prev.stock_ml,
        sort_order: data.sort_order ?? prev.sort_order,
        is_featured: data.is_featured ?? prev.is_featured,
        is_new_arrival: data.is_new_arrival ?? prev.is_new_arrival,
        is_active: data.is_active ?? prev.is_active,
        notes_top: toCommaStr(data.notes_top) || prev.notes_top,
        notes_middle: toCommaStr(data.notes_middle) || prev.notes_middle,
        notes_base: toCommaStr(data.notes_base) || prev.notes_base,
        notes_top_desc: data.notes_top_desc ?? prev.notes_top_desc,
        notes_middle_desc: data.notes_middle_desc ?? prev.notes_middle_desc,
        notes_base_desc: data.notes_base_desc ?? prev.notes_base_desc,
        bottle_ids: Array.isArray(data.bottle_ids) ? data.bottle_ids : prev.bottle_ids,
        category_ids: Array.isArray(data.category_ids) ? data.category_ids : prev.category_ids,
      }));

      if (Array.isArray(data.variants) && data.variants.length > 0) {
        setVariants(
          data.variants.map((v: any) => ({
            size_ml: Number(v.size_ml) || 0,
            price: Number(v.price) || 0,
            is_pack: !!v.is_pack,
            stock: Number(v.stock) || 0,
          }))
        );
      }

      setJsonModalOpen(false);
      setJsonText('');
    } catch {
      setJsonError('Invalid JSON. Please check the format and try again.');
    }
  };

  if (success) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-100">
          <CheckCircle2 size={40} />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">Product Created!</h2>
          <p className="text-slate-500 mt-2">The perfume has been added to your catalog successfully.</p>
        </div>
        <p className="text-xs text-slate-400 animate-pulse">Redirecting to products list...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/products" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-500" />
          </Link>
          <div>
            <nav className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center mb-1">
              <Link href="/products">Products</Link>
              <ChevronRight size={10} className="mx-2" />
              <span className="text-indigo-600">New Product</span>
            </nav>
            <h1 className="text-2xl font-bold text-slate-900">Add New Perfume</h1>
          </div>
        </div>
        
        <button
          type="button"
          onClick={() => setJsonModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
        >
          <FileJson size={16} />
          <span>Import JSON</span>
        </button>
      </div>

      {jsonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FileJson size={18} className="text-indigo-600" />
                <h3 className="font-bold text-slate-900">Import from JSON</h3>
              </div>
              <button type="button" onClick={() => { setJsonModalOpen(false); setJsonError(null); }} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-xs text-slate-500">Paste your product JSON below. All matching fields will auto-fill the form.</p>
              <textarea
                value={jsonText}
                onChange={(e) => { setJsonText(e.target.value); setJsonError(null); }}
                placeholder='{ "name": "Bleu de Chanel", "brand": "Chanel", ... }'
                rows={14}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none placeholder:text-slate-300"
              />
              {jsonError && (
                <p className="text-xs text-red-600 font-medium">{jsonError}</p>
              )}
            </div>
            <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-100">
              <button type="button" onClick={() => { setJsonModalOpen(false); setJsonError(null); }} className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleJsonImport}
                disabled={!jsonText.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Import & Fill
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 space-y-6">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center space-x-2 text-slate-900 font-bold">
              <Info size={16} className="text-indigo-600" />
              <span>Essentials</span>
            </div>
            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Product Name</label>
                <input 
                  name="name"
                  type="text" 
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Aventus" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400" 
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Brand</label>
                  <select 
                    name="brand"
                    required
                    value={formData.brand}
                    onChange={handleInputChange}
                    disabled={fetchingBrands}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none cursor-pointer disabled:opacity-50"
                  >
                    {fetchingBrands ? (
                      <option>Loading brands...</option>
                    ) : (
                      brands.map((brand: any) => (
                        <option key={brand._id} value={brand.name}>{brand.name}</option>
                      ))
                    )}
                    {brands.length === 0 && !fetchingBrands && (
                      <option value="">No brands found</option>
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Fragrance Family</label>
                  <select 
                    name="fragrance_family"
                    value={formData.fragrance_family}
                    onChange={handleInputChange}
                    disabled={fetchingFamilies}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none cursor-pointer disabled:opacity-50"
                  >
                    {fetchingFamilies ? (
                      <option>Loading fragrance families...</option>
                    ) : (
                      fragranceFamilies.map((fam: any) => (
                        <option key={fam._id} value={fam.name}>{fam.name}</option>
                      ))
                    )}
                    {fragranceFamilies.length === 0 && !fetchingFamilies && (
                      <option value="">No fragrance families found</option>
                    )}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Stock (ml)</label>
                  <input
                    name="stock_ml"
                    type="number"
                    min={0}
                    value={formData.stock_ml}
                    onChange={handleInputChange}
                    placeholder="e.g. 500"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400"
                  />
                  <p className="text-[10px] text-slate-400">Total available ml for this bottle.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Display Order</label>
                  <input
                    name="sort_order"
                    type="number"
                    min={0}
                    value={formData.sort_order}
                    onChange={handleInputChange}
                    placeholder="e.g. 1"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400"
                  />
                  <p className="text-[10px] text-slate-400">Lower numbers appear first on the site.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="text-slate-900 font-bold">Description</div>
            <RichTextEditor 
              value={formData.description}
              onChange={(content: string) => setFormData(prev => ({ ...prev, description: content }))}
              placeholder="Describe the fragrance notes and character..." 
            />
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <div className="text-slate-900 font-bold">Scent Pyramid</div>
              <p className="text-xs text-slate-500 mt-1">Enter notes and a short description for each layer.</p>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 h-full flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Top Notes</div>
                  <span className="inline-flex text-[10px] font-semibold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Opening</span>
                </div>
                <textarea
                  name="notes_top"
                  value={formData.notes_top}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Bergamot, Lemon, Pink Pepper"
                  className="w-full min-h-[72px] px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none placeholder:text-slate-400"
                />
                <textarea
                  name="notes_top_desc"
                  value={formData.notes_top_desc}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Describe the opening impression."
                  className="w-full min-h-[140px] px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none placeholder:text-slate-400 flex-1"
                />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 h-full flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Middle Notes</div>
                  <span className="inline-flex text-[10px] font-semibold uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Heart</span>
                </div>
                <textarea
                  name="notes_middle"
                  value={formData.notes_middle}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Jasmine, Rose, Lavender"
                  className="w-full min-h-[72px] px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none placeholder:text-slate-400"
                />
                <textarea
                  name="notes_middle_desc"
                  value={formData.notes_middle_desc}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Describe the heart of the fragrance."
                  className="w-full min-h-[140px] px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none placeholder:text-slate-400 flex-1"
                />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 h-full flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Base Notes</div>
                  <span className="inline-flex text-[10px] font-semibold uppercase tracking-widest text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">Trail</span>
                </div>
                <textarea
                  name="notes_base"
                  value={formData.notes_base}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Amber, Musk, Vanilla"
                  className="w-full min-h-[72px] px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none placeholder:text-slate-400"
                />
                <textarea
                  name="notes_base_desc"
                  value={formData.notes_base_desc}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Describe the lasting trail."
                  className="w-full min-h-[140px] px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none placeholder:text-slate-400 flex-1"
                />
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-slate-900 font-bold">Variants</div>
              <button 
                type="button"
                onClick={addVariant}
                className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline"
              >
                Add Size
              </button>
            </div>

            {/* Base Price 100ml Reference */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center space-x-2 text-slate-700 font-bold text-sm">
                <Info size={16} className="text-indigo-500" />
                <span>Reference Price (100ml)</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                  <input 
                    type="number"
                    value={basePrice100ml}
                    onChange={handleBasePriceChange}
                    placeholder="Enter 100ml price to auto-fill" 
                    className="w-full pl-8 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400"
                  />
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold max-w-[150px]">
                  * This price is only for calculation and won't be saved as a variant.
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">
                <span>Size</span>
                <span>Price</span>
                <span className="w-16 text-center">Pack</span>
                <span className="w-20 text-center">Stock</span>
                <span className="w-10" />
              </div>
              {variants.map((variant, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-3 items-center">
                  <div className="relative">
                    <input 
                      type="number"
                      value={variant.size_ml}
                      onChange={(e) => handleVariantChange(i, 'size_ml', e.target.value)}
                      placeholder="5"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">ML</span>
                  </div>
                  <input 
                    type="number" 
                    value={variant.price}
                    onChange={(e) => handleVariantChange(i, 'price', e.target.value)}
                    placeholder="Price" 
                    className="px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400" 
                  />
                  <label className="w-16 flex items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!variant.is_pack}
                      onChange={(e) => handleVariantChange(i, 'is_pack', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-checked:bg-indigo-600 rounded-full relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-4" />
                  </label>
                  <input
                    type="number"
                    value={variant.is_pack ? variant.stock : ''}
                    onChange={(e) => handleVariantChange(i, 'stock', e.target.value)}
                    placeholder={variant.is_pack ? "0" : "—"}
                    disabled={!variant.is_pack}
                    className="w-20 px-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed text-center"
                  />
                  <div className="w-10 text-right">
                    <button 
                      type="button"
                      onClick={() => removeVariant(i)}
                      className="p-2 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {allBottles.length > 0 && (
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="text-slate-900 font-bold">Bottles</div>
            <p className="text-xs text-slate-400">Select which bottles are available for this product. If none selected, all compatible bottles will be shown.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {allBottles.map((bottle: any) => {
                const bid = bottle.id || bottle._id;
                const selected = formData.bottle_ids.includes(bid);
                return (
                  <button key={bid} type="button" onClick={() => toggleBottle(bid)}
                    className={`relative p-3 rounded-xl border-2 transition-all text-left ${selected ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300'}`}>
                    {bottle.image_url && <img src={bottle.image_url} alt="" className="w-10 h-10 rounded-lg object-cover mb-2" />}
                    <p className="text-xs font-bold text-slate-900">{bottle.name}</p>
                    <p className="text-[10px] text-slate-400">{bottle.size_prices && Object.values(bottle.size_prices as Record<string, number>).some((v: number) => v > 0)
                      ? Object.entries(bottle.size_prices as Record<string, number>).sort(([a], [b]) => Number(a) - Number(b)).map(([sz, pr]) => `${sz}ml: ${pr > 0 ? `₹${pr}` : 'Free'}`).join(' · ')
                      : 'Free'}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(bottle.compatible_sizes || []).map((s: number) => (
                        <span key={s} className="text-[8px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{s}ml</span>
                      ))}
                    </div>
                    {bottle.is_default && <span className="absolute top-2 right-2 text-[8px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">Default</span>}
                  </button>
                );
              })}
            </div>
          </section>
          )}

          {allCategories.length > 0 && (
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="text-slate-900 font-bold">Categories</div>
            <p className="text-xs text-slate-400">Assign this product to one or more categories. Products can belong to multiple categories.</p>
            <div className="flex flex-wrap gap-2">
              {allCategories.filter((c: any) => c.is_active !== false).map((cat: any) => {
                const cid = cat._id;
                const selected = formData.category_ids.includes(cid);
                return (
                  <button key={cid} type="button" onClick={() => toggleCategory(cid)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-bold transition-all ${selected ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </section>
          )}
        </div>

        <div className="xl:col-span-5 space-y-6">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="text-slate-900 font-bold">Product Gallery</div>
              <button 
                type="button" 
                onClick={addImage}
                className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline"
              >
                Add Image
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Primary Thumbnail</label>
                <input 
                  name="image_url"
                  type="text"
                  value={formData.image_url}
                  onChange={handleInputChange}
                  placeholder="Paste primary image URL..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400"
                />
              </div>
              {formData.images.map((img, idx) => (
                <div key={idx} className="space-y-2 group">
                   <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Image {idx + 2}</label>
                      <button 
                        type="button" 
                        onClick={() => removeImage(idx)}
                        className="text-[10px] font-bold text-red-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Remove
                      </button>
                   </div>
                   <input 
                    type="text"
                    value={img}
                    onChange={(e) => handleImageChange(idx, e.target.value)}
                    placeholder="Paste additional image URL..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
               {formData.image_url && (
                 <div className="aspect-square rounded-lg bg-slate-50 border border-slate-200 overflow-hidden">
                    <img src={formData.image_url} alt="Primary" className="w-full h-full object-cover" />
                 </div>
               )}
               {formData.images.filter(img => img).map((img, idx) => (
                 <div key={idx} className="aspect-square rounded-lg bg-slate-50 border border-slate-200 overflow-hidden">
                    <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                 </div>
               ))}
               <div className="aspect-square rounded-lg bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                  <Upload size={20} />
               </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="text-slate-900 font-bold">Visibility</div>
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input 
                  name="is_featured"
                  type="checkbox" 
                  checked={formData.is_featured}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20" 
                />
                <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600">Mark as Featured</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input 
                  name="is_new_arrival"
                  type="checkbox" 
                  checked={formData.is_new_arrival}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20" 
                />
                <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600">Mark as New Arrival</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input 
                  name="is_active"
                  type="checkbox" 
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20" 
                />
                <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600">Active / Published</span>
              </label>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="text-slate-900 font-bold">Actions</div>
            {error && <div className="text-xs font-bold text-red-500 uppercase tracking-tight">{String(error)}</div>}
            <div className="flex items-center space-x-3">
              <Link href="/products" className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
                Cancel
              </Link>
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white px-6 py-2.5 rounded-xl flex items-center justify-center space-x-2 font-bold text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                <span>{loading ? 'Saving...' : 'Save Product'}</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}
