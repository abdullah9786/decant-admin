import type { SetItemDraft } from '@/components/products/SetItemsEditor';
import type { AdminVariant } from '@/lib/productVariant';

export const DEFAULT_VARIANTS: AdminVariant[] = [
  { size_ml: 5, price: 0, is_pack: false, stock: 0 },
  { size_ml: 10, price: 0, is_pack: false, stock: 0 },
];

export type ProductFormData = {
  name: string;
  brand: string;
  fragrance_family: string;
  description: string;
  image_url: string;
  images: string[];
  stock_ml: number;
  sort_order: number;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_active: boolean;
  notes_top: string;
  notes_middle: string;
  notes_base: string;
  notes_top_desc: string;
  notes_middle_desc: string;
  notes_base_desc: string;
  bottle_ids: string[];
  category_ids: string[];
  chip_ids: string[];
};

export type ProductFormSnapshot = {
  productType: 'single' | 'set';
  formData: ProductFormData;
  variants: AdminVariant[];
  setItems: SetItemDraft[];
  basePrice100ml: number | string;
};

export function getDefaultBottleIds(allBottles: any[]): string[] {
  return allBottles
    .filter((b: any) => b.is_default)
    .map((b: any) => b.id || b._id);
}

export function createEmptyFormData(
  brands: any[],
  fragranceFamilies: any[],
  defaultBottleIds: string[] = [],
): ProductFormData {
  return {
    name: '',
    brand: brands[0]?.name ?? '',
    fragrance_family: fragranceFamilies[0]?.name ?? '',
    description: '',
    image_url: '',
    images: [],
    stock_ml: 0,
    sort_order: 0,
    is_featured: false,
    is_new_arrival: false,
    is_active: true,
    notes_top: '',
    notes_middle: '',
    notes_base: '',
    notes_top_desc: '',
    notes_middle_desc: '',
    notes_base_desc: '',
    bottle_ids: defaultBottleIds,
    category_ids: [],
    chip_ids: [],
  };
}

export function createEmptySnapshot(
  brands: any[],
  fragranceFamilies: any[],
  allBottles: any[],
  productType: 'single' | 'set',
): ProductFormSnapshot {
  return {
    productType,
    formData: createEmptyFormData(brands, fragranceFamilies, getDefaultBottleIds(allBottles)),
    variants: DEFAULT_VARIANTS.map((v) => ({ ...v })),
    setItems: [],
    basePrice100ml: '',
  };
}
