/**
 * ================================================================
 * sheetsApi.ts — Frontend API untuk Google Sheets (Source of Truth)
 * ================================================================
 * 
 * File ini menggantikan autoSync.ts
 * Copy ke: src/utils/sheetsApi.ts
 * 
 * Semua operasi CRUD langsung kirim ke Google Apps Script,
 * yang langsung baca/tulis ke Google Sheets.
 * 
 * localStorage hanya dipakai sebagai CACHE untuk offline fallback.
 * ================================================================
 */

import { 
  Project, Invoice, Employee, Attendance, 
  MaterialTransaction, Kasbon, Overtime, OtherExpense, ProgressPhoto 
} from '../types';
import { getGasUrl } from './googleDrive';

// ============================================================
// TYPE: Sheet name mapping
// ============================================================
export type SheetName = 
  'Projects' | 'Invoices' | 'Employees' | 'Attendance' | 
  'Materials' | 'Kasbons' | 'Overtimes' | 'OtherExpenses' | 'Photos';

// ============================================================
// CORE: API call ke Google Apps Script
// ============================================================
async function callApi(payload: Record<string, any>): Promise<any> {
  const gasUrl = getGasUrl();
  if (!gasUrl) {
    throw new Error('Google Apps Script URL belum dikonfigurasi');
  }

  const response = await fetch(gasUrl, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Unknown API error');
  }

  return data;
}

// ============================================================
// READ: Ambil semua data dari semua sheets
// ============================================================
export async function fetchAllData(): Promise<{
  projects: Project[];
  employees: Employee[];
  attendance: Attendance[];
  materials: MaterialTransaction[];
  kasbons: Kasbon[];
  overtimes: Overtime[];
  otherExpenses: OtherExpense[];
  photos: ProgressPhoto[];
}> {
  const res = await callApi({ action: 'read_all' });
  const db = res.db;

  // Reconstruct Projects with nested Invoices
  const invoices: any[] = db.Invoices || [];
  const projects: Project[] = (db.Projects || []).map((p: any) => ({
    ...p,
    budget: Number(p.budget) || 0,
    scurvePlan: p.scurvePlan || [],
    scurveActual: p.scurveActual || [],
    invoices: invoices.filter((inv: any) => inv.projectId === p.id).map((inv: any) => ({
      ...inv,
      amount: Number(inv.amount) || 0,
      isPaid: inv.isPaid === true || inv.isPaid === 'true'
    }))
  }));

  return {
    projects,
    employees: (db.Employees || []).map((e: any) => ({ ...e, dailySalary: Number(e.dailySalary) || 0 })),
    attendance: db.Attendance || [],
    materials: (db.Materials || []).map((m: any) => ({
      ...m,
      quantity: Number(m.quantity) || 0,
      pricePerUnit: Number(m.pricePerUnit) || 0,
      totalPrice: Number(m.totalPrice) || 0
    })),
    kasbons: (db.Kasbons || []).map((k: any) => ({ ...k, amount: Number(k.amount) || 0 })),
    overtimes: (db.Overtimes || []).map((o: any) => ({
      ...o,
      hours: Number(o.hours) || 0,
      hourlyRate: Number(o.hourlyRate) || 0,
      totalAmount: Number(o.totalAmount) || 0
    })),
    otherExpenses: (db.OtherExpenses || []).map((x: any) => ({ ...x, amount: Number(x.amount) || 0 })),
    photos: (db.Photos || []).map((p: any) => ({
      ...p,
      images: p.images || [],
      driveUrls: p.driveUrls || [],
      watermarked: p.watermarked === true || p.watermarked === 'true'
    }))
  };
}

// ============================================================
// CREATE operations
// ============================================================
export async function apiCreateEmployee(emp: Employee) {
  return callApi({ action: 'create', sheet: 'Employees', data: emp });
}

export async function apiCreateProject(proj: Omit<Project, 'invoices'>) {
  return callApi({ action: 'create', sheet: 'Projects', data: proj });
}

export async function apiCreateInvoice(inv: Invoice & { projectId: string }) {
  return callApi({ action: 'create', sheet: 'Invoices', data: inv });
}

export async function apiCreateMaterial(mat: MaterialTransaction) {
  return callApi({ action: 'create', sheet: 'Materials', data: mat });
}

export async function apiCreateAttendance(records: Attendance[]) {
  return callApi({ action: 'create_many', sheet: 'Attendance', rows: records });
}

export async function apiCreateKasbon(kas: Kasbon) {
  return callApi({ action: 'create', sheet: 'Kasbons', data: kas });
}

export async function apiCreateOvertime(ov: Overtime) {
  return callApi({ action: 'create', sheet: 'Overtimes', data: ov });
}

export async function apiCreateExpense(exp: OtherExpense) {
  return callApi({ action: 'create', sheet: 'OtherExpenses', data: exp });
}

export async function apiCreatePhoto(photo: ProgressPhoto) {
  return callApi({ action: 'create', sheet: 'Photos', data: photo });
}

// ============================================================
// UPDATE operations
// ============================================================
export async function apiUpdateEmployee(emp: Employee) {
  return callApi({ action: 'update', sheet: 'Employees', id: emp.id, data: emp });
}

export async function apiUpdateProject(proj: Project) {
  // Update project (without invoices — invoices are separate sheet)
  const { invoices, ...projData } = proj;
  return callApi({ action: 'update', sheet: 'Projects', id: proj.id, data: projData });
}

export async function apiUpdateInvoice(inv: Invoice & { projectId: string }) {
  return callApi({ action: 'update', sheet: 'Invoices', id: inv.id, data: inv });
}

export async function apiUpdateMaterial(mat: MaterialTransaction) {
  return callApi({ action: 'update', sheet: 'Materials', id: mat.id, data: mat });
}

export async function apiUpdateKasbon(kas: Kasbon) {
  return callApi({ action: 'update', sheet: 'Kasbons', id: kas.id, data: kas });
}

export async function apiUpdateOvertime(ov: Overtime) {
  return callApi({ action: 'update', sheet: 'Overtimes', id: ov.id, data: ov });
}

export async function apiUpdateExpense(exp: OtherExpense) {
  return callApi({ action: 'update', sheet: 'OtherExpenses', id: exp.id, data: exp });
}

export async function apiUpdatePhoto(photo: ProgressPhoto) {
  return callApi({ action: 'update', sheet: 'Photos', id: photo.id, data: photo });
}

// ============================================================
// DELETE operations
// ============================================================
export async function apiDeleteEmployee(id: string) {
  return callApi({ action: 'delete', sheet: 'Employees', id });
}

export async function apiDeleteProject(id: string) {
  // Also delete all invoices for this project
  await callApi({ action: 'delete_where', sheet: 'Invoices', field: 'projectId', value: id });
  return callApi({ action: 'delete', sheet: 'Projects', id });
}

export async function apiDeleteInvoice(id: string) {
  return callApi({ action: 'delete', sheet: 'Invoices', id });
}

export async function apiDeleteMaterial(id: string) {
  return callApi({ action: 'delete', sheet: 'Materials', id });
}

export async function apiDeleteAttendanceByDate(date: string) {
  return callApi({ action: 'delete_where', sheet: 'Attendance', field: 'date', value: date });
}

export async function apiDeleteKasbon(id: string) {
  return callApi({ action: 'delete', sheet: 'Kasbons', id });
}

export async function apiDeleteOvertime(id: string) {
  return callApi({ action: 'delete', sheet: 'Overtimes', id });
}

export async function apiDeleteExpense(id: string) {
  return callApi({ action: 'delete', sheet: 'OtherExpenses', id });
}

export async function apiDeletePhoto(id: string) {
  return callApi({ action: 'delete', sheet: 'Photos', id });
}

export async function apiDeletePhotos(ids: string[]) {
  return callApi({ action: 'delete_many', sheet: 'Photos', ids });
}

// ============================================================
// SPECIAL: Attendance replace (overwrite per date)
// ============================================================
export async function apiReplaceAttendanceForDate(date: string, records: Attendance[]) {
  // Delete existing attendance for this date, then insert new ones
  await callApi({ action: 'delete_where', sheet: 'Attendance', field: 'date', value: date });
  if (records.length > 0) {
    await callApi({ action: 'create_many', sheet: 'Attendance', rows: records });
  }
}

// ============================================================
// SPECIAL: Update S-Curve
// ============================================================
export async function apiUpdateScurve(projId: string, scurvePlan: number[], scurveActual: number[]) {
  // Read current project data first, then update
  const res = await callApi({ action: 'read', sheet: 'Projects' });
  const proj = (res.data || []).find((p: any) => p.id === projId);
  if (proj) {
    proj.scurvePlan = scurvePlan;
    proj.scurveActual = scurveActual;
    return callApi({ action: 'update', sheet: 'Projects', id: projId, data: proj });
  }
}

// ============================================================
// HELPER: Save to localStorage as cache
// ============================================================
export function cacheToLocal(key: string, data: any) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Cache save failed:', e);
  }
}

export function loadFromCache(key: string): any | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ============================================================
// HELPER: Wrap API call with optimistic local update
// ============================================================
export async function withSync<T>(
  localUpdate: () => T,
  apiCall: () => Promise<any>,
  onError?: (err: Error) => void
): Promise<T> {
  // 1. Update local state dulu (optimistic)
  const result = localUpdate();

  // 2. Kirim ke API di background
  apiCall().catch((err) => {
    console.error('[SheetsAPI] Sync gagal:', err.message);
    if (onError) onError(err);
  });

  return result;
}
