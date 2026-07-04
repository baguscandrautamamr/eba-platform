import React, { useState, useEffect } from 'react';
import { Cloud, ArrowUp, ArrowDown, Settings, CheckCircle, AlertCircle, Loader2, Database, HelpCircle, Copy, Check } from 'lucide-react';
import { Language, UserRole } from '../types';
import { getGasUrl, setGasUrl, syncDatabaseViaGas } from '../utils/googleDrive';

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

  const [copied, setCopied] = useState(false);

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
      setStatus({
        type: 'error',
        message: lang === 'id' 
          ? `Gagal sinkronisasi ke cloud: ${err.message || 'Cek koneksi internet & URL GAS Anda'}` 
          : `Cloud push failed: ${err.message || 'Check your internet connection & GAS URL'}`
      });
    } finally {
      setLoading(false);
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
      setStatus({
        type: 'error',
        message: lang === 'id' 
          ? `Gagal memeriksa database cloud: ${err.message || 'Periksa koneksi atau URL Apps Script Anda'}` 
          : `Failed to fetch cloud database: ${err.message || 'Check connection or Apps Script URL'}`
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

  const handleCopyGasCode = () => {
    const code = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    // Support delete action
    if (data.action === 'delete') {
      var fileId = data.fileId;
      if (!fileId) {
        throw new Error('fileId is required for delete action');
      }
      var file = DriveApp.getFileById(fileId);
      file.setTrashed(true);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'File moved to trash' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Support Database Sync Action (JSON file storage in Google Drive)
    if (data.action === 'sync_db') {
      var folder;
      var folders = DriveApp.getFoldersByName("EBA Progress Photos");
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder("EBA Progress Photos");
      }
      
      var fileName = "eba_project_db.json";
      var files = folder.getFilesByName(fileName);
      var dbFile;
      
      if (data.type === 'get') {
        if (files.hasNext()) {
          dbFile = files.next();
          var content = dbFile.getAs("MIME_JSON").getDataAsString();
          return ContentService.createTextOutput(JSON.stringify({ success: true, found: true, db: JSON.parse(content) }))
            .setMimeType(ContentService.MimeType.JSON);
        } else {
          return ContentService.createTextOutput(JSON.stringify({ success: true, found: false, message: 'No backup file found' }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      } else if (data.type === 'put') {
        var jsonString = JSON.stringify(data.db, null, 2);
        if (files.hasNext()) {
          dbFile = files.next();
          dbFile.setContent(jsonString);
        } else {
          dbFile = folder.createFile(fileName, jsonString, "application/json");
        }
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Database synced successfully' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    var base64Data = data.image;
    if (base64Data.indexOf(",") > -1) {
      base64Data = base64Data.split(",")[1];
    }
    
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, 'image/jpeg', data.filename);
    
    var folder;
    var folders = DriveApp.getFoldersByName("EBA Progress Photos");
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder("EBA Progress Photos");
    }
    
    var file = folder.createFile(blob);
    file.setDescription("Uploaded from EBA Contractor Platform by " + (data.userRole || "unknown"));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var result = {
      success: true,
      fileId: file.getId(),
      webViewLink: file.getUrl()
    };
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    var result = {
      success: false,
      error: error.toString()
    };
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <div className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-150 dark:border-gray-800 gap-4">
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate flex-1">
                {gasUrlState}
              </span>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 text-[10px] font-bold rounded-md shrink-0">
                {lang === 'id' ? 'Aktif' : 'Active'}
              </span>
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
        <div className="p-4 bg-gray-50 dark:bg-gray-950/20 rounded-2xl border border-gray-150 dark:border-gray-800 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
            <HelpCircle size={15} className="text-orange-500" />
            <span>{lang === 'id' ? 'Bagaimana cara kerjanya?' : 'How does this work?'}</span>
          </div>
          <ul className="text-[11px] text-gray-500 dark:text-gray-400 space-y-1.5 list-disc pl-4 leading-relaxed">
            <li>
              {lang === 'id' 
                ? 'Sinkronisasi ini menggunakan Google Apps Script yang berjalan langsung di akun Google Drive Anda.' 
                : 'This sync runs via Google Apps Script deployed directly on your own Google Drive account.'}
            </li>
            <li>
              {lang === 'id' 
                ? 'Sepenuhnya GRATIS tanpa biaya database cloud pihak ketiga dan aman karena data disimpan di Drive pribadi Anda.' 
                : 'Completely FREE without expensive database hosting fees, storing data safely in your own Drive.'}
            </li>
            <li>
              {lang === 'id' 
                ? 'Jika Anda belum menginstalnya atau ingin memperbarui kode GAS Anda, silakan klik tombol di bawah untuk menyalin kode terbaru.' 
                : 'If you have not set it up or need to upgrade, copy the required Google Apps Script code below.'}
            </li>
          </ul>

          <button
            onClick={handleCopyGasCode}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-[11px] font-bold text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-500" />
                <span className="text-emerald-600 font-bold">{lang === 'id' ? 'Kode Berhasil Disalin!' : 'Code Copied!'}</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>{lang === 'id' ? 'Salin Kode GAS Terbaru' : 'Copy Latest GAS Code'}</span>
              </>
            )}
          </button>
        </div>
      )}

    </div>
  );
};
