"use client";

import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { clsx } from "clsx";

export interface SetItemDraft {
  product_id: string;
  name?: string;
  brand?: string;
}

interface SetItemsEditorProps {
  items: SetItemDraft[];
  onChange: (items: SetItemDraft[]) => void;
  catalog: any[];
}

function getId(p: { id?: string; _id?: string }) {
  return p.id || p._id || "";
}

export default function SetItemsEditor({
  items,
  onChange,
  catalog,
}: SetItemsEditorProps) {
  const [productSearch, setProductSearch] = useState("");

  const singles = useMemo(
    () =>
      (catalog || []).filter(
        (p) => (p.product_type || "single") !== "set" && p.is_active !== false,
      ),
    [catalog],
  );

  const selectedIds = useMemo(
    () => items.map((item) => item.product_id),
    [items],
  );

  const filteredProducts = useMemo(
    () =>
      singles.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(productSearch.toLowerCase()) ||
          (p.brand || "").toLowerCase().includes(productSearch.toLowerCase()),
      ),
    [singles, productSearch],
  );

  const toggleProduct = (pid: string) => {
    if (selectedIds.includes(pid)) {
      onChange(items.filter((item) => item.product_id !== pid));
      return;
    }
    const product = singles.find((p) => getId(p) === pid);
    if (!product) return;
    onChange([
      ...items,
      {
        product_id: pid,
        name: product.name,
        brand: product.brand,
      },
    ]);
  };

  const selectAll = () => {
    const visibleIds = filteredProducts.map((p) => getId(p));
    const nextIds = Array.from(new Set([...selectedIds, ...visibleIds]));
    onChange(
      nextIds.map((pid) => {
        const existing = items.find((item) => item.product_id === pid);
        if (existing) return existing;
        const product = singles.find((p) => getId(p) === pid);
        return {
          product_id: pid,
          name: product?.name,
          brand: product?.brand,
        };
      }),
    );
  };

  const removeAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">Included Fragrances</p>
          <p className="text-xs text-slate-500 mt-1">
            Select fragrances shown in &quot;Included Fragrances&quot; on the storefront. Set sizes are configured in Variants below.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {selectedIds.length} of {singles.length} selected
            {selectedIds.length > 0 && selectedIds.length < 2 && (
              <span className="text-amber-600 font-medium"> · at least 2 required</span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={selectAll}
            disabled={singles.length === 0}
            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all disabled:opacity-40"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={removeAll}
            disabled={selectedIds.length === 0}
            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all disabled:opacity-40"
          >
            Remove All
          </button>
        </div>
      </div>

      {singles.length === 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          Add single fragrances to your catalog before creating a set.
        </p>
      )}

      {singles.length > 0 && (
        <>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={14}
            />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-2">
            {filteredProducts.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">
                No products found
              </p>
            ) : (
              filteredProducts.map((product) => {
                const pid = getId(product);
                const isSelected = selectedIds.includes(pid);
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => toggleProduct(pid)}
                    className={clsx(
                      "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all",
                      isSelected
                        ? "bg-indigo-50 border border-indigo-200"
                        : "hover:bg-slate-50 border border-transparent",
                    )}
                  >
                    <div
                      className={clsx(
                        "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all",
                        isSelected
                          ? "bg-indigo-600 border-indigo-600"
                          : "border-slate-300",
                      )}
                    >
                      {isSelected && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded bg-slate-100 overflow-hidden flex-shrink-0">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[8px] text-slate-400 flex items-center justify-center h-full">
                          IMG
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-[10px] text-slate-400">{product.brand}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
