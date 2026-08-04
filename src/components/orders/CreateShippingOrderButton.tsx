"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Package, RefreshCw, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { orderApi } from "@/lib/api";

export type ShippingIntegrationRecord = {
  external_order_id?: string | null;
  order_number?: string;
  status?: string;
  created_at?: string;
  last_error?: string | null;
};

const PROVIDER_LABELS: Record<string, string> = {
  nimbuspost: "NimbusPost",
};

type Props = {
  orderId: string;
  provider: "nimbuspost";
  integration?: ShippingIntegrationRecord | null;
  onSuccess?: (integration: ShippingIntegrationRecord) => void;
  variant?: "default" | "compact";
  disabled?: boolean;
};

export default function CreateShippingOrderButton({
  orderId,
  provider,
  integration,
  onSuccess,
  variant = "default",
  disabled = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localIntegration, setLocalIntegration] = useState(integration);

  useEffect(() => {
    setLocalIntegration(integration);
  }, [integration]);

  const label = PROVIDER_LABELS[provider] || provider;
  const current = localIntegration ?? integration;
  const isCreated = Boolean(current?.external_order_id && current?.status !== "error");
  const hasError = current?.status === "error" || Boolean(error);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await orderApi.createShippingOrder(orderId, provider);
      const next = response.data.integration as ShippingIntegrationRecord;
      setLocalIntegration(next);
      onSuccess?.(next);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to create shipping order";
      setError(typeof detail === "string" ? detail : "Failed to create shipping order");
    } finally {
      setLoading(false);
    }
  };

  if (isCreated) {
    return (
      <div
        className={clsx(
          "inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 text-green-800",
          variant === "compact" ? "px-2 py-1 text-[10px]" : "px-3 py-2 text-xs"
        )}
        title={current?.external_order_id ? `NimbusPost ID: ${current.external_order_id}` : undefined}
      >
        <CheckCircle2 size={variant === "compact" ? 12 : 14} className="shrink-0" />
        <span className="font-bold uppercase tracking-wider">
          {label} synced
        </span>
        {current?.external_order_id ? (
          <span className="font-mono font-medium normal-case tracking-normal opacity-80">
            #{current.external_order_id}
          </span>
        ) : null}
      </div>
    );
  }

  const buttonLabel = hasError ? `Retry ${label}` : `Create order in ${label}`;

  return (
    <div className={variant === "compact" ? "inline-flex flex-col items-end gap-1" : "space-y-2"}>
      <button
        type="button"
        onClick={handleCreate}
        disabled={loading || disabled}
        className={clsx(
          "inline-flex items-center justify-center gap-2 font-bold uppercase tracking-widest transition-all disabled:opacity-50",
          variant === "compact"
            ? "rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] text-slate-700 hover:bg-slate-50"
            : "w-full rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs text-indigo-700 hover:bg-indigo-100",
          hasError && variant !== "compact" && "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        )}
        title={`Creates an order in ${label} only — book courier in ${label} dashboard`}
      >
        {loading ? (
          <Loader2 size={variant === "compact" ? 12 : 14} className="animate-spin shrink-0" />
        ) : hasError ? (
          <RefreshCw size={variant === "compact" ? 12 : 14} className="shrink-0" />
        ) : (
          <Package size={variant === "compact" ? 12 : 14} className="shrink-0" />
        )}
        {buttonLabel}
      </button>
      {hasError ? (
        <p
          className={clsx(
            "flex items-start gap-1 text-red-600",
            variant === "compact" ? "max-w-[200px] text-[10px] text-right justify-end" : "text-[11px]"
          )}
        >
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>{error || current?.last_error}</span>
        </p>
      ) : null}
    </div>
  );
}
