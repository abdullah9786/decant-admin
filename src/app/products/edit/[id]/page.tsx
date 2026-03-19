"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Upload, 
  Plus, 
  Trash2, 
  Info,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Save
} from 'lucide-react';
import { productApi, categoryApi, brandApi } from '@/lib/api';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: '',
    description: '',
    image_url: '',
    images: [] as string[],
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
    notes_base_desc: ''
  });

  const [variants, setVariants] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [fetchingCategories, setFetchingCategories] = useState(true);
  const [brands, setBrands] = useState<any[]>([]);
  const [fetchingBrands, setFetchingBrands] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const response = await productApi.getOne(productId);
        const product = response.data;
        setFormData({
          name: product.name,
          brand: product.brand,
          category: product.category || '',
          description: product.description,
          image_url: product.image_url || '',
          images: product.images || [],
          stock_ml: product.stock_ml || 0,
          sort_order: product.sort_order || 0,
          is_featured: product.is_featured || false,
          is_new_arrival: product.is_new_arrival || false,
          is_active: product.is_active !== undefined ? product.is_active : true,
          notes_top: (product.notes_top || []).join(', '),
          notes_middle: (product.notes_middle || []).join(', '),
          notes_base: (product.notes_base || []).join(', '),
          notes_top_desc: product.notes_top_desc || '',
          notes_middle_desc: product.notes_middle_desc || '',
          notes_base_desc: product.notes_base_desc || ''
        });
        setVariants(product.variants || []);
      } catch (err: any) {
        console.error("Error fetching product:", err);
        setError("Failed to load product data. It may have been deleted.");
      } finally {
        setLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await categoryApi.getAll();
        setCategories(response.data);
      } catch (err) {
        console.error("Error fetching categories:", err);
      } finally {
        setFetchingCategories(false);
      }
    };

    const fetchBrands = async () => {
      try {
        const response = await brandApi.getAll();
        setBrands(response.data);
        if (response.data.length > 0) {
          setFormData(prev => ({
            ...prev,
            brand: prev.brand || response.data[0].name
          }));
        }
      } catch (err) {
        console.error("Error fetching brands:", err);
      } finally {
        setFetchingBrands(false);
      }
    };

    if (productId) {
      fetchProduct();
      fetchCategories();
      fetchBrands();
    }
  }, [productId]);

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
    setVariants([...variants, { size_ml: 0, price: 0 }]);
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
    setSaving(true);
    setError(null);

    try {
      const splitNotes = (value: string) =>
        value
          .split(',')
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
            price: parseFloat(String(v.price))
          }))
      };

      if (productPayload.variants.length === 0) {
        setError("Please add at least one variant with a price.");
        setSaving(false);
        return;
      }

      await productApi.update(productId, productPayload);
      setSuccess(true);
      setTimeout(() => {
        router.push('/products');
      }, 1500);
    } catch (err: any) {
      console.error("Error updating product:", err);
      setError(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || "Failed to update product.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-slate-500 font-medium">Loading fragrance details...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-100">
          <CheckCircle2 size={40} />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">Changes Saved!</h2>
          <p className="text-slate-500 mt-2">The product has been updated successfully.</p>
        </div>
        <p className="text-xs text-slate-400 animate-pulse">Redirecting to catalog...</p>
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
              <span className="text-indigo-600">Edit Product</span>
            </nav>
            <h1 className="text-2xl font-bold text-slate-900">Update Perfume</h1>
          </div>
        </div>
        
        <div />
      </div>

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
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Category</label>
                  <select 
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    disabled={fetchingCategories}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none cursor-pointer disabled:opacity-50"
                  >
                    {fetchingCategories ? (
                      <option>Loading categories...</option>
                    ) : (
                      categories.map((cat: any) => (
                        <option key={cat._id} value={cat.name}>{cat.name}</option>
                      ))
                    )}
                    {categories.length === 0 && !fetchingCategories && (
                      <option value="">No categories found</option>
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
            <textarea 
              name="description"
              required
              value={formData.description}
              onChange={handleInputChange}
              rows={5} 
              placeholder="Describe the fragrance notes and character..." 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400"
            ></textarea>
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

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="text-slate-900 font-bold">Decant Variants</div>
              <button 
                type="button"
                onClick={addVariant}
                className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline"
              >
                Add Size
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">
                <span>Size</span>
                <span>Price</span>
                <span className="text-right">Action</span>
              </div>
              {variants.map((variant, i) => (
                <div key={i} className="grid grid-cols-3 gap-4 items-center">
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
                  <div className="text-right">
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
                Discard
              </Link>
              <button 
                type="submit"
                disabled={saving}
                className="flex-1 bg-indigo-600 text-white px-6 py-2.5 rounded-xl flex items-center justify-center space-x-2 font-bold text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span>{saving ? 'Updating...' : 'Save Updates'}</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}
