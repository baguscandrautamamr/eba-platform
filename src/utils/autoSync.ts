/**
 * autoSync.ts — Auto-sync ke Google Drive + Sheets
 * 
 * CARA KERJA:
 * 1. Setiap kali data berubah (add/edit/delete), triggerAutoSync() dipanggil
 * 2. Tunggu 3 detik (debounce)
 * 3. PULL data dari cloud (JSON)
 * 4. MERGE dengan data lokal (gabungkan berdasarkan ID, tanpa duplikat)
 * 5. PUSH hasil merge ke cloud (JSON + Sheets)
 * 
 * Ini memastikan data dari SEMUA device tergabung, tidak saling overwrite.
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

export function registerAutoSync(getter: DataGetter) {
  getLatestData = getter;
}

export function triggerAutoSync() {
  const gasUrl = getGasUrl();
  if (!gasUrl || !getLatestData) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  if (timer) clearTimeout(timer);
  timer = setTimeout(() => doSync(gasUrl), DEBOUNCE_MS);
}

/** Merge 2 array berdasarkan field 'id' — local data menang kalau ada konflik */
function mergeById(localArr: any[], cloudArr: any[]): any[] {
  const map = new Map<string, any>();
  // Cloud data masuk dulu
  for (const item of cloudArr) {
    if (item?.id) map.set(item.id, item);
  }
  // Local data overwrite (local menang kalau ID sama)
  for (const item of localArr) {
    if (item?.id) map.set(item.id, item);
  }
  return Array.from(map.values());
}

/** Strip base64 dari photos agar request kecil */
function stripBase64(photos: any[]): any[] {
  return photos.map((p: any) => ({
    ...p,
    images: (p.images || [])
      .map((img: string) => (typeof img === 'string' && img.startsWith('data:')) ? '' : img)
      .filter(Boolean)
  }));
}

async function doSync(gasUrl: string) {
  if (!getLatestData) return;
  if (isSyncing) { hasPending = true; return; }

  isSyncing = true;
  try {
    const local = { ...getLatestData() };

    // === STEP 1: PULL cloud data ===
    let cloud: Record<string, any> = {};
    try {
      const pullRes = await fetch(gasUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'sync_db', type: 'get' }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
      const pullData = await pullRes.json();
      if (pullData.success && pullData.found && pullData.db) {
        cloud = pullData.db;
      }
    } catch (e) {
      console.warn('[AutoSync] Pull gagal, skip merge:', e);
    }

    // === STEP 2: MERGE local + cloud (berdasarkan ID) ===
    const merged: Record<string, any> = {
      projects:      mergeById(local.projects || [], cloud.projects || []),
      employees:     mergeById(local.employees || [], cloud.employees || []),
      attendance:    mergeById(local.attendance || [], cloud.attendance || []),
      materials:     mergeById(local.materials || [], cloud.materials || []),
      kasbons:       mergeById(local.kasbons || [], cloud.kasbons || []),
      overtimes:     mergeById(local.overtimes || [], cloud.overtimes || []),
      otherExpenses: mergeById(local.otherExpenses || [], cloud.otherExpenses || []),
      photos:        mergeById(local.photos || [], cloud.photos || []),
      lastUpdated:   Date.now()
    };

    // Strip base64 dari photos agar request tidak terlalu besar
    merged.photos = stripBase64(merged.photos);

    // === STEP 3: PUSH merged data ke cloud ===
    const pushRes = await fetch(gasUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'sync_db', type: 'put', db: merged }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });

    if (!pushRes.ok) throw new Error('Server: ' + pushRes.status);
    const pushData = await pushRes.json();
    if (!pushData.success) throw new Error(pushData.error || 'Sync gagal');

    console.log('[AutoSync] ✅ Pull-Merge-Push berhasil');
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
