"use client";

import React, { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Gift, Package } from "lucide-react";
import { clsx } from "clsx";

type OrderProductsCellProps = {
  items?: any[];
  freeDecants?: any[];
};

function itemLineTotal(item: any): number {
  const unit = Number(item.price || 0) + Number(item.bottle_price || 0);
  return unit * Number(item.quantity || 1);
}

function OrderItemRow({ item }: { item: any }) {
  const cancelled = item.status === "cancelled";

  return (
    <div
      className={clsx(
        "rounded-lg border px-3 py-2.5",
        cancelled ? "border-slate-100 bg-slate-50/80" : "border-slate-100 bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={clsx(
              "text-sm font-semibold leading-snug",
              cancelled ? "text-slate-400 line-through" : "text-slate-900",
            )}
          >
            {item.name || "Unnamed product"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            <span>{item.size_ml}ml</span>
            <span className="text-slate-300">•</span>
            <span
              className={clsx(
                "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                item.is_pack ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700",
              )}
            >
              {item.is_pack ? "Sealed" : "Decant"}
            </span>
            <span className="text-slate-300">•</span>
            <span>Qty {item.quantity || 1}</span>
            {cancelled && (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-semibold text-red-600">Cancelled</span>
              </>
            )}
          </div>
          {item.bottle_name && (
            <p className="mt-1 text-[11px] font-medium text-indigo-600">
              Bottle: {item.bottle_name}
              {item.bottle_price > 0 ? ` (+₹${item.bottle_price})` : ""}
            </p>
          )}
          {item.set_items?.length > 0 && (
            <div className="mt-1.5 space-y-0.5 border-l-2 border-indigo-100 pl-2">
              {item.set_items.map((si: any, idx: number) => (
                <p key={idx} className="text-[11px] text-slate-500">
                  • {si.name}
                  {si.brand ? ` (${si.brand})` : ""} — {si.size_ml}ml
                </p>
              ))}
            </div>
          )}
          {item.selected_products?.length > 0 && (
            <div className="mt-1.5 space-y-0.5 border-l-2 border-amber-200 pl-2">
              {item.selected_products.map((sp: any, idx: number) => (
                <p key={idx} className="text-[11px] text-slate-500">
                  • {sp.name} ({sp.size_ml}ml)
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p
            className={clsx(
              "text-sm font-bold",
              cancelled ? "text-slate-400 line-through" : "text-slate-900",
            )}
          >
            ₹{itemLineTotal(item).toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-slate-400">₹{item.price} each</p>
        </div>
      </div>
    </div>
  );
}

export default function OrderProductsCell({ items, freeDecants }: OrderProductsCellProps) {
  const lineItems = items ?? [];
  const freeItems = freeDecants ?? [];
  const triggerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [openAbove, setOpenAbove] = useState(false);

  const summary =
    lineItems.length > 0
      ? `${lineItems[0].name}${lineItems.length > 1 ? ` + ${lineItems.length - 1} more` : ""}`
      : "—";

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const width = 320;
    const padding = 12;
    const left = Math.min(
      Math.max(padding, rect.left),
      window.innerWidth - width - padding,
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const preferBelow = spaceBelow >= 220;
    setOpenAbove(!preferBelow);
    const top = preferBelow ? rect.bottom + 8 : rect.top - 8;

    setPosition({ top, left });
  }, []);

  const showPopover = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (lineItems.length === 0 && freeItems.length === 0) return;
    updatePosition();
    setOpen(true);
  };

  const scheduleHide = () => {
    hideTimer.current = setTimeout(() => setOpen(false), 120);
  };

  const cancelHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  };

  const hasContent = lineItems.length > 0 || freeItems.length > 0;

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showPopover}
        onMouseLeave={scheduleHide}
        onFocus={showPopover}
        onBlur={scheduleHide}
        tabIndex={hasContent ? 0 : -1}
        className={clsx(
          "max-w-[220px] truncate text-sm not-italic outline-none",
          hasContent
            ? "cursor-help text-slate-600 underline decoration-dotted decoration-slate-300 underline-offset-2 hover:text-indigo-600 hover:decoration-indigo-300"
            : "text-slate-400",
        )}
      >
        {summary}
      </div>

      {open &&
        hasContent &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{ top: position.top, left: position.left }}
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
            className={clsx(
              "fixed z-[200] w-80 max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl animate-in fade-in zoom-in-95 duration-150",
              openAbove && "-translate-y-full",
            )}
          >
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Order products ({lineItems.length})
            </p>
            <div className="space-y-2">
              {lineItems.map((item, idx) => (
                <div key={`${item.product_id || item.name}-${idx}`} className="flex gap-2">
                  <div
                    className={clsx(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      item.gift_box_id ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600",
                    )}
                  >
                    {item.gift_box_id ? <Gift size={14} /> : <Package size={14} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <OrderItemRow item={item} />
                  </div>
                </div>
              ))}
            </div>

            {freeItems.length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-amber-700">
                  Free decants ({freeItems.length})
                </p>
                <div className="space-y-1.5">
                  {freeItems.map((fd: any, idx: number) => (
                    <div
                      key={`${fd.product_id || fd.name}-${idx}`}
                      className="rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-[11px] text-amber-900"
                    >
                      <span className="font-semibold">{fd.name || "Free decant"}</span>
                      {fd.size_ml ? ` · ${fd.size_ml}ml` : ""}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
