"use client";

import React, { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";

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

export default function SetItemsEditor({
  items,
  onChange,
  catalog,
}: SetItemsEditorProps) {
  const singles = useMemo(
    () =>
      (catalog || []).filter(
        (p) => (p.product_type || "single") !== "set" && p.is_active !== false,
      ),
    [catalog],
  );

  const addItem = () => {
    const first = singles[0];
    if (!first) return;
    const pid = first.id || first._id;
    onChange([
      ...items,
      {
        product_id: pid,
        name: first.name,
        brand: first.brand,
      },
    ]);
  };

  const updateItem = (index: number, productId: string) => {
    const product = singles.find((p) => (p.id || p._id) === productId);
    onChange(
      items.map((item, i) =>
        i === index
          ? {
              product_id: productId,
              name: product?.name,
              brand: product?.brand,
            }
          : item,
      ),
    );
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">Included Fragrances</p>
          <p className="text-xs text-slate-500 mt-1">
            Link products shown in &quot;Included Fragrances&quot; on the storefront. Set sizes are configured in Variants below.
          </p>
        </div>
        <button
          type="button"
          onClick={addItem}
          disabled={singles.length === 0}
          className="inline-flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 disabled:opacity-40"
        >
          <Plus size={14} />
          Add fragrance
        </button>
      </div>

      {singles.length === 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          Add single fragrances to your catalog before creating a set.
        </p>
      )}

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={`${item.product_id}-${index}`}
            className="grid grid-cols-1 md:grid-cols-[1fr_40px] gap-3 items-end p-4 bg-slate-50 border border-slate-200 rounded-xl"
          >
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Fragrance
              </label>
              <select
                value={item.product_id}
                onChange={(e) => updateItem(index, e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm"
              >
                {singles.map((p) => {
                  const pid = p.id || p._id;
                  return (
                    <option key={pid} value={pid}>
                      {p.name} — {p.brand}
                    </option>
                  );
                })}
              </select>
            </div>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Remove fragrance"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
