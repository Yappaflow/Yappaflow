"use client";

/**
 * ProductEditor — inline catalog editor for e-commerce project flows.
 *
 * The identity extractor tries to pull products out of chat, but the agency
 * typically has more accurate data (clean stock photos, exact pricing, SKUs).
 * This component lets them review, edit, add, and delete product rows before
 * the build runs, then persists the list to the server with one PUT.
 *
 * Design notes:
 *   • We manage the array entirely in local state and only PUT when the user
 *     explicitly saves — avoids thrashing the DB on every keystroke.
 *   • Image URLs are handled as comma-separated text so we don't need a file
 *     upload flow on the MVP; stock photos on a CDN are the realistic input.
 *   • Variants are optional and collapsed-by-default per row to keep the
 *     form short for the common single-SKU product.
 *   • The component is i18n-ready via next-intl, but keeps the field schema
 *     stable (name/price/description/…) regardless of locale.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, ChevronDown, ChevronUp, Save, Loader2,
  Image as ImageIcon, Package, AlertCircle, Check,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  getProjectProducts, saveProjectProducts,
  type Product, type ProductVariant,
} from "@/lib/deploy-api";

export interface ProductEditorProps {
  projectId:  string;
  /** Called after a successful save so the parent can re-read identity. */
  onSaved?:   (products: Product[]) => void;
  /** Accent color for the save button (varies by platform). */
  accent?:    string;
}

// Blank product used when the user clicks "Add product". Pricing in the
// project's suggested currency would be ideal, but identity-level currency
// doesn't exist yet — we default to the most common ("USD") and let the
// agency change it.
function blankProduct(): Product {
  return {
    name:     "",
    price:    0,
    currency: "USD",
    images:   [],
    variants: [],
  };
}

function blankVariant(): ProductVariant {
  return { label: "", price: undefined, sku: "" };
}

/**
 * Split a comma/newline-delimited list of image URLs into an array. Tolerant
 * of extra whitespace so agencies can paste directly from a spreadsheet.
 */
function parseImages(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function joinImages(arr: string[] | undefined): string {
  return (arr ?? []).join("\n");
}

export function ProductEditor(props: ProductEditorProps) {
  const { projectId, onSaved, accent = "#FF6B35" } = props;
  const t = useTranslations("products");

  const [products, setProducts]   = useState<Product[]>([]);
  const [expanded, setExpanded]   = useState<Set<number>>(new Set());
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [savedNotice, setSaved]   = useState(false);
  // Track the raw textarea value per row so a trailing comma/newline doesn't
  // get nuked on parse-and-rejoin. We only parse on blur / save.
  const [imgDraft, setImgDraft]   = useState<Record<number, string>>({});

  // ── Initial load ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { products } = await getProjectProducts(projectId);
        if (cancelled) return;
        setProducts(products);
        // Default-expand the first row so the editor doesn't look like a
        // pile of collapsed accordions on first open.
        if (products.length > 0) setExpanded(new Set([0]));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  // ── Row ops ─────────────────────────────────────────────────────────────
  const updateRow = (idx: number, patch: Partial<Product>) => {
    setProducts((prev) => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
    setSaved(false);
  };

  const addRow = () => {
    setProducts((prev) => {
      const next = [...prev, blankProduct()];
      setExpanded(new Set([next.length - 1]));
      return next;
    });
    setSaved(false);
  };

  const removeRow = (idx: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== idx));
    setExpanded((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => { if (i < idx) next.add(i); else if (i > idx) next.add(i - 1); });
      return next;
    });
    setSaved(false);
  };

  const toggleExpand = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  // ── Variant ops ─────────────────────────────────────────────────────────
  const addVariant = (rowIdx: number) => {
    updateRow(rowIdx, {
      variants: [...(products[rowIdx].variants ?? []), blankVariant()],
    });
  };

  const updateVariant = (rowIdx: number, vIdx: number, patch: Partial<ProductVariant>) => {
    const cur = products[rowIdx].variants ?? [];
    updateRow(rowIdx, {
      variants: cur.map((v, i) => i === vIdx ? { ...v, ...patch } : v),
    });
  };

  const removeVariant = (rowIdx: number, vIdx: number) => {
    const cur = products[rowIdx].variants ?? [];
    updateRow(rowIdx, { variants: cur.filter((_, i) => i !== vIdx) });
  };

  // ── Save ────────────────────────────────────────────────────────────────
  const onSave = async () => {
    setError(null);
    setSaving(true);
    try {
      // Flush any in-flight image-textarea drafts into the products array
      // before serializing to the server.
      const flushed = products.map((p, i) => {
        const draft = imgDraft[i];
        return draft !== undefined ? { ...p, images: parseImages(draft) } : p;
      });
      const { products: saved } = await saveProjectProducts(projectId, flushed);
      setProducts(saved);
      setImgDraft({});
      setSaved(true);
      onSaved?.(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-[#111114] p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ background: `${accent}1A` }}
          >
            <Package size={14} style={{ color: accent }} />
          </div>
          <div>
            <h3 className="text-[14px] font-black text-white">{t("title")}</h3>
            <p className="mt-0.5 text-[11px] text-white/40">{t("subtitle")}</p>
          </div>
        </div>
        <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t("optional")}
        </span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 px-1 py-4 text-[12px] text-white/40">
          <Loader2 size={14} className="animate-spin" /> {t("loading")}
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] p-5 text-center">
          <p className="text-[12px] text-white/40">{t("emptyHint")}</p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {products.map((p, idx) => {
              const isOpen = expanded.has(idx);
              return (
                <motion.div
                  key={idx}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="rounded-xl border border-white/[0.05] bg-[#0A0A0A]"
                >
                  {/* Collapsed header row */}
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <button
                      onClick={() => toggleExpand(idx)}
                      className="flex-1 flex items-center gap-2 text-left"
                    >
                      {isOpen ? (
                        <ChevronUp size={12} className="text-white/40" />
                      ) : (
                        <ChevronDown size={12} className="text-white/40" />
                      )}
                      <span className="text-[13px] font-semibold text-white truncate">
                        {p.name || t("unnamed")}
                      </span>
                      {p.price > 0 && (
                        <span className="ml-1 text-[12px] font-mono tabular-nums text-white/40">
                          {p.currency ?? "USD"} {p.price.toFixed(2)}
                        </span>
                      )}
                      {p.images && p.images.length > 0 && (
                        <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-white/40">
                          <ImageIcon size={9} /> {p.images.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => removeRow(idx)}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-white/30 hover:bg-red-500/10 hover:text-red-400"
                      title={t("remove")}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Expanded editor */}
                  {isOpen && (
                    <div className="border-t border-white/[0.05] px-3 py-3 space-y-3">
                      {/* Name / SKU */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-white/30 mb-1">
                            {t("fieldName")}
                          </label>
                          <input
                            value={p.name}
                            onChange={(e) => updateRow(idx, { name: e.target.value })}
                            placeholder={t("fieldNamePlaceholder")}
                            className="w-full rounded-lg border border-white/[0.05] bg-[#0A0A0A] px-2.5 py-1.5 text-[13px] text-white outline-none focus:border-white/20"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-white/30 mb-1">
                            {t("fieldSku")}
                          </label>
                          <input
                            value={p.sku ?? ""}
                            onChange={(e) => updateRow(idx, { sku: e.target.value })}
                            placeholder={t("fieldSkuPlaceholder")}
                            className="w-full rounded-lg border border-white/[0.05] bg-[#0A0A0A] px-2.5 py-1.5 font-mono text-[12px] text-white outline-none focus:border-white/20"
                          />
                        </div>
                      </div>

                      {/* Price / Currency */}
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-white/30 mb-1">
                            {t("fieldPrice")}
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={Number.isFinite(p.price) ? p.price : 0}
                            onChange={(e) => updateRow(idx, { price: parseFloat(e.target.value) || 0 })}
                            className="w-full rounded-lg border border-white/[0.05] bg-[#0A0A0A] px-2.5 py-1.5 font-mono text-[13px] tabular-nums text-white outline-none focus:border-white/20"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-white/30 mb-1">
                            {t("fieldCurrency")}
                          </label>
                          <input
                            value={p.currency ?? "USD"}
                            onChange={(e) => updateRow(idx, { currency: e.target.value.toUpperCase().slice(0, 3) })}
                            maxLength={3}
                            className="w-20 rounded-lg border border-white/[0.05] bg-[#0A0A0A] px-2.5 py-1.5 font-mono text-[12px] uppercase text-white outline-none focus:border-white/20"
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-white/30 mb-1">
                          {t("fieldDescription")}
                        </label>
                        <textarea
                          rows={2}
                          value={p.description ?? ""}
                          onChange={(e) => updateRow(idx, { description: e.target.value })}
                          placeholder={t("fieldDescriptionPlaceholder")}
                          className="w-full resize-none rounded-lg border border-white/[0.05] bg-[#0A0A0A] px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-white/20"
                        />
                      </div>

                      {/* Images */}
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-white/30 mb-1">
                          {t("fieldImages")}
                        </label>
                        <textarea
                          rows={2}
                          value={imgDraft[idx] ?? joinImages(p.images)}
                          onChange={(e) => setImgDraft((d) => ({ ...d, [idx]: e.target.value }))}
                          onBlur={() => {
                            const raw = imgDraft[idx];
                            if (raw !== undefined) {
                              updateRow(idx, { images: parseImages(raw) });
                            }
                          }}
                          placeholder={t("fieldImagesPlaceholder")}
                          className="w-full resize-none rounded-lg border border-white/[0.05] bg-[#0A0A0A] px-2.5 py-1.5 font-mono text-[11px] text-white outline-none focus:border-white/20"
                        />
                        <p className="mt-1 text-[10px] text-white/30">{t("fieldImagesHelp")}</p>
                      </div>

                      {/* Variants */}
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <label className="text-[10px] uppercase tracking-wider text-white/30">
                            {t("fieldVariants")}
                          </label>
                          <button
                            onClick={() => addVariant(idx)}
                            className="flex items-center gap-1 rounded-md border border-white/[0.08] px-2 py-0.5 text-[10px] font-semibold text-white/60 hover:bg-white/[0.04] hover:text-white"
                          >
                            <Plus size={10} /> {t("addVariant")}
                          </button>
                        </div>
                        {(p.variants ?? []).length === 0 && (
                          <p className="text-[10px] text-white/30">{t("variantsEmpty")}</p>
                        )}
                        {(p.variants ?? []).length > 0 && (
                          <div className="mb-2">
                            <input
                              value={p.variantKind ?? ""}
                              onChange={(e) => updateRow(idx, { variantKind: e.target.value })}
                              placeholder={t("variantKindPlaceholder")}
                              className="w-full rounded-lg border border-white/[0.05] bg-[#0A0A0A] px-2.5 py-1 text-[11px] text-white outline-none focus:border-white/20"
                            />
                          </div>
                        )}
                        <div className="space-y-1.5">
                          {(p.variants ?? []).map((v, vIdx) => (
                            <div key={vIdx} className="flex items-center gap-1.5">
                              <input
                                value={v.label}
                                onChange={(e) => updateVariant(idx, vIdx, { label: e.target.value })}
                                placeholder={t("variantLabelPlaceholder")}
                                className="flex-1 rounded-md border border-white/[0.05] bg-[#0A0A0A] px-2 py-1 text-[11px] text-white outline-none focus:border-white/20"
                              />
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={v.price ?? ""}
                                onChange={(e) => {
                                  const n = parseFloat(e.target.value);
                                  updateVariant(idx, vIdx, { price: Number.isFinite(n) ? n : undefined });
                                }}
                                placeholder={t("variantPricePlaceholder")}
                                className="w-20 rounded-md border border-white/[0.05] bg-[#0A0A0A] px-2 py-1 font-mono text-[11px] tabular-nums text-white outline-none focus:border-white/20"
                              />
                              <input
                                value={v.sku ?? ""}
                                onChange={(e) => updateVariant(idx, vIdx, { sku: e.target.value })}
                                placeholder={t("variantSkuPlaceholder")}
                                className="w-24 rounded-md border border-white/[0.05] bg-[#0A0A0A] px-2 py-1 font-mono text-[11px] text-white outline-none focus:border-white/20"
                              />
                              <button
                                onClick={() => removeVariant(idx, vIdx)}
                                className="flex h-6 w-6 items-center justify-center rounded-md text-white/30 hover:bg-red-500/10 hover:text-red-400"
                                title={t("remove")}
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-[12px] font-semibold text-white/70 hover:bg-white/[0.04] hover:text-white"
        >
          <Plus size={12} /> {t("addProduct")}
        </button>
        <div className="flex-1" />
        {error && (
          <span className="inline-flex items-center gap-1 text-[11px] text-red-400">
            <AlertCircle size={11} /> {error}
          </span>
        )}
        {savedNotice && !error && (
          <span className="inline-flex items-center gap-1 text-[11px] text-green-400">
            <Check size={11} /> {t("saved")}
          </span>
        )}
        <button
          onClick={onSave}
          disabled={saving || loading}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: accent }}
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          {saving ? t("saving") : t("save")}
        </button>
      </div>
    </div>
  );
}
