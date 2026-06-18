/**
 * Editor.js block: featured product card on the storefront (`BlogBlocks` case "product").
 */
const TOOLBOX_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>';

export type ProductBlockData = {
  product_id: string;
};

export default class EditorProductTool {
  private root: HTMLDivElement;

  static get toolbox() {
    return {
      title: "Product",
      icon: TOOLBOX_ICON,
    };
  }

  constructor({ data }: { data?: Partial<ProductBlockData> }) {
    const id = typeof data?.product_id === "string" ? data.product_id.trim() : "";
    this.root = document.createElement("div");
    this.root.className = "editor-product-tool space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3";

    const heading = document.createElement("div");
    heading.className = "text-xs font-bold uppercase tracking-wide text-slate-500";
    heading.textContent = "Product ID";

    const input = document.createElement("input");
    input.type = "text";
    input.id = `editor-product-${Math.random().toString(36).slice(2, 9)}`;
    input.dataset.editorProductId = "true";
    input.className =
      "mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1.5 font-mono text-sm text-slate-900";
    input.value = id;
    input.placeholder = "e.g. 665abc123def456789012345";
    input.spellcheck = false;

    const lab = document.createElement("label");
    lab.className = "block";
    lab.htmlFor = input.id;
    lab.appendChild(heading);
    lab.appendChild(input);

    const hint = document.createElement("p");
    hint.className = "text-xs leading-snug text-slate-500";
    hint.textContent =
      "Paste the product’s MongoDB id from Admin → Products. Renders as a product card on the live blog.";

    this.root.appendChild(lab);
    this.root.appendChild(hint);
  }

  render() {
    return this.root;
  }

  save(block: HTMLElement): ProductBlockData {
    const input = block.querySelector<HTMLInputElement>("[data-editor-product-id]");
    return { product_id: (input?.value ?? "").trim() };
  }

  validate(savedData: ProductBlockData): boolean {
    return typeof savedData.product_id === "string" && savedData.product_id.length > 0;
  }
}
