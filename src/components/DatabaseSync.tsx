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
  const [copiedSetup, setCopiedSetup] = useState(false);

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
          var content = dbFile.getBlob().getDataAsString();
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
        
        // --- GOOGLE SHEETS AUTOMATIC EXPORT ---
        // This function is declared in setup.gs
        try {
          if (typeof exportDatabaseToSheets === 'function') {
            exportDatabaseToSheets(data.db, folder);
          }
        } catch (sheetError) {
          console.error("Sheet generation error: " + sheetError.toString());
        }
        
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Database synced successfully and spreadsheet generated' }))
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
    
    var webViewLink = file.getUrl();
    var result = {
      success: true,
      fileId: file.getId(),
      webViewLink: webViewLink
    };
    
    // --- AUTOMATIC PHOTO METADATA SYNC INTO EBA_PROJECT_DB.JSON ---
    if (data.photoMeta) {
      try {
        var fileName = "eba_project_db.json";
        var files = folder.getFilesByName(fileName);
        var dbFile;
        var db = null;
        if (files.hasNext()) {
          dbFile = files.next();
          var content = dbFile.getBlob().getDataAsString();
          db = JSON.parse(content);
        }
        
        if (db) {
          if (!db.photos) {
            db.photos = [];
          }
          
          // Check if photo is already in the list to avoid duplicate
          var exists = false;
          for (var i = 0; i < db.photos.length; i++) {
            if (db.photos[i].id === data.photoMeta.id) {
              exists = true;
              break;
            }
          }
          
          if (!exists) {
            var newPhoto = {
              id: data.photoMeta.id,
              projectId: data.photoMeta.projectId || "",
              projectName: data.photoMeta.projectName || "",
              date: data.photoMeta.date || "",
              time: data.photoMeta.time || "",
              notes: data.photoMeta.notes || "",
              images: [webViewLink],
              gpsLocation: data.photoMeta.gpsLocation || "",
              watermarked: true,
              driveUrls: [webViewLink]
            };
            db.photos.unshift(newPhoto);
            db.lastUpdated = Date.now();
            
            dbFile.setContent(JSON.stringify(db, null, 2));
            
            // Sync with spreadsheets automatically too!
            if (typeof exportDatabaseToSheets === 'function') {
              exportDatabaseToSheets(db, folder);
            }
          }
        }
      } catch (dbSyncError) {
        console.error("Failed to automatically append photo to db JSON: " + dbSyncError.toString());
      }
    }
    
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
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopySetupGs = () => {
    const code = `/**
 * Automatically syncs the entire backup database JSON into structured sheets in Google Sheets.
 * Place this in a separate file named 'setup.gs' in your Apps Script project.
 */
function exportDatabaseToSheets(db, folder) {
  var ss;
  var ssFiles = folder.getFilesByName("EBA Contractor Database");
  if (ssFiles.hasNext()) {
    ss = SpreadsheetApp.open(ssFiles.next());
  } else {
    ss = SpreadsheetApp.create("EBA Contractor Database");
    var ssFile = DriveApp.getFileById(ss.getId());
    folder.addFile(ssFile);
    DriveApp.getRootFolder().removeFile(ssFile);
  }
  
  // Helper function to overwrite or create sheet tabs
  var updateSheet = function(sheetName, headers, rows) {
    var sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      sheet.clear();
    } else {
      sheet = ss.insertSheet(sheetName);
    }
    sheet.appendRow(headers);
    if (rows && rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    // Format header row
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#ea580c").setFontColor("#ffffff").setFontWeight("bold");
    sheet.setFrozenRows(1);
    for (var col = 1; col <= headers.length; col++) {
      sheet.autoResizeColumn(col);
    }
  };
  
  // 1. Projects Sheet
  var projHeaders = ["Project ID", "Name", "Client", "Location", "Budget", "Spent", "Start Date", "End Date", "Status", "Notes"];
  var projRows = (db.projects || []).map(function(p) {
    return [p.id, p.name, p.client, p.location, p.budget, p.spent || 0, p.startDate, p.endDate, p.status, p.notes || ""];
  });
  updateSheet("Projects", projHeaders, projRows);
  
  // 2. Employees Sheet
  var empHeaders = ["Employee ID", "Name", "Role", "Phone", "Daily Rate", "Status"];
  var empRows = (db.employees || []).map(function(e) {
    return [e.id, e.name, e.role, e.phone, e.dailyRate, e.status];
  });
  updateSheet("Employees", empHeaders, empRows);
  
  // 3. Attendance Sheet
  var attHeaders = ["Log ID", "Date", "Employee Name", "Role", "Status", "Check In Time", "Check Out Time", "Notes"];
  var attRows = (db.attendance || []).map(function(a) {
    return [a.id, a.date, a.employeeName, a.employeeRole || "", a.status, a.checkIn || "", a.checkOut || "", a.notes || ""];
  });
  updateSheet("Attendance", attHeaders, attRows);
  
  // 4. Materials Sheet
  var matHeaders = ["Transaction ID", "Project ID", "Date", "Material Name", "Type", "Qty", "Unit", "Price", "Total", "Supplier", "Logged By"];
  var matRows = (db.materials || []).map(function(m) {
    return [m.id, m.projectId, m.date, m.name, m.type, m.quantity, m.unit, m.price, m.quantity * m.price, m.supplier || "", m.loggedBy || ""];
  });
  updateSheet("Materials", matHeaders, matRows);
  
  // 5. Kasbons Sheet
  var kasHeaders = ["Kasbon ID", "Employee Name", "Date", "Amount", "Status", "Notes"];
  var kasRows = (db.kasbons || []).map(function(k) {
    return [k.id, k.employeeName, k.date, k.amount, k.status, k.notes || ""];
  });
  updateSheet("Kasbons", kasHeaders, kasRows);
  
  // 6. Overtimes Sheet
  var otHeaders = ["Overtime ID", "Employee Name", "Date", "Hours", "Hourly Rate", "Total Pay", "Notes"];
  var otRows = (db.overtimes || []).map(function(o) {
    return [o.id, o.employeeName, o.date, o.hours, o.hourlyRate, o.hours * o.hourlyRate, o.notes || ""];
  });
  updateSheet("Overtimes", otHeaders, otRows);
  
  // 7. Other Expenses Sheet
  var expHeaders = ["Expense ID", "Project ID", "Date", "Category", "Amount", "Description", "Logged By"];
  var expRows = (db.otherExpenses || []).map(function(x) {
    return [x.id, x.projectId, x.date, x.category, x.amount, x.description, x.loggedBy || ""];
  });
  updateSheet("Other Expenses", expHeaders, expRows);
  
  // Delete default Sheet1 if exists
  var defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("Sheet 1");
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }
}`;
    navigator.clipboard.writeText(code);
    setCopiedSetup(true);
    setTimeout(() => setCopiedSetup(false), 2000);
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
                ? 'Pisahkan kode menjadi dua file di editor Apps Script Anda: code.gs (utama) dan setup.gs (untuk otomatisasi Excel).' 
                : 'Separate the script into two files in your Apps Script editor: code.gs (main API) and setup.gs (for Excel automation).'}
            </li>
            <li className="text-orange-600 dark:text-orange-400 font-semibold">
              {lang === 'id'
                ? '⚠️ PENTING: Setiap kali mengubah atau menambah kode, Anda WAJIB membuat Versi Baru! Caranya: Klik "Deploy" -> "Manage deployments" -> klik ikon Pensil (Edit) -> pilih "New version" di bagian Version, lalu klik "Deploy"!'
                : '⚠️ IMPORTANT: Whenever you modify or add code, you MUST create a New Version! How: Click "Deploy" -> "Manage deployments" -> click Pencil icon (Edit) -> choose "New version" under Version, then click "Deploy"!'}
            </li>
          </ul>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1.5">
            {/* COPY CODE.GS BUTTON */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase block tracking-wide">
                1. {lang === 'id' ? 'File Utama' : 'Main File'} (code.gs)
              </span>
              <button
                onClick={handleCopyCodeGs}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-[11px] font-bold text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check size={13} className="text-emerald-500" />
                    <span className="text-emerald-600 font-bold">{lang === 'id' ? 'Disalin!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>{lang === 'id' ? 'Salin code.gs' : 'Copy code.gs'}</span>
                  </>
                )}
              </button>
            </div>

            {/* COPY SETUP.GS BUTTON */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase block tracking-wide">
                2. {lang === 'id' ? 'File Spreadsheet' : 'Excel File'} (setup.gs)
              </span>
              <button
                onClick={handleCopySetupGs}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-[11px] font-bold text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                {copiedSetup ? (
                  <>
                    <Check size={13} className="text-emerald-500" />
                    <span className="text-emerald-600 font-bold">{lang === 'id' ? 'Disalin!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>{lang === 'id' ? 'Salin setup.gs' : 'Copy setup.gs'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
