/**
 * autoSync.ts
 * ============
 * Utility untuk auto-sync data ke Google Apps Script setiap kali ada perubahan (CRUD).
 * Menggunakan debounce agar tidak terlalu sering mengirim request.
 *
 * CARA PAKAI:
 * 1. Copy file ini ke: src/utils/autoSync.ts
 * 2. Di App.tsx, import dan panggil triggerAutoSync() setiap kali data berubah
 */

import { getGasUrl, syncDatabaseViaGas } from './googleDrive';

// ============================================================
// CONFIG
// ============================================================
const DEBOUNCE_MS = 3000; // Tunggu 3 detik setelah perubahan terakhir sebelum sync
const SYNC_STATUS_KEY = 'EBA_LAST_SYNC'; // localStorage key untuk status sync terakhir

// ============================================================
// INTERNAL STATE
// ============================================================
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isSyncing = false;
let pendingSync = false;

// Callback untuk mendapatkan data terbaru dari App state
type DataGetter = () => {
  projects: any[];
  materials: any[];
  employees: any[];
  attendance: any[];
  kasbons: any[];
  overtimes: any[];
  otherExpenses: any[];
  photos: any[];
};

// Callback untuk update sync status di UI
type StatusCallback = (status: 'idle' | 'syncing' | 'success' | 'error', message?: string) => void;

let registeredDataGetter: DataGetter | null = null;
let registeredStatusCallback: StatusCallback | null = null;

// ============================================================
// REGISTRATION (dipanggil sekali di App.tsx useEffect)
// ============================================================
export const registerAutoSync = (
  dataGetter: DataGetter,
  statusCallback?: StatusCallback
) => {
  registeredDataGetter = dataGetter;
  registeredStatusCallback = statusCallback || null;
};

export const unregisterAutoSync = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  registeredDataGetter = null;
  registeredStatusCallback = null;
};

// ============================================================
// CORE: Trigger auto-sync (dipanggil setiap CRUD)
// ============================================================
export const triggerAutoSync = () => {
  const gasUrl = getGasUrl();

  // Skip jika GAS URL belum dikonfigurasi
  if (!gasUrl) return;

  // Skip jika offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  // Reset debounce timer — tunggu sampai user selesai batch operasi
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    executeSync();
  }, DEBOUNCE_MS);
};

// ============================================================
// EXECUTE SYNC
// ============================================================
const executeSync = async () => {
  if (!registeredDataGetter) return;

  const gasUrl = getGasUrl();
  if (!gasUrl) return;

  // Kalau sedang sync, tandai ada pending
  if (isSyncing) {
    pendingSync = true;
    return;
  }

  isSyncing = true;
  registeredStatusCallback?.('syncing', 'Menyinkronkan...');

  try {
    const currentData = registeredDataGetter();
    const payload = {
      lastUpdated: Date.now(),
      ...currentData,
    };

    await syncDatabaseViaGas(gasUrl, 'put', payload);

    // Simpan timestamp sync terakhir
    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify({
      timestamp: Date.now(),
      status: 'success',
    }));

    registeredStatusCallback?.('success', 'Tersinkronkan');

    // Auto-reset status ke idle setelah 3 detik
    setTimeout(() => {
      registeredStatusCallback?.('idle');
    }, 3000);

  } catch (err: any) {
    console.error('[AutoSync] Gagal sync:', err.message);
    registeredStatusCallback?.('error', 'Gagal sync: ' + (err.message || 'Unknown error'));

    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify({
      timestamp: Date.now(),
      status: 'error',
      error: err.message,
    }));
  } finally {
    isSyncing = false;

    // Kalau ada pending sync (perubahan baru saat sedang sync), jalankan lagi
    if (pendingSync) {
      pendingSync = false;
      setTimeout(() => executeSync(), 1000);
    }
  }
};

// ============================================================
// HELPER: Cek kapan terakhir sync berhasil
// ============================================================
export const getLastSyncInfo = (): { timestamp: number; status: string; error?: string } | null => {
  try {
    const raw = localStorage.getItem(SYNC_STATUS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { }
  return null;
};
