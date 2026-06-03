export type AdminVariant = {
  size_ml: number;
  price: number;
  is_pack: boolean;
  stock: number;
  label?: string;
};

export function defaultVariantButtonLabel(v: Pick<AdminVariant, "size_ml" | "is_pack">): string {
  const ml = Number(v.size_ml);
  if (!ml) return v.is_pack ? "ML Pack" : "ML";
  return v.is_pack ? `${ml}ML Pack` : `${ml}ML`;
}

export function serializeVariantForApi(v: AdminVariant) {
  const base = {
    size_ml: parseInt(String(v.size_ml)),
    price: parseFloat(String(v.price)),
    is_pack: !!v.is_pack,
    stock: v.is_pack ? parseInt(String(v.stock || 0)) : 0,
  };
  const label = String(v.label || "").trim();
  return label ? { ...base, label } : base;
}
