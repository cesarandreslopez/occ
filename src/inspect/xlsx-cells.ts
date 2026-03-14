import XLSX from 'xlsx';
import type { CellObject, WorkSheet } from 'xlsx';

export function getCell(sheet: WorkSheet, row: number, col: number): CellObject | undefined {
  return sheet[XLSX.utils.encode_cell({ r: row, c: col })] as CellObject | undefined;
}

export function renderCell(cell: CellObject | undefined): string {
  if (!cell) return '';
  if (typeof cell.w === 'string' && cell.w.trim()) return cell.w.trim();
  if (cell.v instanceof Date) return cell.v.toISOString();
  if (cell.t === 'b') return String(Boolean(cell.v));
  if (cell.t === 'e') return cell.w?.trim() || '#ERROR';
  if (cell.v == null) return cell.f?.trim() || '';
  return String(cell.v).trim();
}

export function isNonEmptyCell(cell: CellObject): boolean {
  if (cell.f) return true;
  if (cell.t === 'z') return false;
  if (cell.c?.length) return true;
  if (cell.l?.Target) return true;
  return renderCell(cell).length > 0;
}
