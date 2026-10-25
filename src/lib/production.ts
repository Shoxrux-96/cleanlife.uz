/**
 * Ishlab chiqarish (omborga kiritish) yozuvlari uchun umumiy format.
 * Web va mobil ilova bir xil API (FinancialTransaction) orqali ishlaydi:
 * category = 'Mahsulot ishlab chiqarish'
 * description = "Tayyor mahsulot: {nom} — {miqdor} dona × {narx} so'm (SKU: {sku})"
 */

export const PRODUCTION_CATEGORY = 'Mahsulot ishlab chiqarish';

export type ProductionInfo = {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  note?: string;
};

export const formatProductionDescription = (p: {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  note?: string;
}): string => {
  const base = `Tayyor mahsulot: ${p.name} — ${p.quantity} dona × ${Math.round(
    p.unitPrice,
  )} so'm (SKU: ${p.sku})`;
  return p.note ? `${base} — ${p.note}` : base;
};

const parseNum = (v: string): number => {
  const n = Number(v.replace(/\s/g, '').replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
};

export const parseProductionDescription = (desc: string): ProductionInfo | null => {
  if (!desc) return null;
  const m = desc.match(
    /^Tayyor mahsulot:\s*(.+?)\s+—\s+([\d\s.,]+)\s+dona\s+×\s+([\d\s.,]+)\s+so'm\s+\(SKU:\s*([^)]+)\)(?:\s+—\s+(.+))?$/,
  );
  if (!m) return null;
  return {
    name: m[1].trim(),
    quantity: parseNum(m[2]),
    unitPrice: parseNum(m[3]),
    sku: m[4].trim(),
    note: m[5] ? m[5].trim() : undefined,
  };
};
