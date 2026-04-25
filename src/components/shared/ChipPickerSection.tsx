"use client";

import React from 'react';
import { clsx } from 'clsx';

const COLOR_MAP: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  pink: 'bg-pink-100 text-pink-700 border-pink-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function chipColorCls(color: string): string {
  return COLOR_MAP[color] || COLOR_MAP.indigo;
}

interface ChipPickerSectionProps {
  allChips: any[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  title?: string;
  subtitle?: string;
}

export default function ChipPickerSection({
  allChips,
  selectedIds,
  onToggle,
  title = 'Chips',
  subtitle = 'Promotional labels shown on the product card. Inactive or expired chips will not display to customers.',
}: ChipPickerSectionProps) {
  if (!allChips || allChips.length === 0) {
    return (
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="text-slate-900 font-bold">{title}</div>
        <p className="text-xs text-slate-400">
          No chips available yet. Create chips like &ldquo;Hot Selling&rdquo; or &ldquo;Big Discount&rdquo; in the
          Chips page first, then come back to assign them.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div>
        <div className="text-slate-900 font-bold">{title}</div>
        <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {allChips.map((chip: any) => {
          const cid = chip._id || chip.id;
          const selected = selectedIds.includes(cid);
          const inactive = chip.is_active === false;
          return (
            <button
              key={cid}
              type="button"
              onClick={() => onToggle(cid)}
              className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                chipColorCls(chip.color),
                selected ? 'ring-2 ring-offset-2 ring-indigo-500' : 'opacity-70 hover:opacity-100',
                inactive && 'line-through opacity-40',
              )}
              title={inactive ? 'This chip is currently inactive' : undefined}
            >
              {chip.icon && <span>{chip.icon}</span>}
              {chip.label}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400">
        {selectedIds.length} of {allChips.length} selected
      </p>
    </section>
  );
}
