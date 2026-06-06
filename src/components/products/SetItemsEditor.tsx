"use client";

import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { clsx } from "clsx";
import { getProductId, normalizeProductId } from "@/lib/productIds";

export interface SetItemDraft {
  product_id: string;
  name?: string;
  brand?: string;
}

interface SetItemsEditorProps {
  items: SetItemDraft[];
  onChange: (items: SetItemDraft[]) => void;
  catalog: any[];
  excludeProductId?: string;
}

export default function SetItemsEditor({
  items,
  onChange,
  catalog,
  excludeProductId,
}: SetItemsEditorProps) {
  const [productSearch, setProductSearch] = useState("");

  const selectedIdSet = useMemo(() => {
    const ids = new Set<string>();
    for (const item of items) {
      const id = normalizeProductId(item.product_id);
      if (id) ids.add(id);
    }
    return ids;
  }, [items]);

  const singles = useMemo(
    () =>
      (catalog || []).filter((p) => {
        const pid = getProductId(p);
        if (excludeProductId && pid === normalizeProductId(excludeProductId)) {
          return false;
        }
        if ((p.product_type || "single") === "set") return false;
        if (selectedIdSet.has(pid)) return true;
        return p.is_active !== false;
      }),
    [catalog, excludeProductId, selectedIdSet],
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
    if (selectedIdSet.has(pid)) {
      onChange(
        items.filter((item) => normalizeProductId(item.product_id) !== pid),
      );
      return;
    }
    const product = singles.find((p) => getProductId(p) === pid);
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
    const visibleIds = filteredProducts.map((p) => getProductId(p)).filter(Boolean);
    const nextIds = Array.from(new Set([...selectedIdSet, ...visibleIds]));
    onChange(
      nextIds.map((pid) => {
        const existing = items.find(
          (item) => normalizeProductId(item.product_id) === pid,
        );
        if (existing) {
          return {
            ...existing,
            product_id: pid,
          };
        }
        const product = singles.find((p) => getProductId(p) === pid);
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
            {selectedIdSet.size} of {singles.length} selected
            {selectedIdSet.size > 0 && selectedIdSet.size < 2 && (
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
            disabled={selectedIdSet.size === 0}
            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all disabled:opacity-40"
          >
            Remove All
          </button>
        </div>
      </div>

      {selectedIdSet.size > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const pid = normalizeProductId(item.product_id);
            if (!pid) return null;
            return (
              <span
                key={pid}
                className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-[11px] font-semibold text-indigo-700"
              >
                {item.name || pid}
              </span>
            );
          })}
        </div>
      )}

      {singles.length === 0 && selectedIdSet.size === 0 && (
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
                const pid = getProductId(product);
                const isSelected = selectedIdSet.has(pid);
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
