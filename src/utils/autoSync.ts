/**
 * autoSync.ts — Auto-sync ke Google Drive + Sheets
 * 
 * CARA KERJA (SEDERHANA, TANPA MERGE):
 * 1. Setiap kali data berubah, triggerAutoSync() dipanggil
 * 2. Tunggu 3 detik (debounce)
 * 3. Push data lokal ke cloud (REPLACE, bukan merge)
 * 4. Cloud JSON + Sheets langsung terupdate
 * 
 * TIDAK pakai merge — data lokal = sumber kebenaran.
 * Multi-device sync dilakukan via "Ambil dari Cloud" manual.
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

type StatusCb = (status: 'idle' | 'syncing' | 'success' | 'error', msg?: string) => void;
let statusCb: StatusCb | null = null;

export function registerAutoSync(getter: DataGetter, onStatus?: StatusCb) {
  getLatestData = getter;
  statusCb = onStatus || null;
}

export function triggerAutoSync() {
  const gasUrl = getGasUrl();
  if (!gasUrl || !getLatestData) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  if (timer) clearTimeout(timer);
  timer = setTimeout(() => doSync(gasUrl), DEBOUNCE_MS);
}

/**
 * Bersihkan photos sebelum kirim ke cloud:
 * - base64 di images[] diganti dengan driveUrl (supaya bisa ditampilkan saat pull)
 * - Kalau tidak ada driveUrl, base64 dihapus (terlalu besar untuk JSON cloud)
 */
export function cleanPhotosForSync(photos: any[]): any[] {
  if (!Array.isArray(photos)) return [];
  return photos.map((p: any) => {
    const driveUrls: string[] = p.driveUrls || [];
    // Ganti base64 di images dengan driveUrl, bukan hapus
    const cleanImages = (p.images || []).map((img: string, i: number) => {
      if (typeof img === 'string' && img.startsWith('data:')) {
        // Ganti base64 dengan driveUrl kalau ada
        return driveUrls[i] || driveUrls[0] || '';
      }
      return img; // Sudah URL, keep as is
    }).filter(Boolean);

    return {
      ...p,
      images: cleanImages.length > 0 ? cleanImages : driveUrls // fallback ke driveUrls
    };
  });
}

async function doSync(gasUrl: string) {
  if (!getLatestData) return;
  if (isSyncing) { hasPending = true; return; }

  isSyncing = true;
  statusCb?.('syncing', 'Menyinkronkan...');
  try {
    const local = { ...getLatestData() };

    // Bersihkan photos (ganti base64 → driveUrl)
    local.photos = cleanPhotosForSync(local.photos);
    local.lastUpdated = Date.now();

    // PUSH langsung — data lokal = kebenaran
    const res = await fetch(gasUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'sync_db', type: 'put', db: local }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });

    if (!res.ok) throw new Error('Server: ' + res.status);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Sync gagal');

    console.log('[AutoSync] ✅ Berhasil sync ke cloud');
    statusCb?.('success', 'Tersinkron');
    setTimeout(() => statusCb?.('idle'), 2500);
  } catch (e: any) {
    console.warn('[AutoSync] ❌ Gagal:', e.message);
    statusCb?.('error', 'Gagal sync');
    setTimeout(() => statusCb?.('idle'), 4000);
  } finally {
    isSyncing = false;
    if (hasPending) {
      hasPending = false;
      setTimeout(() => doSync(gasUrl), 1000);
    }
  }
}
