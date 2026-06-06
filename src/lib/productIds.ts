export function normalizeProductId(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.$oid === "string") return record.$oid.trim();
    if (record.$oid != null) return String(record.$oid).trim();
    if (record.id != null) return normalizeProductId(record.id);
    if (record._id != null) return normalizeProductId(record._id);
    if (record.product_id != null) return normalizeProductId(record.product_id);
  }
  return String(value).trim();
}

export function getProductId(product: { id?: unknown; _id?: unknown }): string {
  return normalizeProductId(product.id ?? product._id);
}

export type SetItemDraftLike = {
  product_id: string;
  name?: string;
  brand?: string;
};

export function mapSetItemsFromApi(
  raw: unknown[] | undefined | null,
): SetItemDraftLike[] {
  const mapped = (raw || []).flatMap((item) => {
    if (typeof item === "string") {
      const productId = normalizeProductId(item);
      return productId ? [{ product_id: productId }] : [];
    }
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      const productId = normalizeProductId(
        record.product_id ?? record.productId ?? record.id ?? record._id,
      );
      if (!productId) return [];
      return [
        {
          product_id: productId,
          name: typeof record.name === "string" ? record.name : undefined,
          brand: typeof record.brand === "string" ? record.brand : undefined,
        },
      ];
    }
    return [];
  });

  const seen = new Set<string>();
  return mapped.filter((item) => {
    if (seen.has(item.product_id)) return false;
    seen.add(item.product_id);
    return true;
  });
}
