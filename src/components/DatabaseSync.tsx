import React, { useState, useEffect } from 'react';
import { Cloud, ArrowUp, ArrowDown, Settings, CheckCircle, AlertCircle, Loader2, Database, HelpCircle, Copy, Check, FileSpreadsheet } from 'lucide-react';
import { Language, UserRole } from '../types';
import { getGasUrl, setGasUrl, syncDatabaseViaGas, exportToSheetsViaGas } from '../utils/googleDrive';

interface DatabaseSyncProps {
  onDataRestore: (restoredData: any) => void;
  onDataBackup: () => any;
  lang: Language;
  role: UserRole;
  isOffline: boolean;
}

export const DatabaseSync: React.FC<DatabaseSyncProps> = ({
  onDataRestore,
  onDataBackup,
  lang,
  role,
  isOffline
}) => {
  const [gasUrlState, setGasUrlState] = useState<string>('');
  const [isEditingUrl, setIsEditingUrl] = useState<boolean>(false);
  const [gasInput, setGasInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [exportingSheets, setExportingSheets] = useState<boolean>(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  
  // Cloud metadata after pull
  const [cloudDbInfo, setCloudDbInfo] = useState<{
    lastUpdated?: number;
    projectCount: number;
    employeeCount: number;
    attendanceCount: number;
    photosCount: number;
    rawData?: any;
  } | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    const url = getGasUrl() || '';
    setGasUrlState(url);
    setGasInput(url);
    if (!url) {
      setIsEditingUrl(true);
    }
  }, []);

  const handleSaveGasUrl = (e: React.FormEvent) => {
    e.preventDefault();
    let url = gasInput.trim();
    if (!url) {
      alert(lang === 'id' ? 'Silakan masukkan URL Google Apps Script Web App atau Deployment ID yang valid.' : 'Please enter a valid Google Apps Script Web App URL or Deployment ID.');
      return;
    }
    
    // Auto-convert raw deployment ID into full Web App URL
    if (!url.startsWith('http') && url.length > 25) {
      url = `https://script.google.com/macros/s/${url}/exec`;
    }

    if (!url.startsWith('https://script.google.com/')) {
      alert(lang === 'id' ? 'URL tidak valid. Harus diawali dengan https://script.google.com/...' : 'Invalid URL. Must start with https://script.google.com/...');
      return;
    }

    const isEditorUrl = url.includes('/edit') || url.includes('/home') || url.includes('/d/');
    const isMissingExec = !url.includes('/exec');
    
    if (isEditorUrl || isMissingExec) {
      const errorMsg = lang === 'id' 
        ? `⚠️ URL YANG ANDA MASUKKAN SALAH!\n\nAnda memasukkan URL Halaman Editor Script (tempat mengetik kode). URL ini TIDAK BISA digunakan oleh aplikasi.\n\nCara mendapatkan URL yang BENAR:\n1. Di editor Google Apps Script Anda, klik tombol biru 'Deploy' di kanan atas.\n2. Pilih 'New deployment'.\n3. Pastikan pengaturannya:\n   - Select type: Web app\n   - Execute as: Me (Email Anda)\n   - Who has access: Anyone (Siapa saja - wajib agar bisa diakses dari aplikasi tanpa login Google)\n4. Klik 'Deploy'.\n5. Salin URL di bawah tulisan 'Web app' (yang berakhiran dengan '/exec').\n6. Tempel (Paste) URL tersebut di sini!`
        : `⚠️ INVALID URL DETECTED!\n\nYou entered the Script Editor URL (where you write code). This URL CANNOT be used by the application.\n\nHow to get the CORRECT Web App URL:\n1. In your Apps Script editor, click the blue 'Deploy' button in the top right.\n2. Select 'New deployment'.\n3. Set configurations:\n   - Select type: Web app\n   - Execute as: Me (Your email)\n   - Who has access: Anyone (Mandatory so the app can sync data)\n4. Click 'Deploy'.\n5. Copy the URL under the 'Web app' section (which ends with '/exec').\n6. Paste that URL here!`;
      
      alert(errorMsg);
      return;
    }

    setGasUrl(url);
    setGasUrlState(url);
    setIsEditingUrl(false);
    setStatus({
      type: 'success',
      message: lang === 'id' ? 'URL Apps Script berhasil disimpan!' : 'Apps Script URL saved successfully!'
    });
  };

  const handlePushDatabase = async () => {
    if (!gasUrlState) {
      setStatus({
        type: 'error',
        message: lang === 'id' ? 'Silakan konfigurasi URL Google Apps Script terlebih dahulu.' : 'Please configure your Google Apps Script URL first.'
      });
      return;
    }
    if (isOffline) {
      setStatus({
        type: 'error',
        message: lang === 'id' ? 'Tidak dapat mengunggah saat offline. Matikan Mode Offline.' : 'Cannot upload database while offline. Disable Offline Mode.'
      });
      return;
    }

    setLoading(true);
    setStatus({
      type: null,
      message: lang === 'id' ? 'Mengunggah data ke Google Drive...' : 'Pushing local database to Google Drive...'
    });

    try {
      const currentDb = onDataBackup();
      const payload = {
        lastUpdated: Date.now(),
        ...currentDb
      };

      await syncDatabaseViaGas(gasUrlState, 'put', payload);
      setStatus({
        type: 'success',
        message: lang === 'id' 
          ? 'Sinkronisasi Berhasil! Database teks telah dicadangkan ke Google Drive Anda.' 
          : 'Sync Complete! Your text database has been successfully backed up to Google Drive.'
      });
    } catch (err: any) {
      console.error(err);
      const isFailedToFetch = err.message && (
        err.message.toLowerCase().includes('failed to fetch') || 
        err.message.toLowerCase().includes('network') ||
        err.message.toLowerCase().includes('load failed')
      );
      
      let errorMsg = err.message;
      if (isFailedToFetch) {
        errorMsg = lang === 'id'
          ? 'Gagal Terhubung (Failed to Fetch). Pastikan: 1. URL Web App Apps Script sudah benar. 2. Opsi "Who has access" di setelan penerapan (Deploy) wajib diatur ke "Anyone" (Siapa saja) agar dapat diakses dari aplikasi tanpa login Google. 3. Anda sudah klik "Deploy" -> "New version" jika ada perubahan kode.'
          : 'Failed to Connect (Failed to Fetch). Ensure: 1. The Apps Script Web App URL is correct. 2. The "Who has access" setting in your deployment MUST be configured to "Anyone" so it can accept public requests. 3. You deployed a "New version" after changing the script code.';
      }

      setStatus({
        type: 'error',
        message: lang === 'id' 
          ? `Gagal sinkronisasi ke cloud: ${errorMsg}` 
          : `Cloud push failed: ${errorMsg}`
      });
    } finally {
      setLoading(false);
    }
  };

  // Export ke Google Sheets — TERPISAH dari sync harian (sync_db),
  // supaya sync data (JSON ke Drive) tetap cepat setiap kali ada perubahan.
  // Sheets hanya diupdate saat tombol ini ditekan (atau via trigger terjadwal di GAS).
  const handleExportSheets = async () => {
    if (!gasUrlState) {
      setStatus({
        type: 'error',
        message: lang === 'id' ? 'Silakan konfigurasi URL Google Apps Script terlebih dahulu.' : 'Please configure your Google Apps Script URL first.'
      });
      return;
    }
    if (isOffline) {
      setStatus({
        type: 'error',
        message: lang === 'id' ? 'Tidak dapat export saat offline.' : 'Cannot export while offline.'
      });
      return;
    }

    setExportingSheets(true);
    setStatus({
      type: null,
      message: lang === 'id' ? 'Mengupdate Google Sheets...' : 'Updating Google Sheets...'
    });

    try {
      await exportToSheetsViaGas(gasUrlState);
      setStatus({
        type: 'success',
        message: lang === 'id' ? 'Google Sheets berhasil diupdate!' : 'Google Sheets updated successfully!'
      });
    } catch (err: any) {
      setStatus({
        type: 'error',
        message: lang === 'id' 
          ? `Gagal export ke Sheets: ${err.message}` 
          : `Sheets export failed: ${err.message}`
      });
    } finally {
      setExportingSheets(false);
    }
  };

  const handlePullDatabase = async () => {
    if (!gasUrlState) {
      setStatus({
        type: 'error',
        message: lang === 'id' ? 'Silakan konfigurasi URL Google Apps Script terlebih dahulu.' : 'Please configure your Google Apps Script URL first.'
      });
      return;
    }
    if (isOffline) {
      setStatus({
        type: 'error',
        message: lang === 'id' ? 'Tidak dapat sinkronisasi saat offline. Matikan Mode Offline.' : 'Cannot sync while offline. Disable Offline Mode.'
      });
      return;
    }

    setLoading(true);
    setCloudDbInfo(null);
    setStatus({
      type: null,
      message: lang === 'id' ? 'Memeriksa database di Google Drive...' : 'Fetching database file from Google Drive...'
    });

    try {
      const res = await syncDatabaseViaGas(gasUrlState, 'get');
      if (res.found && res.db) {
        const db = res.db;
        setCloudDbInfo({
          lastUpdated: db.lastUpdated,
          projectCount: db.projects?.length || 0,
          employeeCount: db.employees?.length || 0,
          attendanceCount: db.attendance?.length || 0,
          photosCount: db.photos?.length || 0,
          rawData: db
        });
        setStatus({
          type: 'success',
          message: lang === 'id' 
            ? 'Data ditemukan! Silakan tinjau ringkasan di bawah dan klik "Terapkan" untuk sinkronisasi ke handphone ini.' 
            : 'Backup database found! Review the summary below and click "Apply Data" to sync to this device.'
        });
      } else {
        setStatus({
          type: 'error',
          message: lang === 'id' 
            ? 'Tidak ada file backup database di Google Drive Anda. Silakan klik "Kirim Data ke Cloud" dari perangkat utama terlebih dahulu.' 
            : 'No backup database file found on your Google Drive. Please click "Push Data to Cloud" on your primary device first.'
        });
      }
    } catch (err: any) {
      console.error(err);
      const isFailedToFetch = err.message && (
        err.message.toLowerCase().includes('failed to fetch') || 
        err.message.toLowerCase().includes('network') ||
        err.message.toLowerCase().includes('load failed')
      );
      
      let errorMsg = err.message;
      if (isFailedToFetch) {
        errorMsg = lang === 'id'
          ? 'Gagal Terhubung (Failed to Fetch). Pastikan: 1. URL Web App Apps Script sudah benar. 2. Opsi "Who has access" di setelan penerapan (Deploy) wajib diatur ke "Anyone" (Siapa saja) agar dapat diakses dari aplikasi tanpa login Google. 3. Anda sudah klik "Deploy" -> "New version" jika ada perubahan kode.'
          : 'Failed to Connect (Failed to Fetch). Ensure: 1. The Apps Script Web App URL is correct. 2. The "Who has access" setting in your deployment MUST be configured to "Anyone" so it can accept public requests. 3. You deployed a "New version" after changing the script code.';
      }

      setStatus({
        type: 'error',
        message: lang === 'id' 
          ? `Gagal memeriksa database cloud: ${errorMsg}` 
          : `Failed to fetch cloud database: ${errorMsg}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyData = () => {
    if (!cloudDbInfo || !cloudDbInfo.rawData) return;
    
    const confirmApply = window.confirm(
      lang === 'id'
        ? '⚠️ PERINGATAN: Menerapkan data cloud akan menimpa semua data lokal di HP ini. Lanjutkan?'
        : '⚠️ WARNING: Applying cloud data will overwrite all local data on this phone. Proceed?'
    );

    if (confirmApply) {
      onDataRestore(cloudDbInfo.rawData);
      setCloudDbInfo(null);
      setStatus({
        type: 'success',
        message: lang === 'id' 
          ? '🎉 Selamat! Database di HP ini berhasil disinkronkan dengan Google Drive.' 
          : '🎉 Congratulations! This device database is now fully in sync with Google Drive.'
      });
    }
  };

  const handleCopyCodeGs = () => {
    const code = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // === DELETE FILE ===
    if (data.action === 'delete') {
      DriveApp.getFileById(data.fileId).setTrashed(true);
      return resp_({ success: true });
    }

    // === SYNC DATABASE (CEPAT -- hanya tulis JSON ke Drive) ===
    if (data.action === 'sync_db') {
      var folder = folder_();
      var fn = "eba_project_db.json";
      var files = folder.getFilesByName(fn);

      if (data.type === 'get') {
        if (files.hasNext()) {
          var c = files.next().getBlob().getDataAsString();
          return resp_({ success: true, found: true, db: JSON.parse(c) });
        }
        return resp_({ success: true, found: false });
      }

      if (data.type === 'put') {
        var json = JSON.stringify(data.db, null, 2);
        if (files.hasNext()) { files.next().setContent(json); }
        else { folder.createFile(fn, json, "application/json"); }

        // TIDAK export ke Sheets di sini -- supaya sync tetap cepat.
        // Sheets di-update via action 'export_sheets' (manual) atau trigger terjadwal.
        return resp_({ success: true, message: 'Synced to Drive (fast path)' });
      }
    }

    // === EXPORT KE SHEETS -- dipanggil terpisah (manual/terjadwal), bukan tiap sync ===
    if (data.action === 'export_sheets') {
      var folder = folder_();
      var fn = "eba_project_db.json";
      var files = folder.getFilesByName(fn);
      if (!files.hasNext()) {
        return resp_({ success: false, error: 'Belum ada data untuk di-export' });
      }
      var db = JSON.parse(files.next().getBlob().getDataAsString());
      exportToSheets_(db, folder);
      return resp_({ success: true, message: 'Sheets berhasil diupdate' });
    }

    // === UPLOAD PHOTO ===
    var b64 = data.image;
    if (b64.indexOf(",") > -1) b64 = b64.split(",")[1];
    var blob = Utilities.newBlob(Utilities.base64Decode(b64), "image/jpeg", data.filename);
    var folder = folder_();
    var file = folder.createFile(blob);
    file.setDescription("EBA upload by " + (data.userRole || "unknown"));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var result = { success: true, fileId: file.getId(), webViewLink: file.getUrl() };

    if (data.photoMeta) {
      try {
        var dbFn = "eba_project_db.json";
        var dbFiles = folder.getFilesByName(dbFn);
        if (dbFiles.hasNext()) {
          var dbFile = dbFiles.next();
          var db = JSON.parse(dbFile.getBlob().getDataAsString());
          if (!db.photos) db.photos = [];

          var exists = false;
          for (var i = 0; i < db.photos.length; i++) {
            if (db.photos[i].id === data.photoMeta.id) { exists = true; break; }
          }

          if (!exists) {
            db.photos.unshift({
              id: data.photoMeta.id,
              projectId: data.photoMeta.projectId || "",
              projectName: data.photoMeta.projectName || "",
              date: data.photoMeta.date || "",
              time: data.photoMeta.time || "",
              notes: data.photoMeta.notes || "",
              images: [file.getUrl()],
              gpsLocation: data.photoMeta.gpsLocation || "",
              watermarked: true,
              driveUrls: [file.getUrl()],
              roomName: data.photoMeta.roomName || ""
            });
            db.lastUpdated = Date.now();
            dbFile.setContent(JSON.stringify(db, null, 2));
          }
        }
      } catch(ex) { /* photo metadata sync failed, photo still uploaded */ }
    }

    return resp_(result);
  } catch (error) {
    return resp_({ success: false, error: error.toString() });
  }
}

function doGet(e) {
  return resp_({ success: true, message: "EBA API aktif (fast sync mode)" });
}

function scheduledExportToSheets() {
  var folder = folder_();
  var files = folder.getFilesByName("eba_project_db.json");
  if (!files.hasNext()) return;
  var db = JSON.parse(files.next().getBlob().getDataAsString());
  exportToSheets_(db, folder);
}

function exportToSheets_(db, folder) {
  var ss;
  var ssFiles = folder.getFilesByName("EBA Contractor Database");
  if (ssFiles.hasNext()) {
    ss = SpreadsheetApp.open(ssFiles.next());
  } else {
    ss = SpreadsheetApp.create("EBA Contractor Database");
    var f = DriveApp.getFileById(ss.getId());
    folder.addFile(f);
    DriveApp.getRootFolder().removeFile(f);
  }

  var upd = function(name, headers, rows) {
    var sh = ss.getSheetByName(name);
    if (sh) { sh.clear(); } else { sh = ss.insertSheet(name); }
    sh.appendRow(headers);
    if (rows && rows.length > 0) {
      sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    sh.getRange(1, 1, 1, headers.length).setBackground("#ea580c").setFontColor("#fff").setFontWeight("bold");
    sh.setFrozenRows(1);
    for (var c = 1; c <= headers.length; c++) sh.autoResizeColumn(c);
  };

  upd("Projects", ["ID", "Nama", "Budget", "Mulai", "Selesai"],
    (db.projects || []).map(function(p) {
      return [p.id||"", p.name||"", p.budget||0, p.startDate||"", p.endDate||""];
    })
  );

  var invRows = [];
  (db.projects || []).forEach(function(p) {
    (p.invoices || []).forEach(function(inv) {
      invRows.push([inv.id||"", p.id||"", inv.invoiceNumber||"", inv.amount||0, inv.dueDate||"", inv.isPaid?"YA":"TIDAK", inv.title||""]);
    });
  });
  upd("Invoices", ["ID", "Project ID", "No Invoice", "Jumlah", "Jatuh Tempo", "Lunas", "Judul"], invRows);

  upd("Employees", ["ID", "Nama", "Role", "Gaji Harian"],
    (db.employees || []).map(function(e) {
      return [e.id||"", e.name||"", e.role||"", e.dailySalary||e.dailyRate||0];
    })
  );

  upd("Attendance", ["ID", "Tanggal", "Employee ID", "Nama", "Status", "Catatan", "Project ID", "Nama Proyek"],
    (db.attendance || []).map(function(a) {
      return [a.id||"", a.date||"", a.employeeId||"", a.employeeName||"", a.status||"", a.note||"", a.projectId||"", a.projectName||""];
    })
  );

  upd("Materials", ["ID", "Project ID", "Nama Proyek", "Tanggal", "Tipe", "Barang", "Qty", "Satuan", "Harga/Unit", "Total", "Catatan"],
    (db.materials || []).map(function(m) {
      return [m.id||"", m.projectId||"", m.projectName||"", m.date||"", m.type||"", m.itemName||"", m.quantity||0, m.unit||"", m.pricePerUnit||0, m.totalPrice||0, m.note||""];
    })
  );

  upd("Kasbons", ["ID", "Tanggal", "Employee ID", "Nama", "Jumlah", "Catatan"],
    (db.kasbons || []).map(function(k) {
      return [k.id||"", k.date||"", k.employeeId||"", k.employeeName||"", k.amount||0, k.note||""];
    })
  );

  upd("Overtimes", ["ID", "Tanggal", "Employee ID", "Nama", "Jam", "Rate/Jam", "Total", "Catatan", "Project ID", "Nama Proyek"],
    (db.overtimes || []).map(function(o) {
      return [o.id||"", o.date||"", o.employeeId||"", o.employeeName||"", o.hours||0, o.hourlyRate||0, o.totalAmount||0, o.note||"", o.projectId||"", o.projectName||""];
    })
  );

  upd("OtherExpenses", ["ID", "Project ID", "Nama Proyek", "Tanggal", "Kategori", "Jumlah", "Catatan"],
    (db.otherExpenses || []).map(function(x) {
      return [x.id||"", x.projectId||"", x.projectName||"", x.date||"", x.category||"", x.amount||0, x.note||""];
    })
  );

  upd("Photos", ["ID", "Project ID", "Nama Proyek", "Tanggal", "Waktu", "Catatan", "GPS", "Ruangan", "Drive URLs"],
    (db.photos || []).map(function(p) {
      return [p.id||"", p.projectId||"", p.projectName||"", p.date||"", p.time||"", p.notes||"", p.gpsLocation||"", p.roomName||"", (p.driveUrls||[]).join(", ")];
    })
  );

  var def = ss.getSheetByName("Sheet1") || ss.getSheetByName("Sheet 1");
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);

  var old = ss.getSheetByName("Progress Photos");
  if (old && ss.getSheets().length > 1) {
    try { ss.deleteSheet(old); } catch(e) {}
  }
}

function folder_() {
  var props = PropertiesService.getScriptProperties();
  var cachedId = props.getProperty('EBA_FOLDER_ID');
  if (cachedId) {
    try { return DriveApp.getFolderById(cachedId); } catch (e) {}
  }
  var f = DriveApp.getFoldersByName("EBA Progress Photos");
  var folder = f.hasNext() ? f.next() : DriveApp.createFolder("EBA Progress Photos");
  props.setProperty('EBA_FOLDER_ID', folder.getId());
  return folder;
}

function resp_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}`;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (role === 'tamu') {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-5" id="gas-db-sync-card">
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 flex items-center justify-center shadow-inner">
          <Cloud size={20} className="stroke-[2.2]" />
        </div>
        <div>
          <h3 className="font-sans font-extrabold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
            {lang === 'id' ? 'Sinkronisasi Database Teks (Awan)' : 'Text Database Cloud Sync'}
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {lang === 'id' 
              ? 'Sinkronisasikan seluruh projects, karyawan, dan laporan absensi antar-perangkat via Google Drive' 
              : 'Synchronize projects, staff, and attendance logs across all devices via Google Drive'}
          </p>
        </div>
      </div>

      {/* GAS URL Configuration - Only visible to Admin */}
      {role === 'admin' && (
        <div className="p-4 bg-gray-50 dark:bg-gray-950/40 rounded-xl border border-gray-150 dark:border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Settings size={12} className="text-orange-500" />
              {lang === 'id' ? 'Konfigurasi Google Apps Script (GAS)' : 'Google Apps Script Configuration'}
            </span>
            {gasUrlState && !isEditingUrl && (
              <button
                onClick={() => setIsEditingUrl(true)}
                className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
              >
                {lang === 'id' ? 'Ubah URL' : 'Change URL'}
              </button>
            )}
          </div>

          {isEditingUrl ? (
            <form onSubmit={handleSaveGasUrl} className="flex gap-2">
              <input
                type="text"
                value={gasInput}
                onChange={(e) => setGasInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3 py-2 text-xs border rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
              >
                {lang === 'id' ? 'Simpan' : 'Save'}
              </button>
            </form>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-150 dark:border-gray-800 gap-4">
                <span className={`text-xs font-mono truncate flex-1 ${
                  (gasUrlState.includes('/edit') || gasUrlState.includes('/home') || gasUrlState.includes('/d/') || !gasUrlState.includes('/exec'))
                    ? 'text-red-500 font-bold'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {gasUrlState}
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md shrink-0 ${
                  (gasUrlState.includes('/edit') || gasUrlState.includes('/home') || gasUrlState.includes('/d/') || !gasUrlState.includes('/exec'))
                    ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                }`}>
                  {(gasUrlState.includes('/edit') || gasUrlState.includes('/home') || gasUrlState.includes('/d/') || !gasUrlState.includes('/exec'))
                    ? (lang === 'id' ? 'Salah!' : 'Error!')
                    : (lang === 'id' ? 'Aktif' : 'Active')}
                </span>
              </div>
              
              {(gasUrlState.includes('/edit') || gasUrlState.includes('/home') || gasUrlState.includes('/d/') || !gasUrlState.includes('/exec')) && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-lg text-[11px] text-red-700 dark:text-red-400 space-y-1">
                  <p className="font-bold">
                    {lang === 'id' 
                      ? '⚠️ URL Anda Salah (URL Editor Terdeteksi)' 
                      : '⚠️ Wrong URL (Editor URL Detected)'}
                  </p>
                  <p className="leading-relaxed text-[10px]">
                    {lang === 'id'
                      ? 'Anda menyimpan URL halaman edit script, bukan URL Web App (/exec). Silakan klik "Ubah URL" di kanan atas lalu masukkan URL hasil Deploy (New deployment).'
                      : 'You saved the script editor URL instead of the Web App URL (/exec). Please click "Change URL" in the top right and enter the actual deployed URL.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sync Operations Status and Spinners */}
      {status.message && (
        <div className={`p-3 rounded-xl text-xs flex items-center gap-2.5 border ${
          status.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
            : status.type === 'error'
            ? 'bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-400 border-red-100 dark:border-red-900/30'
            : 'bg-blue-50 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/30 animate-pulse'
        }`}>
          {loading ? (
            <Loader2 size={16} className="animate-spin text-orange-500 shrink-0" />
          ) : status.type === 'success' ? (
            <CheckCircle size={16} className="text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-red-500 shrink-0" />
          )}
          <span className="font-medium leading-relaxed">{status.message}</span>
        </div>
      )}

      {/* Primary Push / Pull Actions */}
      <div className="grid grid-cols-2 gap-3">
        {/* PULL BUTTON */}
        <button
          onClick={handlePullDatabase}
          disabled={loading || isOffline}
          className={`flex items-center justify-center gap-2.5 px-4 py-3 border border-gray-150 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850 text-xs font-bold text-gray-700 dark:text-gray-200 transition-all ${
            loading || isOffline ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'
          }`}
          title="Sinkronisasikan data terbaru dari Google Drive"
        >
          <ArrowDown size={15} className="text-orange-500" />
          <span>{lang === 'id' ? 'Ambil dari Cloud' : 'Pull from Cloud'}</span>
        </button>

        {/* PUSH BUTTON */}
        <button
          onClick={handlePushDatabase}
          disabled={loading || isOffline}
          className={`flex items-center justify-center gap-2.5 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-600/15 transition-all ${
            loading || isOffline ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'
          }`}
          title="Unggah data lokal saat ini sebagai database master"
        >
          <ArrowUp size={15} className="text-orange-50/90" />
          <span>{lang === 'id' ? 'Kirim ke Cloud' : 'Push to Cloud'}</span>
        </button>
      </div>

      {/* Export ke Sheets — terpisah dari sync harian, dipicu manual */}
      <button
        onClick={handleExportSheets}
        disabled={exportingSheets || isOffline}
        className={`w-full flex items-center justify-center gap-2.5 px-4 py-3 border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/10 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-xs font-bold text-emerald-700 dark:text-emerald-400 rounded-xl transition-all ${
          exportingSheets || isOffline ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'
        }`}
        title={lang === 'id' ? 'Update Google Sheets dari data JSON terbaru di Drive (tidak mempengaruhi kecepatan sync harian)' : 'Update Google Sheets from latest JSON data on Drive'}
      >
        {exportingSheets ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <FileSpreadsheet size={15} />
        )}
        <span>{lang === 'id' ? 'Update Google Sheets' : 'Update Google Sheets'}</span>
      </button>

      {/* Cloud DB Info & Overwrite Prompt */}
      {cloudDbInfo && (
        <div className="p-4 bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/35 rounded-2xl space-y-3.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Database size={15} className="text-orange-600" />
            <h4 className="text-xs font-extrabold text-gray-800 dark:text-white uppercase tracking-wide">
              {lang === 'id' ? 'Ringkasan Database Cloud' : 'Cloud Database Summary'}
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-medium text-gray-600 dark:text-gray-300">
            <div className="space-y-1 bg-white dark:bg-gray-900/55 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
              <span className="text-[10px] text-gray-400 block uppercase font-mono">{lang === 'id' ? 'Proyek' : 'Projects'}</span>
              <span className="font-extrabold text-sm text-gray-900 dark:text-white">{cloudDbInfo.projectCount} {lang === 'id' ? 'proyek' : 'items'}</span>
            </div>
            <div className="space-y-1 bg-white dark:bg-gray-900/55 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
              <span className="text-[10px] text-gray-400 block uppercase font-mono">{lang === 'id' ? 'Pegawai' : 'Employees'}</span>
              <span className="font-extrabold text-sm text-gray-900 dark:text-white">{cloudDbInfo.employeeCount} {lang === 'id' ? 'orang' : 'staff'}</span>
            </div>
            <div className="space-y-1 bg-white dark:bg-gray-900/55 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
              <span className="text-[10px] text-gray-400 block uppercase font-mono">{lang === 'id' ? 'Log Absen' : 'Attendance Logs'}</span>
              <span className="font-extrabold text-sm text-gray-900 dark:text-white">{cloudDbInfo.attendanceCount} {lang === 'id' ? 'catatan' : 'logs'}</span>
            </div>
            <div className="space-y-1 bg-white dark:bg-gray-900/55 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
              <span className="text-[10px] text-gray-400 block uppercase font-mono">{lang === 'id' ? 'Foto Progress' : 'Photos'}</span>
              <span className="font-extrabold text-sm text-gray-900 dark:text-white">{cloudDbInfo.photosCount} {lang === 'id' ? 'gambar' : 'photos'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] border-t border-orange-100/60 dark:border-orange-900/30 pt-3">
            <div className="space-y-0.5">
              <span className="text-gray-400 block">{lang === 'id' ? 'Terakhir disinkronkan:' : 'Last modified in cloud:'}</span>
              <span className="font-mono font-bold text-gray-700 dark:text-gray-200">
                {cloudDbInfo.lastUpdated ? new Date(cloudDbInfo.lastUpdated).toLocaleString('id-ID') : '-'}
              </span>
            </div>
            <button
              onClick={handleApplyData}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-emerald-600/15 cursor-pointer"
            >
              {lang === 'id' ? 'Terapkan Data' : 'Apply Data'}
            </button>
          </div>
        </div>
      )}

      {/* Apps Script Guide - Only visible to Admin */}
      {role === 'admin' && (
        <div className="p-4 bg-gray-50 dark:bg-gray-950/20 rounded-2xl border border-gray-150 dark:border-gray-800 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
            <HelpCircle size={15} className="text-orange-500" />
            <span>{lang === 'id' ? 'Panduan Integrasi Google Apps Script (GAS)' : 'Google Apps Script (GAS) Integration Guide'}</span>
          </div>
          <ul className="text-[11px] text-gray-500 dark:text-gray-400 space-y-1.5 list-disc pl-4 leading-relaxed">
            <li>
              {lang === 'id' 
                ? 'Kode sekarang HANYA SATU FILE (Code.gs) — tidak perlu file setup.gs terpisah lagi.' 
                : 'The code is now a SINGLE FILE (Code.gs) — no separate setup.gs file needed anymore.'}
            </li>
            <li className="text-orange-600 dark:text-orange-400 font-semibold">
              {lang === 'id'
                ? '\u26a0\ufe0f PENTING: Setiap kali mengubah atau menambah kode, Anda WAJIB membuat Versi Baru! Caranya: Klik "Deploy" -> "Manage deployments" -> klik ikon Pensil (Edit) -> pilih "New version" di bagian Version, lalu klik "Deploy"!'
                : '\u26a0\ufe0f IMPORTANT: Whenever you modify or add code, you MUST create a New Version! How: Click "Deploy" -> "Manage deployments" -> click Pencil icon (Edit) -> choose "New version" under Version, then click "Deploy"!'}
            </li>
          </ul>

          <div className="pt-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase block tracking-wide mb-1.5">
              {lang === 'id' ? 'File Utama (Code.gs) \u2014 versi terbaru' : 'Main File (Code.gs) \u2014 latest version'}
            </span>
            <button
              onClick={handleCopyCodeGs}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-[11px] font-bold text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              {copiedCode ? (
                <>
                  <Check size={13} className="text-emerald-500" />
                  <span className="text-emerald-600 font-bold">{lang === 'id' ? 'Disalin!' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>{lang === 'id' ? 'Salin Code.gs' : 'Copy Code.gs'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
