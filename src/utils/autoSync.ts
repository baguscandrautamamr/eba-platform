/**
 * autoSync.ts — Auto-sync ke Google Drive + Sheets
 * 
 * CARA KERJA:
 * - Setiap kali data berubah (add/edit/delete), triggerAutoSync() dipanggil
 * - Tunggu 3 detik (debounce) setelah perubahan terakhir
 * - Push SEMUA data ke Google Drive (JSON) + Google Sheets
 * - Menggunakan endpoint sync_db yang sudah ada di Code.gs
 * 
 * Copy ke: src/utils/autoSync.ts
 */

import { getGasUrl } from './googleDrive';

const DEBOUNCE_MS = 3000;
let timer: ReturnType<typeof setTimeout> | null = null;
let isSyncing = false;
let hasPending = false;

type DataGetter = () => Record<string, any>;
let getLatestData: DataGetter | null = null;

/** Panggil sekali di App.tsx useEffect untuk register data getter */
export function registerAutoSync(getter: DataGetter) {
  getLatestData = getter;
}

/** Panggil setiap kali data berubah */
export function triggerAutoSync() {
  const gasUrl = getGasUrl();
  if (!gasUrl || !getLatestData) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  if (timer) clearTimeout(timer);
  timer = setTimeout(() => doSync(gasUrl), DEBOUNCE_MS);
}

async function doSync(gasUrl: string) {
  if (!getLatestData) return;
  if (isSyncing) { hasPending = true; return; }

  isSyncing = true;
  try {
    const db = { ...getLatestData() };

    // PENTING: Strip base64 dari photos agar request tidak terlalu besar
    // Hanya kirim metadata + driveUrls, bukan gambar mentah
    if (Array.isArray(db.photos)) {
      db.photos = db.photos.map((p: any) => ({
        ...p,
        images: (p.images || []).map((img: string) =>
          img.startsWith('data:') ? '' : img // hapus base64, keep URL
        ).filter(Boolean)
      }));
    }

    const payload = { action: 'sync_db', type: 'put', db: { ...db, lastUpdated: Date.now() } };

    const res = await fetch(gasUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });

    if (!res.ok) throw new Error('Server: ' + res.status);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Sync gagal');

    console.log('[AutoSync] ✅ Berhasil sync ke cloud');
  } catch (e: any) {
    console.warn('[AutoSync] ❌ Gagal:', e.message);
  } finally {
    isSyncing = false;
    if (hasPending) {
      hasPending = false;
      setTimeout(() => doSync(gasUrl), 1000);
    }
  }
}
