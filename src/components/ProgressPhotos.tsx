import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Project, ProgressPhoto, Language, UserRole } from '../types';
import { Camera, Image as ImageIcon, MapPin, Loader2, UploadCloud, CheckCircle, WifiOff, RefreshCw, Layers, Edit2, Trash2, Calendar, Printer, Download, Cloud, HardDrive, CloudOff, FolderOpen, Link } from 'lucide-react';
import { 
  initAuth as initGDAuth, 
  googleSignIn as signInGD, 
  googleSignOut as signOutGD, 
  getOrCreateFolder, 
  uploadPhotoToDrive,
  getGasUrl,
  setGasUrl,
  uploadPhotoViaGas,
  deletePhotoFromDrive,
  deletePhotoViaGas,
  extractDriveFileId
} from '../utils/googleDrive';
import { User } from 'firebase/auth';

interface ProgressPhotosProps {
  projects: Project[];
  photos: ProgressPhoto[];
  onAddPhoto: (photo: Omit<ProgressPhoto, 'id' | 'watermarked' | 'driveUrls'>) => void;
  onUpdatePhoto: (photo: ProgressPhoto) => void;
  onDeletePhoto: (id: string | string[]) => void;
  isOffline: boolean;
  offlineQueue: any[];
  onAddOfflineItem: (type: 'photo', payload: any) => void;
  lang: Language;
  role: UserRole;
}

export const ProgressPhotos: React.FC<ProgressPhotosProps> = ({
  projects,
  photos,
  onAddPhoto,
  onUpdatePhoto,
  onDeletePhoto,
  isOffline,
  offlineQueue,
  onAddOfflineItem,
  lang,
  role
}) => {
  // Google Drive Integration State
  const [gdUser, setGdUser] = useState<User | null>(null);
  const [gdToken, setGdToken] = useState<string | null>(null);
  const [autoUpload, setAutoUpload] = useState<boolean>(() => {
    const saved = localStorage.getItem('EBA_GD_AUTO_UPLOAD');
    return saved === null ? true : saved === 'true'; // Default auto upload to true for smooth automated flow!
  });
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Google Apps Script state
  const [gasUrl, setGasUrlState] = useState<string | null>(() => getGasUrl());
  const [gasInput, setGasInput] = useState(() => getGasUrl() || '');
  const [activeSyncMethod, setActiveSyncMethod] = useState<'gas' | 'oauth'>(() => {
    return getGasUrl() ? 'gas' : 'oauth';
  });


  // Initialize auth state listener
  useEffect(() => {
    const unsubscribe = initGDAuth(
      (user, token) => {
        setGdUser(user);
        setGdToken(token);
      },
      () => {
        setGdUser(null);
        setGdToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Editing and Deleting state
  const [editingPhoto, setEditingPhoto] = useState<ProgressPhoto | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter states
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('');
  const [timeRangeFilter, setTimeRangeFilter] = useState<'all' | 'today' | 'week' | 'month' | 'lastMonth' | 'twoMonthsAgo'>('all');

  // Lightbox Detail state
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState<ProgressPhoto | null>(null);

  // Photo selection state
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);

  // Toggle selection
  const toggleSelectPhoto = (phId: string) => {
    setSelectedPhotos(prev => {
      if (prev.includes(phId)) {
        return prev.filter(id => id !== phId);
      } else {
        return [...prev, phId];
      }
    });
  };

  // Delete single photo (handles Google Drive sync)
  const handleDeleteSinglePhoto = async (ph: ProgressPhoto) => {
    // 1. Immediately delete from local/parent state for instant UI response!
    onDeletePhoto(ph.id);
    setActiveLightboxPhoto(null);
    setDeleteConfirmId(null);
    setSelectedPhotos(prev => prev.filter(id => id !== ph.id));

    // 2. Perform Drive deletion in the background asynchronously
    const usingGas = !!gasUrl;
    if (usingGas || gdToken) {
      (async () => {
        if (ph.driveUrls && ph.driveUrls.length > 0) {
          const fileId = extractDriveFileId(ph.driveUrls[0]);
          if (fileId) {
            try {
              if (usingGas) {
                await deletePhotoViaGas(gasUrl, fileId);
              } else if (gdToken) {
                await deletePhotoFromDrive(gdToken, fileId);
              }
            } catch (err) {
              console.error(`Failed to delete file ${fileId} from Drive:`, err);
            }
          }
        }
      })();
    }
  };

  // Delete multiple selected photos (handles Google Drive sync)
  const handleDeleteSelectedPhotos = async () => {
    if (selectedPhotos.length === 0) return;

    const confirmMessage = lang === 'id'
      ? `Apakah Anda yakin ingin menghapus ${selectedPhotos.length} foto terpilih? Tindakan ini akan menghapus foto dari pangkalan data dan juga dari Google Drive (jika ada).`
      : `Are you sure you want to delete ${selectedPhotos.length} selected photo(s)? This will delete them from the local database and Google Drive (if synced).`;

    if (!window.confirm(confirmMessage)) return;

    // 1. Immediately delete from local/parent state for instant UI response!
    const photosToDelete = photos.filter(p => selectedPhotos.includes(p.id));
    onDeletePhoto(selectedPhotos);
    setSelectedPhotos([]);

    // 2. Perform Drive deletion in the background asynchronously
    const usingGas = !!gasUrl;
    if (usingGas || gdToken) {
      (async () => {
        try {
          const deletePromises = photosToDelete.map(async (ph) => {
            if (ph.driveUrls && ph.driveUrls.length > 0) {
              const fileId = extractDriveFileId(ph.driveUrls[0]);
              if (fileId) {
                try {
                  if (usingGas) {
                    await deletePhotoViaGas(gasUrl, fileId);
                  } else if (gdToken) {
                    await deletePhotoFromDrive(gdToken, fileId);
                  }
                } catch (err) {
                  console.error(`Failed to delete file ${fileId} from Drive:`, err);
                }
              }
            }
          });
          await Promise.all(deletePromises);
        } catch (err) {
          console.error('Error in background Drive batch deletion:', err);
        }
      })();
    }
  };

  // Print & Download states
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [customPrintTitle, setCustomPrintTitle] = useState('');
  const [printScope, setPrintScope] = useState<'filtered' | 'all-project'>('filtered');

  // Handler for downloading filtered photos
  const handleDownloadAll = () => {
    if (filteredPhotos.length === 0) return;

    const imagesToDownload: { url: string; filename: string }[] = [];
    
    filteredPhotos.forEach((ph) => {
      ph.images.forEach((img, idx) => {
        const projNameSanitized = ph.projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${projNameSanitized}_${ph.date}_${ph.time.replace(/:/g, '-')}_img${idx + 1}.jpg`;
        imagesToDownload.push({ url: img, filename });
      });
    });

    if (imagesToDownload.length === 0) {
      alert(lang === 'id' ? 'Tidak ada foto untuk diunduh.' : 'No photos to download.');
      return;
    }

    alert(lang === 'id' 
      ? `Mengunduh ${imagesToDownload.length} foto secara berurutan...` 
      : `Downloading ${imagesToDownload.length} photos sequentially...`
    );

    imagesToDownload.forEach((item, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = item.url;
        link.download = item.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 250);
    });
  };

  const handleOpenPrintPreview = () => {
    const activeProject = projects.find(p => p.id === selectedProjectFilter);
    setCustomPrintTitle(activeProject ? activeProject.name : (lang === 'id' ? 'PEKERJAAN PELAKSANAAN PERAWATAN DAN PENGECEKAN POMPA PEMADAM KEBAKARAN/HYDRANT PUMP DI BBPMGB LEMIGAS' : 'PROJECT SITE PROGRESS DOCUMENTATION REPORT'));
    setPrintScope('filtered');
    setShowPrintPreview(true);
  };

  const getPhotosToPrint = () => {
    if (printScope === 'all-project') {
      return photos.filter(ph => !selectedProjectFilter || ph.projectId === selectedProjectFilter);
    }
    return filteredPhotos;
  };

  // Filtered photos helper
  const getFilteredPhotos = () => {
    return photos.filter((ph) => {
      // Filter by project
      if (selectedProjectFilter && ph.projectId !== selectedProjectFilter) return false;
      
      // Filter by specific date
      if (selectedDateFilter && ph.date !== selectedDateFilter) return false;

      // Filter by time range
      if (timeRangeFilter !== 'all') {
        const phDate = new Date(ph.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (timeRangeFilter === 'today') {
          const phDateStr = ph.date; // "YYYY-MM-DD"
          const todayStr = new Date().toISOString().split('T')[0];
          if (phDateStr !== todayStr) return false;
        } else if (timeRangeFilter === 'week') {
          const diffTime = Math.abs(today.getTime() - phDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 7) return false;
        } else if (timeRangeFilter === 'month') {
          const currentMonth = new Date().getMonth();
          const currentYear = new Date().getFullYear();
          if (phDate.getMonth() !== currentMonth || phDate.getFullYear() !== currentYear) return false;
        } else if (timeRangeFilter === 'lastMonth') {
          const lastMonthDate = new Date();
          lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
          if (phDate.getMonth() !== lastMonthDate.getMonth() || phDate.getFullYear() !== lastMonthDate.getFullYear()) return false;
        } else if (timeRangeFilter === 'twoMonthsAgo') {
          const twoMonthsAgoDate = new Date();
          twoMonthsAgoDate.setMonth(twoMonthsAgoDate.getMonth() - 2);
          if (phDate.getMonth() !== twoMonthsAgoDate.getMonth() || phDate.getFullYear() !== twoMonthsAgoDate.getFullYear()) return false;
        }
      }

      return true;
    });
  };

  const filteredPhotos = getFilteredPhotos();

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto) return;
    onUpdatePhoto({
      ...editingPhoto,
      projectName: projects.find(p => p.id === editingPhoto.projectId)?.name || editingPhoto.projectName
    });
    setEditingPhoto(null);
  };

  const [selProjId, setSelProjId] = useState(projects[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [roomName, setRoomName] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [rawFiles, setRawFiles] = useState<string[]>([]); // original unwatermarked base64s
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]); // Base64s of watermarked images
  const [includeGps, setIncludeGps] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  /**
   * Konversi source gambar ke format yang bisa ditampilkan browser.
   * - base64 (data:) → langsung dipakai
   * - URL Google Drive → dikonversi ke format thumbnail yang bisa di-render
   * - URL lain → dipakai apa adanya
   */
  const getDisplayableImageSrc = (src: string | undefined): string => {
    if (!src) return '';
    // base64 langsung dipakai
    if (src.startsWith('data:')) return src;
    // URL Google Drive → konversi ke thumbnail
    if (src.includes('drive.google.com') || src.includes('drivesdk')) {
      const fileId = extractDriveFileId(src);
      if (fileId) {
        // Format thumbnail Drive yang bisa di-render sebagai <img>
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
      }
    }
    return src;
  };

  // Simulated GPS details based on Project
  const getGpsForProject = (projId: string) => {
    if (projId === 'proj_1') return "-6.2088, 106.8456 (Gedung EBA - Jakarta Selatan)";
    if (projId === 'proj_2') return "-6.2736, 106.7248 (Bintaro Jaya Mall - Tangerang)";
    return "-6.1751, 106.8272 (Proyek MEP Central - Jakarta Pusat)";
  };

  // Watermark implementation using canvas
  const processImageAndApplyWatermark = (base64Str: string, projectName: string, gps: string, room: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        // Scale down high-resolution images to a maximum dimension of 1024px to keep size extremely small
        const MAX_DIM = 1024;
        let width = img.width || 800;
        let height = img.height || 600;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64Str);
          return;
        }

        // Draw image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Watermark Box Overlay in bottom-right/left
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        const boxHeight = 85;
        ctx.fillRect(0, canvas.height - boxHeight, canvas.width, boxHeight);

        // Watermark Text styling
        ctx.fillStyle = '#f97316'; // Neon orange
        ctx.font = 'bold 14px "JetBrains Mono", "Fira Code", monospace';
        
        // Project info
        ctx.fillText(`EBA PROJECT: ${projectName.toUpperCase()}`, 20, canvas.height - 55);

        // Date and Time
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0];
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`DOCUMENTED: ${dateStr} @ ${timeStr}`, 20, canvas.height - 35);

        // GPS
        if (includeGps) {
          ctx.fillStyle = '#38bdf8'; // Sky blue GPS text
          ctx.fillText(`GPS: ${gps}`, 20, canvas.height - 15);
        }

        // Room Name Big Yellow Watermark
        if (room && room.trim() !== '') {
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Calculate font size responsive to image width (e.g. 5.5% of width, bounded between 24 and 52)
          const fontSize = Math.max(24, Math.min(52, Math.round(canvas.width * 0.055)));
          ctx.font = `bold ${fontSize}px "Inter", "Space Grotesk", "Helvetica Neue", sans-serif`;
          
          // Fill yellow
          ctx.fillStyle = '#facc15'; // Yellow-400
          
          // Position: Bottom center, slightly above the metadata black overlay box (85px high)
          const x = canvas.width / 2;
          const y = canvas.height - boxHeight - 35;
          
          // Dark outline for contrast and perfect readability
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.lineWidth = 5;
          ctx.strokeText(room.toUpperCase(), x, y);
          ctx.fillText(room.toUpperCase(), x, y);
          ctx.restore();
        }

        // Export as compressed jpeg
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  // Synchronize watermarked selectedFiles based on rawFiles, roomName, selProjId, includeGps
  useEffect(() => {
    let isCurrent = true;
    if (rawFiles.length === 0) {
      setSelectedFiles([]);
      return;
    }

    const activeProjectName = projects.find(p => p.id === selProjId)?.name || 'EBA Proyek';
    const activeGps = getGpsForProject(selProjId);

    const applyAllWatermarks = async () => {
      const watermarked = await Promise.all(
        rawFiles.map(b64 => processImageAndApplyWatermark(b64, activeProjectName, activeGps, roomName))
      );
      if (isCurrent) {
        setSelectedFiles(watermarked);
      }
    };

    applyAllWatermarks();

    return () => {
      isCurrent = false;
    };
  }, [rawFiles, roomName, selProjId, includeGps, projects]);

  // Multi file selector
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setCapturing(true);

    const base64Promises = Array.from(files).map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file as Blob);
        reader.onload = () => resolve(reader.result as string);
      });
    });

    const base64s = await Promise.all(base64Promises);
    
    setRawFiles((prev) => [...prev, ...base64s].slice(0, 5)); // max 5 photos
    setCapturing(false);
  };

  const handleBackupAll = async () => {
    const usingGas = !!gasUrl;
    if (!usingGas && !gdToken) {
      alert(lang === 'id' ? 'Silakan hubungkan Google Drive terlebih dahulu.' : 'Please connect Google Drive first.');
      return;
    }

    const unbackedPhotos = photos.filter(p => !p.driveUrls || p.driveUrls.length === 0);
    if (unbackedPhotos.length === 0) {
      alert(lang === 'id' ? 'Semua foto sudah di-backup di Google Drive.' : 'All photos are already backed up to Google Drive.');
      return;
    }

    const confirmed = window.confirm(
      lang === 'id' 
        ? `Apakah Anda yakin ingin mem-backup ${unbackedPhotos.length} foto ke Google Drive?`
        : `Are you sure you want to back up ${unbackedPhotos.length} photo(s) to Google Drive?`
    );
    if (!confirmed) return;

    setIsBackingUp(true);
    try {
      let folderId = '';
      if (!usingGas && gdToken) {
        setBackupStatus(lang === 'id' ? 'Menghubungkan ke folder Google Drive...' : 'Connecting to Google Drive folder...');
        folderId = await getOrCreateFolder(gdToken);
      }

      let successCount = 0;
      for (let i = 0; i < unbackedPhotos.length; i++) {
        const ph = unbackedPhotos[i];
        setBackupStatus(lang === 'id' ? `Mem-backup ${i + 1}/${unbackedPhotos.length}: ${ph.projectName}...` : `Backing up ${i + 1}/${unbackedPhotos.length}: ${ph.projectName}...`);

        const b64 = ph.images[0];
        const filename = `EBA_${ph.projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${ph.date}_${ph.time.replace(/:/g, '-')}.jpg`;

        try {
          let uploadRes;
          if (usingGas) {
            uploadRes = await uploadPhotoViaGas(
              gasUrl,
              b64,
              filename,
              role,
              {
                id: ph.id,
                projectId: ph.projectId,
                projectName: ph.projectName,
                date: ph.date,
                time: ph.time,
                notes: ph.notes,
                gpsLocation: ph.gpsLocation
              }
            );
          } else {
            uploadRes = await uploadPhotoToDrive(gdToken!, b64, filename, folderId);
          }

          if (uploadRes && uploadRes.webViewLink) {
            const updatedPhoto: ProgressPhoto = {
              ...ph,
              driveUrls: [uploadRes.webViewLink]
            };
            onUpdatePhoto(updatedPhoto);
            successCount++;
          }
        } catch (uploadErr) {
          console.error(`Failed to back up photo ${ph.id}:`, uploadErr);
        }
      }

      alert(lang === 'id' 
        ? `Berhasil mem-backup ${successCount} foto ke Google Drive!` 
        : `Successfully backed up ${successCount} photo(s) to Google Drive!`
      );
    } catch (err: any) {
      alert(lang === 'id' ? `Gagal mem-backup: ${err.message}` : `Backup failed: ${err.message}`);
    } finally {
      setIsBackingUp(false);
      setBackupStatus('');
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    const projObj = projects.find(p => p.id === selProjId);
    const activeProjectName = projObj?.name || 'EBA Proyek';
    const activeGps = getGpsForProject(selProjId);

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];

    if (isOffline) {
      // Add each photo to offline queue separately so they get synced as individual photos
      selectedFiles.forEach((fileB64, idx) => {
        const singlePayload = {
          projectId: selProjId,
          projectName: activeProjectName,
          date,
          time,
          notes: selectedFiles.length > 1 ? `${notes} (${idx + 1}/${selectedFiles.length})` : notes,
          images: [fileB64],
          gpsLocation: includeGps ? activeGps : undefined,
          roomName: roomName.trim() || undefined
        };
        onAddOfflineItem('photo', singlePayload);
      });
      setNotes('');
      setRoomName('');
      setRawFiles([]);
      setSelectedFiles([]);
      alert(lang === 'id' ? 'Tersimpan dalam antrean upload offline! Foto akan terkirim setelah online.' : 'Saved in offline upload queue! Photos will sync once online.');
    } else {
      setIsBackingUp(true);
      
      try {
        let folderId = '';
        const usingGas = !!gasUrl;

        if (!usingGas && gdToken && autoUpload) {
          if (role === 'admin') {
            setBackupStatus(lang === 'id' ? 'Menghubungkan ke folder Google Drive...' : 'Connecting to Google Drive folder...');
          }
          folderId = await getOrCreateFolder(gdToken);
        }

        for (let idx = 0; idx < selectedFiles.length; idx++) {
          const fileB64 = selectedFiles[idx];
          const photoId = `ph_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
          const singlePayload: any = {
            id: photoId,
            projectId: selProjId,
            projectName: activeProjectName,
            date,
            time,
            notes: selectedFiles.length > 1 ? `${notes} (${idx + 1}/${selectedFiles.length})` : notes,
            images: [fileB64],
            gpsLocation: includeGps ? activeGps : undefined,
            driveUrls: [],
            roomName: roomName.trim() || undefined
          };

          const filename = `EBA_${activeProjectName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${date}_${time.replace(/:/g, '-')}_${idx + 1}.jpg`;

          if (usingGas && autoUpload) {
            try {
              setBackupStatus(lang === 'id' ? `Mengunggah foto ${idx + 1}/${selectedFiles.length} ke Google Drive (Cloud)...` : `Uploading photo ${idx + 1}/${selectedFiles.length} to Google Drive (Cloud)...`);
              const uploadRes = await uploadPhotoViaGas(
                gasUrl,
                fileB64,
                filename,
                role,
                {
                  id: photoId,
                  projectId: selProjId,
                  projectName: activeProjectName,
                  date,
                  time,
                  notes: singlePayload.notes,
                  gpsLocation: singlePayload.gpsLocation,
                  roomName: singlePayload.roomName
                }
              );
              if (uploadRes && uploadRes.webViewLink) {
                singlePayload.driveUrls = [uploadRes.webViewLink];
              }
            } catch (gasErr: any) {
              console.error('Failed to auto-upload to Google Drive via GAS:', gasErr);
            }
          } else if (gdToken && autoUpload && folderId) {
            try {
              if (role === 'admin') {
                setBackupStatus(lang === 'id' ? `Mengunggah foto ${idx + 1}/${selectedFiles.length} ke Google Drive...` : `Uploading photo ${idx + 1}/${selectedFiles.length} to Google Drive...`);
              }
              const uploadRes = await uploadPhotoToDrive(gdToken, fileB64, filename, folderId);
              if (uploadRes && uploadRes.webViewLink) {
                singlePayload.driveUrls = [uploadRes.webViewLink];
              }
            } catch (uploadErr) {
              console.error('Failed to auto-upload to Google Drive:', uploadErr);
            }
          }

          onAddPhoto(singlePayload);
        }

        setNotes('');
        setRoomName('');
        setRawFiles([]);
        setSelectedFiles([]);
      } catch (err: any) {
        if (role === 'admin') {
          alert(lang === 'id' ? `Gagal upload ke Google Drive: ${err.message}` : `Google Drive upload failed: ${err.message}`);
        } else {
          console.error('Google Drive background upload error:', err);
        }
      } finally {
        setIsBackingUp(false);
        setBackupStatus('');
      }
    }
  };

  const handleSaveGasUrl = (e: React.FormEvent) => {
    e.preventDefault();
    let url = gasInput.trim();
    if (!url) {
      alert(lang === 'id' ? 'Silakan masukkan URL Google Apps Script Web App yang valid.' : 'Please enter a valid Google Apps Script Web App URL.');
      return;
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
    alert(lang === 'id' ? 'Koneksi Google Apps Script berhasil disimpan & diaktifkan!' : 'Google Apps Script connection successfully saved & activated!');
  };

  const handleDisconnectGas = () => {
    const confirmed = window.confirm(
      lang === 'id'
        ? 'Apakah Anda yakin ingin memutuskan hubungan Google Apps Script?'
        : 'Are you sure you want to disconnect Google Apps Script?'
    );
    if (!confirmed) return;
    setGasUrl(null);
    setGasUrlState(null);
    setGasInput('');
  };

  const copyCodeGsToClipboard = () => {
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
    alert(lang === 'id' ? 'Kode code.gs (API Utama) berhasil disalin ke clipboard!' : 'Main code.gs code copied to clipboard!');
  };

  const copySetupGsToClipboard = () => {
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
    alert(lang === 'id' ? 'Kode setup.gs (Sinkronisasi Excel) berhasil disalin ke clipboard!' : 'setup.gs (Excel automation) code copied to clipboard!');
  };

  const handleConnectGD = async () => {
    setIsLoggingIn(true);
    try {
      const res = await signInGD();
      if (res) {
        setGdUser(res.user);
        setGdToken(res.accessToken);
      }
    } catch (err: any) {
      alert(lang === 'id' ? `Gagal menghubungkan Google Drive: ${err.message}` : `Failed to connect Google Drive: ${err.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDisconnectGD = async () => {
    const confirmed = window.confirm(
      lang === 'id'
        ? 'Apakah Anda yakin ingin memutuskan hubungan Google Drive?'
        : 'Are you sure you want to disconnect your Google Drive?'
    );
    if (!confirmed) return;
    
    await signOutGD();
    setGdUser(null);
    setGdToken(null);
  };

  return (
    <div className="space-y-6" id="progress-photos-tab">
      
      {/* Google Drive Cloud Backup Card - ONLY visible to Admin */}
      {role === 'admin' && (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 text-[9px] font-black bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 rounded-full uppercase tracking-wider flex items-center gap-1.5 w-fit">
                <Cloud size={10} className="animate-pulse" />
                <span>Google Drive Integration</span>
              </span>
              <h3 className="font-sans font-bold text-sm sm:text-base text-gray-900 dark:text-white mt-1.5">
                {lang === 'id' ? 'Backup Cloud Google Drive' : 'Google Drive Cloud Sync'}
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xl">
                {lang === 'id' 
                  ? 'Sinkronisasikan foto progress proyek otomatis ke Google Drive Anda. Kami menyediakan dua metode fleksibel untuk menghubungkan aplikasi Anda.' 
                  : 'Automatically sync project progress photos to your Google Drive. We offer two flexible methods to connect your application.'}
              </p>
            </div>
          </div>

          {/* Connection Status & Loader */}
          {isBackingUp && (
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 rounded-xl border border-blue-100 dark:border-blue-900/30 text-xs flex items-center gap-2.5 animate-pulse">
              <Loader2 size={16} className="animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="font-medium font-mono">{backupStatus}</span>
            </div>
          )}

          {/* Tab Buttons to select Sync Method */}
          <div className="flex border-b border-gray-100 dark:border-gray-700/50">
            <button
              type="button"
              onClick={() => setActiveSyncMethod('gas')}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeSyncMethod === 'gas'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600'
              }`}
            >
              {lang === 'id' ? '1. Otomatis via Google Apps Script (Sangat Disarankan)' : '1. Automatic via Google Apps Script (Highly Recommended)'}
            </button>
            <button
              type="button"
              onClick={() => setActiveSyncMethod('oauth')}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeSyncMethod === 'oauth'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600'
              }`}
            >
              {lang === 'id' ? '2. Google Login (Firebase Auth)' : '2. Google Login (Firebase Auth)'}
            </button>
          </div>

          {/* METHOD 1: GOOGLE APPS SCRIPT (GAS) PANEL */}
          {activeSyncMethod === 'gas' && (
            <div className="space-y-4 pt-2">
              {!gasUrl ? (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row items-start justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-750">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-500 shrink-0 mt-0.5">
                        <CloudOff size={20} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                          {lang === 'id' ? 'Google Apps Script Belum Dikonfigurasi' : 'Google Apps Script Not Configured'}
                        </p>
                        <p className="text-[11px] text-gray-400 max-w-lg leading-relaxed">
                          {lang === 'id' 
                            ? 'Gunakan metode ini agar Mandor dan Tamu dapat langsung mengirim foto ke Drive Anda tanpa perlu login akun Google masing-masing. Gratis, instan, dan permanen.' 
                            : 'Use this method so that Mandor and Tamu can directly send photos to your Drive without needing their own Google accounts to log in. Free, instant, and permanent.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Instruction Block */}
                  <details className="group bg-orange-50/15 dark:bg-orange-950/5 border border-orange-150/40 dark:border-orange-900/15 rounded-xl p-4 [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex items-center justify-between cursor-pointer focus:outline-none select-none">
                      <div className="flex items-center gap-2">
                        <Layers size={14} className="text-orange-500" />
                        <span className="text-xs font-bold text-orange-700 dark:text-orange-400">
                          {lang === 'id' ? 'Cara Setup Google Apps Script (Hanya 1 Menit & Gratis)' : 'How to Setup Google Apps Script (1 Minute & 100% Free)'}
                        </span>
                      </div>
                      <span className="text-xs text-orange-400 group-open:rotate-180 transition-transform">▼</span>
                    </summary>

                    <div className="mt-4 space-y-3.5 text-xs text-gray-650 dark:text-gray-350 border-t border-orange-100/30 dark:border-orange-900/10 pt-3 leading-relaxed">
                      <ol className="list-decimal list-inside space-y-2.5">
                        <li>
                          {lang === 'id' ? 'Buka ' : 'Open '}
                          <a href="https://script.google.com/" target="_blank" rel="noreferrer" className="text-orange-600 hover:underline font-bold">Google Apps Script</a>
                          {lang === 'id' ? ' lalu login dengan akun Google Admin Anda.' : ' and log in with your Google Admin account.'}
                        </li>
                        <li>{lang === 'id' ? 'Klik tombol "New Project" di kiri atas.' : 'Click the "New Project" button in the top left.'}</li>
                        <li>
                          {lang === 'id' 
                            ? 'Buat dua file terpisah di dalam project Apps Script Anda: satu bernama "code.gs" dan satu bernama "setup.gs" (klik tanda + di samping "Files" -> pilih "Script" untuk menambah file baru).' 
                            : 'Create two separate files inside your Apps Script project: one named "code.gs" and one named "setup.gs" (click the + sign next to "Files" -> select "Script" to add a new file).'}
                        </li>
                        <li>{lang === 'id' ? 'Hapus semua isi bawaan dari masing-masing file, kemudian salin kode integrasi masing-masing di bawah ini:' : 'Delete all default code from each file, then copy their respective integration code below:'}</li>
                      </ol>

                      <div className="my-3 flex flex-wrap gap-2.5">
                        <button
                          type="button"
                          onClick={copyCodeGsToClipboard}
                          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg flex items-center gap-1.5 transition-all text-[11px] cursor-pointer shadow-sm"
                        >
                          <Link size={12} />
                          <span>{lang === 'id' ? '1. Salin code.gs (API Utama)' : '1. Copy code.gs (Main API)'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={copySetupGsToClipboard}
                          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-800 text-white font-bold rounded-lg flex items-center gap-1.5 transition-all text-[11px] cursor-pointer shadow-sm"
                        >
                          <Link size={12} />
                          <span>{lang === 'id' ? '2. Salin setup.gs (Otomatisasi Excel)' : '2. Copy setup.gs (Excel Automation)'}</span>
                        </button>
                      </div>

                      <ol className="list-decimal list-inside space-y-2.5" start={4}>
                        <li>{lang === 'id' ? 'Paste kode tersebut ke editor script Google.' : 'Paste that code into the Google script editor.'}</li>
                        <li>
                          {lang === 'id' 
                            ? 'Klik tombol "Deploy" di kanan atas > pilih "New Deployment".' 
                            : 'Click the "Deploy" button on the top right > select "New Deployment".'}
                        </li>
                        <li>
                          {lang === 'id' 
                            ? 'Klik ikon Gear di samping "Select type" lalu pilih "Web app".' 
                            : 'Click the Gear icon next to "Select type" and select "Web app".'}
                        </li>
                        <li>
                          {lang === 'id' 
                            ? 'Atur "Execute as" ke "Me" (akun Google Anda).' 
                            : 'Set "Execute as" to "Me" (your Google account).'}
                        </li>
                        <li>
                          {lang === 'id' 
                            ? 'Atur "Who has access" ke "Anyone" (Agar Mandor & Tamu dapat mengunggah foto).' 
                            : 'Set "Who has access" to "Anyone" (So Mandors & Guests can upload photos).'}
                        </li>
                        <li>
                          {lang === 'id' 
                            ? 'Klik "Deploy". Izinkan akses keamanan akun Google Anda apabila diminta.' 
                            : 'Click "Deploy". Authorize your Google Account permissions when requested.'}
                        </li>
                        <li>
                          {lang === 'id' 
                            ? 'Salin "Web app URL" (biasanya berakhiran /exec), paste ke kolom input di bawah ini, lalu klik Simpan!' 
                            : 'Copy the "Web app URL" (typically ends in /exec), paste it into the input field below, and click Save!'}
                        </li>
                      </ol>
                    </div>
                  </details>

                  {/* Input Form */}
                  <form onSubmit={handleSaveGasUrl} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      required
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={gasInput}
                      onChange={(e) => setGasInput(e.target.value)}
                      className="flex-1 px-3.5 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-orange-500 text-gray-900 dark:text-white placeholder:text-gray-400 font-mono"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
                    >
                      {lang === 'id' ? 'Simpan & Aktifkan' : 'Save & Activate'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className={`space-y-4 p-4 rounded-xl border ${
                  gasUrl && (gasUrl.includes('/edit') || gasUrl.includes('/home') || gasUrl.includes('/d/') || !gasUrl.includes('/exec'))
                    ? 'bg-red-50/25 dark:bg-red-950/10 border-red-200 dark:border-red-900/30'
                    : 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-100/50 dark:border-emerald-900/25'
                }`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        gasUrl && (gasUrl.includes('/edit') || gasUrl.includes('/home') || gasUrl.includes('/d/') || !gasUrl.includes('/exec'))
                          ? 'bg-red-100 text-red-650 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400'
                      }`}>
                        <CheckCircle size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                            {gasUrl && (gasUrl.includes('/edit') || gasUrl.includes('/home') || gasUrl.includes('/d/') || !gasUrl.includes('/exec'))
                              ? (lang === 'id' ? '⚠️ URL Google Apps Script Salah!' : '⚠️ Apps Script URL Invalid!')
                              : (lang === 'id' ? 'Terkoneksi via Google Apps Script' : 'Connected via Google Apps Script')}
                          </p>
                          <span className={`px-1.5 py-0.5 text-[8px] font-black rounded uppercase ${
                            gasUrl && (gasUrl.includes('/edit') || gasUrl.includes('/home') || gasUrl.includes('/d/') || !gasUrl.includes('/exec'))
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/45 dark:text-red-400'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/45 dark:text-emerald-400'
                          }`}>
                            {gasUrl && (gasUrl.includes('/edit') || gasUrl.includes('/home') || gasUrl.includes('/d/') || !gasUrl.includes('/exec'))
                              ? (lang === 'id' ? 'SALAH' : 'ERROR')
                              : 'AUTOMATIC'}
                          </span>
                        </div>
                        <p className={`text-[11px] truncate max-w-sm sm:max-w-md font-mono mt-0.5 ${
                          gasUrl && (gasUrl.includes('/edit') || gasUrl.includes('/home') || gasUrl.includes('/d/') || !gasUrl.includes('/exec'))
                            ? 'text-red-500 font-bold'
                            : 'text-gray-400'
                        }`}>
                          {gasUrl}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDisconnectGas}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-650 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        {lang === 'id' ? 'Putuskan Hubungan / Ubah' : 'Disconnect / Change'}
                      </button>
                    </div>
                  </div>

                  {gasUrl && (gasUrl.includes('/edit') || gasUrl.includes('/home') || gasUrl.includes('/d/') || !gasUrl.includes('/exec')) && (
                    <div className="p-3 bg-red-100/40 dark:bg-red-950/20 rounded-xl text-xs text-red-800 dark:text-red-400 space-y-1 leading-relaxed border border-red-200 dark:border-red-900/30">
                      <p className="font-bold">
                        {lang === 'id' 
                          ? '⚠️ Anda Memasukkan URL Editor (Bukan Web App)' 
                          : '⚠️ Editor URL Detected Instead of Web App'}
                      </p>
                      <p className="text-[11px]">
                        {lang === 'id'
                          ? 'URL di atas adalah URL halaman tempat mengetik kode script. URL yang benar wajib berakhiran dengan "/exec". Silakan klik tombol "Putuskan Hubungan / Ubah" di atas, lalu ikuti panduan setup di bawah untuk mendapatkan URL Web App yang benar.'
                          : 'The URL above is the editor URL where you write code. The correct URL must end with "/exec". Please click "Disconnect / Change" above and follow the instructions below to get your correct Web App URL.'}
                      </p>
                    </div>
                  )}

                  <div className="pt-3 border-t border-emerald-100/50 dark:border-emerald-900/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                    {/* Auto Upload Toggle */}
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoUpload}
                        onChange={(e) => {
                          const nextVal = e.target.checked;
                          setAutoUpload(nextVal);
                          localStorage.setItem('EBA_GD_AUTO_UPLOAD', String(nextVal));
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-gray-650 dark:text-gray-350 font-medium select-none">
                        {lang === 'id' ? 'Auto-upload foto baru ke Google Drive' : 'Auto-upload new photos to Google Drive'}
                      </span>
                    </label>

                    {/* Sync past photos */}
                    {photos.some(p => !p.driveUrls || p.driveUrls.length === 0) && (
                      <button
                        type="button"
                        onClick={handleBackupAll}
                        disabled={isBackingUp}
                        className="px-3.5 py-1.5 bg-orange-650 hover:bg-orange-750 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                      >
                        <Cloud size={13} />
                        <span>
                          {lang === 'id' 
                            ? `Backup ${photos.filter(p => !p.driveUrls || p.driveUrls.length === 0).length} Foto Lama` 
                            : `Backup ${photos.filter(p => !p.driveUrls || p.driveUrls.length === 0).length} Past Photos`}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* METHOD 2: STANDARD GOOGLE AUTH PANEL */}
          {activeSyncMethod === 'oauth' && (
            <div className="space-y-4 pt-2">
              {!gdUser || !gdToken ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-750">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-500 shrink-0">
                      <CloudOff size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                        {lang === 'id' ? 'Belum Terhubung' : 'Not Connected'}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {lang === 'id' ? 'Hubungkan akun Google untuk mulai membackup foto progress.' : 'Link your Google account to start backing up progress photos.'}
                      </p>
                    </div>
                  </div>

                  <button 
                    type="button"
                    disabled={isLoggingIn}
                    onClick={handleConnectGD}
                    className="gsi-material-button self-start sm:self-auto cursor-pointer shrink-0"
                    style={{ margin: 0, padding: 0 }}
                  >
                    <div className="gsi-material-button-state"></div>
                    <div className="gsi-material-button-content-wrapper">
                      <div className="gsi-material-button-icon">
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                          <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                      </div>
                      <span className="gsi-material-button-contents text-xs font-semibold px-2 text-gray-700 dark:text-gray-300">
                        {isLoggingIn ? (lang === 'id' ? 'Menghubungkan...' : 'Connecting...') : (lang === 'id' ? 'Hubungkan Google Drive' : 'Connect Google Drive')}
                      </span>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-4 p-4 bg-emerald-50/20 dark:bg-emerald-950/10 rounded-xl border border-emerald-100/50 dark:border-emerald-900/25">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <CheckCircle size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                            {lang === 'id' ? 'Terhubung ke Google Drive' : 'Connected to Google Drive'}
                          </p>
                          <span className="px-1.5 py-0.5 text-[8px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/45 dark:text-emerald-400 rounded uppercase">LIVE</span>
                        </div>
                        <p className="text-[11px] text-gray-500 font-mono">
                          {gdUser.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href="https://drive.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-850 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <FolderOpen size={13} className="text-amber-500" />
                        <span>{lang === 'id' ? 'Buka Google Drive' : 'Open Google Drive'}</span>
                      </a>

                      <button
                        type="button"
                        onClick={handleDisconnectGD}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-650 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        {lang === 'id' ? 'Putuskan Hubungan' : 'Disconnect'}
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-emerald-100/50 dark:border-emerald-900/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                    {/* Auto Upload Toggle */}
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoUpload}
                        onChange={(e) => {
                          const nextVal = e.target.checked;
                          setAutoUpload(nextVal);
                          localStorage.setItem('EBA_GD_AUTO_UPLOAD', String(nextVal));
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-gray-650 dark:text-gray-350 font-medium select-none">
                        {lang === 'id' ? 'Auto-upload foto baru ke Google Drive' : 'Auto-upload new photos to Google Drive'}
                      </span>
                    </label>

                    {/* Sync past photos */}
                    {photos.some(p => !p.driveUrls || p.driveUrls.length === 0) && (
                      <button
                        type="button"
                        onClick={handleBackupAll}
                        disabled={isBackingUp}
                        className="px-3.5 py-1.5 bg-orange-650 hover:bg-orange-750 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                      >
                        <Cloud size={13} />
                        <span>
                          {lang === 'id' 
                            ? `Backup ${photos.filter(p => !p.driveUrls || p.driveUrls.length === 0).length} Foto Lama` 
                            : `Backup ${photos.filter(p => !p.driveUrls || p.driveUrls.length === 0).length} Past Photos`}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Upload/Camera form (Accessible by Admin, Mandor, and Guest) */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
        <div>
          <span className="px-2.5 py-0.5 text-[9px] font-black bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 rounded-full uppercase tracking-wider">
            Site Documentation
          </span>
          <h3 className="font-sans font-bold text-sm sm:text-base text-gray-900 dark:text-white mt-1.5">
            {lang === 'id' ? 'Unggah Foto Progress Harian' : 'Upload Daily Site Progress Photos'}
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {lang === 'id' ? 'Watermark waktu, tanggal, dan koordinat GPS dicetak otomatis ke dalam foto' : 'Time, date, and GPS coordinates are embedded directly on image output'}
          </p>
        </div>

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Project dropdown selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-widest">
                {lang === 'id' ? 'Nama Proyek' : 'Project Assignment'}
              </label>
              <select
                value={selProjId}
                onChange={(e) => setSelProjId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Room Name Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-widest">
                {lang === 'id' ? 'Nama Ruangan' : 'Room/Space Name'}
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder={lang === 'id' ? 'e.g. POMPA, Toilet, Lantai 1' : 'e.g. Pump Room, Toilet, 1st Floor'}
                className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
              />
            </div>

            {/* GPS inclusion toggle */}
            <div className="space-y-1.5 flex flex-col justify-end">
              <button
                type="button"
                onClick={() => setIncludeGps(!includeGps)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-xs font-semibold transition-all ${
                  includeGps
                    ? 'border-orange-200 bg-orange-50/25 text-orange-700 dark:border-orange-900/30 dark:bg-orange-950/10 dark:text-orange-400'
                    : 'border-gray-200 text-gray-500 dark:border-gray-700'
                }`}
              >
                <MapPin size={14} className={includeGps ? "animate-bounce" : ""} />
                <span>{includeGps ? (lang === 'id' ? 'GPS Watermark Aktif' : 'GPS Watermark Enabled') : (lang === 'id' ? 'GPS Nonaktif' : 'GPS Omitted')}</span>
              </button>
            </div>

          </div>

          {/* Photo uploads button and preview boxes */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex justify-between">
              <span>{lang === 'id' ? 'Foto Progress (Pilih 1 - 5 Foto)' : 'Progress Photos (Select 1 - 5)'}</span>
              <span className="font-mono text-gray-500">{selectedFiles.length}/5</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* Photo selector boxes: Kamera & Galeri */}
              {selectedFiles.length < 5 && (
                <>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={capturing}
                    className="aspect-square border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-orange-500 dark:hover:border-orange-400 rounded-2xl flex flex-col items-center justify-center gap-1.5 bg-gray-50 dark:bg-gray-900 hover:bg-orange-50/10 transition-all text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                  >
                    {capturing ? (
                      <Loader2 size={24} className="animate-spin text-orange-600" />
                    ) : (
                      <>
                        <Camera size={24} />
                        <span className="text-[10px] font-bold uppercase">{lang === 'id' ? 'Kamera HP' : 'Device Camera'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={capturing}
                    className="aspect-square border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-orange-500 dark:hover:border-orange-400 rounded-2xl flex flex-col items-center justify-center gap-1.5 bg-gray-50 dark:bg-gray-900 hover:bg-orange-50/10 transition-all text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                  >
                    {capturing ? (
                      <Loader2 size={24} className="animate-spin text-orange-600" />
                    ) : (
                      <>
                        <ImageIcon size={24} />
                        <span className="text-[10px] font-bold uppercase">{lang === 'id' ? 'Galeri Foto' : 'Photo Gallery'}</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {/* Camera direct input */}
              <input
                type="file"
                ref={cameraInputRef}
                onChange={handleFileChange}
                accept="image/*"
                capture="environment"
                className="hidden"
              />

              {/* Gallery upload input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="image/*"
                className="hidden"
              />

              {/* Image previews inside queue */}
              {selectedFiles.map((b64, idx) => (
                <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 relative group">
                  <img src={b64} alt="Captured preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white font-sans text-xs flex items-center justify-center hover:bg-black/90 transition-colors"
                  >
                    ×
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-black/50 text-[8px] font-bold text-center text-orange-400 p-0.5">
                    WATERMARKED
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Description note */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              {lang === 'id' ? 'Catatan Kemajuan Progres' : 'Progress description & updates'}
            </label>
            <textarea
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl min-h-[70px]"
              placeholder={lang === 'id' ? 'e.g. Panel listrik utama terpasang rapi, siap untuk testing minggu depan...' : 'e.g. Electrical breaker boards completely wired, awaiting inspection...'}
            />
          </div>

          {/* Submit container with offline notifications */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              {isOffline && (
                <>
                  <WifiOff size={14} />
                  <span>{lang === 'id' ? 'Mode Offline: Tersimpan lokal di antrean PWA' : 'Offline Mode: Stored locally in PWA cache queue'}</span>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={selectedFiles.length === 0}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md ${
                selectedFiles.length === 0
                  ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/15'
              }`}
            >
              <UploadCloud size={14} />
              <span>{isOffline ? (lang === 'id' ? 'Simpan di Antrean' : 'Add to Cache Queue') : (lang === 'id' ? 'Kirim ke Server' : 'Publish Progress')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Offline Queue list (If items exist in offline queue) */}
      {offlineQueue.length > 0 && (
        <div className="bg-amber-50/40 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 p-4 rounded-2xl space-y-3" id="offline-queue-section">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-400 flex items-center gap-1.5">
              <RefreshCw size={13} className="animate-spin" />
              <span>{lang === 'id' ? 'Antrean Upload Offline Pendeteksi Sinyal' : 'Offline Upload Cache Buffer'} ({offlineQueue.length} {lang === 'id' ? 'Foto' : 'Items'})</span>
            </h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {offlineQueue.map((item, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-amber-100 dark:border-amber-950/40 space-y-1.5 relative">
                <span className="absolute top-1.5 left-1.5 px-1 py-0.5 rounded text-[8px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 font-bold">
                  PENDING
                </span>
                <img src={item.payload.images[0]} className="w-full aspect-video object-cover rounded-lg" alt="Queue thumbnail" />
                <div>
                  <h6 className="text-[10px] font-bold text-gray-950 dark:text-gray-100 truncate">{item.payload.projectName}</h6>
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 line-clamp-1">{item.payload.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scrollable calendar and Quick filter bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-3" id="calendar-filter-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={14} className="text-orange-600 animate-pulse" />
            <span>{lang === 'id' ? 'Filter & Kalender Dokumentasi' : 'Documentation Filter & Calendar'}</span>
          </span>

          <div className="flex flex-wrap items-center gap-3">
            {/* Project Selector Filter */}
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="px-2.5 py-1 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg focus:outline-none"
            >
              <option value="">{lang === 'id' ? 'Semua Proyek' : 'All Projects'}</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {/* Specific date input filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">{lang === 'id' ? 'Tanggal:' : 'Date:'}</span>
              <input
                type="date"
                value={selectedDateFilter}
                onChange={(e) => {
                  setSelectedDateFilter(e.target.value);
                  if (e.target.value) setTimeRangeFilter('all'); // Clear range if specific date is chosen
                }}
                className="px-2.5 py-1 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg focus:outline-none"
              />
              {selectedDateFilter && (
                <button
                  onClick={() => setSelectedDateFilter('')}
                  className="text-[10px] font-bold text-orange-600 hover:text-orange-850"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Horizontal scrollable quick range selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          {([
            { key: 'all', label: lang === 'id' ? 'Semua Foto' : 'All Photos' },
            { key: 'today', label: lang === 'id' ? 'Hari Ini' : 'Today' },
            { key: 'week', label: lang === 'id' ? '7 Hari Terakhir' : 'Last 7 Days' },
            { key: 'month', label: lang === 'id' ? 'Bulan Ini' : 'This Month' },
            { key: 'lastMonth', label: lang === 'id' ? 'Bulan Lalu' : 'Last Month' },
            { key: 'twoMonthsAgo', label: lang === 'id' ? '2 Bulan Lalu' : '2 Months Ago' }
          ] as const).map((range) => (
            <button
              key={range.key}
              type="button"
              onClick={() => {
                setTimeRangeFilter(range.key);
                setSelectedDateFilter(''); // Clear specific date
              }}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-lg whitespace-nowrap transition-all border ${
                timeRangeFilter === range.key && !selectedDateFilter
                  ? 'bg-orange-600 border-orange-600 text-white shadow-sm'
                  : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-750 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Action Button Row for Download & Print PDF */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            {lang === 'id' ? 'Aksi untuk:' : 'Actions for:'}{' '}
            <span className="font-bold text-gray-850 dark:text-gray-100">
              {selectedProjectFilter ? projects.find(p => p.id === selectedProjectFilter)?.name : (lang === 'id' ? 'Semua Proyek' : 'All Projects')}
            </span>
            {' • '}
            <span className="font-bold text-orange-600">
              {timeRangeFilter === 'all' && (lang === 'id' ? 'Semua Foto' : 'All Photos')}
              {timeRangeFilter === 'today' && (lang === 'id' ? 'Hari Ini' : 'Today')}
              {timeRangeFilter === 'week' && (lang === 'id' ? '7 Hari Terakhir' : 'Last 7 Days')}
              {timeRangeFilter === 'month' && (lang === 'id' ? 'Bulan Ini' : 'This Month')}
              {timeRangeFilter === 'lastMonth' && (lang === 'id' ? 'Bulan Lalu' : 'Last Month')}
              {timeRangeFilter === 'twoMonthsAgo' && (lang === 'id' ? '2 Bulan Lalu' : '2 Months Ago')}
            </span>
            {selectedDateFilter && ` (${selectedDateFilter})`}
            {` (${filteredPhotos.length} ${lang === 'id' ? 'foto' : 'photos'})`}
          </div>

          <div className="flex items-center gap-2">
            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={filteredPhotos.length === 0}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                filteredPhotos.length === 0
                  ? 'bg-gray-100 text-gray-400 dark:bg-gray-900 dark:text-gray-600 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm hover:shadow active:scale-[0.98]'
              }`}
            >
              <Download size={13} />
              <span>{lang === 'id' ? 'Unduh Foto' : 'Download Photos'}</span>
            </button>

            {/* Print PDF Button */}
            <button
              type="button"
              onClick={handleOpenPrintPreview}
              disabled={filteredPhotos.length === 0}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                filteredPhotos.length === 0
                  ? 'bg-gray-100 text-gray-400 dark:bg-gray-900 dark:text-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-750 text-white shadow-sm hover:shadow active:scale-[0.98]'
              }`}
            >
              <Printer size={13} />
              <span>{lang === 'id' ? 'Cetak PDF Laporan' : 'Print PDF Report'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Progress Log Gallery */}
      <div className="space-y-4" id="gallery-container">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-sans font-bold text-sm sm:text-base text-gray-950 dark:text-gray-100 flex items-center gap-2">
              <Layers size={16} className="text-orange-600" />
              <span>{lang === 'id' ? 'Galeri Dokumentasi Progress' : 'Project Documentation Gallery'}</span>
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {lang === 'id' 
                ? 'Klik 1x untuk menyeleksi (bisa hapus massal), klik 2x untuk membuka popup detail. Klik gambar di dalam popup untuk menutup.' 
                : 'Click 1x to select (allows batch delete), double-click to open detail popup. Click the photo in the popup to close.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedPhotos.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteSelectedPhotos}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-red-600/15"
              >
                <Trash2 size={13} />
                <span>
                  {lang === 'id'
                    ? `Hapus ${selectedPhotos.length} Terpilih`
                    : `Delete ${selectedPhotos.length} Selected`}
                </span>
              </button>
            )}
            <span className="text-[10px] font-mono text-gray-400 font-bold bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded-md">
              {filteredPhotos.length} {lang === 'id' ? 'Foto' : 'Photos'}
            </span>
          </div>
        </div>

        {/* Dense grid of smaller thumbnails */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5" id="photo-gallery-grid">
          {filteredPhotos.map((ph) => {
            const isSelected = selectedPhotos.includes(ph.id);
            return (
              <div
                key={ph.id}
                onClick={() => toggleSelectPhoto(ph.id)}
                onDoubleClick={() => setActiveLightboxPhoto(ph)}
                className={`group aspect-square bg-gray-50 dark:bg-gray-900 rounded-xl border overflow-hidden relative cursor-pointer hover:shadow-md transition-all duration-200 animate-in fade-in ${
                  isSelected
                    ? 'border-orange-500 ring-2 ring-orange-500/30 shadow-md scale-[0.98]'
                    : 'border-gray-150 dark:border-gray-750 shadow-sm hover:border-orange-200'
                }`}
              >
                <img
                  src={getDisplayableImageSrc(ph.images[0] || ph.driveUrls?.[0])}
                  alt="Progress thumbnail"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const img = e.currentTarget;
                    // Fallback: coba pakai driveUrls kalau images gagal
                    const fallback = getDisplayableImageSrc(ph.driveUrls?.[0]);
                    if (fallback && img.src !== fallback) {
                      img.src = fallback;
                    }
                  }}
                />
                
                {/* Room Name Badge */}
                {ph.roomName && (
                  <div className="absolute bottom-1.5 left-1.5 bg-yellow-400 text-black font-sans text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow z-10 uppercase tracking-wide">
                    {ph.roomName}
                  </div>
                )}
                
                {/* Subtle hover/touch info badge overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-[9px] text-white">
                  <p className="font-bold truncate">
                    {ph.projectName}
                    {ph.roomName && ` - ${ph.roomName.toUpperCase()}`}
                  </p>
                  <p className="font-mono text-gray-300 mt-0.5">{ph.date}</p>
                </div>

                {/* Google Drive Status Badge */}
                {role === 'admin' && ph.driveUrls && ph.driveUrls.length > 0 && (
                  <div className="absolute top-1.5 left-1.5 bg-blue-600/95 text-white font-mono text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 z-10">
                    <Cloud size={8} />
                    <span>Drive</span>
                  </div>
                )}
   
                {/* Custom Checkbox/Selection Circle indicator */}
                <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center border transition-all z-20 ${
                  isSelected
                    ? 'bg-orange-500 border-orange-500 text-white shadow'
                    : 'bg-black/40 border-white/60 text-transparent group-hover:bg-black/60'
                }`}>
                  <CheckCircle size={12} className={isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 text-white"} />
                </div>
              </div>
            );
          })}

          {filteredPhotos.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-400 dark:text-gray-500 text-xs">
              {lang === 'id' ? 'Tidak ada foto dokumentasi yang cocok dengan filter.' : 'No progress photos match the selected filters.'}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Detail View Modal */}
      {activeLightboxPhoto && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setActiveLightboxPhoto(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/60 shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Header - Pinned at the top */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-750 flex items-center justify-between shrink-0">
              <div>
                <h4 className="font-sans font-bold text-xs text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                  {activeLightboxPhoto.projectName}
                  {activeLightboxPhoto.roomName && ` - ${activeLightboxPhoto.roomName.toUpperCase()}`}
                </h4>
                <p className="text-[10px] text-gray-450 font-mono mt-0.5">Dokumentasi Lapangan | {activeLightboxPhoto.date} {activeLightboxPhoto.time}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveLightboxPhoto(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-650 dark:text-gray-400 flex items-center justify-center font-bold text-lg transition-colors shadow-sm"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Scrollable Body Container */}
            <div className="overflow-y-auto flex-1">
              {/* Photo Preview Stage - Constrained max height for vertical images */}
              <div 
                className="bg-black flex items-center justify-center relative w-full h-[40vh] sm:h-auto sm:aspect-video sm:max-h-[385px] cursor-pointer" 
                onClick={() => setActiveLightboxPhoto(null)}
              >
                <img
                  src={getDisplayableImageSrc(activeLightboxPhoto.images[0] || activeLightboxPhoto.driveUrls?.[0])}
                  alt="Fullscreen Doc"
                  className="max-h-full max-w-full object-contain hover:opacity-90 transition-opacity"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const img = e.currentTarget;
                    const fallback = getDisplayableImageSrc(activeLightboxPhoto.driveUrls?.[0]);
                    if (fallback && img.src !== fallback) img.src = fallback;
                  }}
                  title={lang === 'id' ? 'Klik gambar untuk menutup' : 'Click image to close'}
                />
                
                {activeLightboxPhoto.gpsLocation && (
                  <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[9px] font-bold text-sky-400 flex items-center gap-1 shadow-sm">
                    <MapPin size={10} />
                    <span>{activeLightboxPhoto.gpsLocation}</span>
                  </div>
                )}
              </div>

              {/* Description and actions */}
              <div className="p-5 space-y-4">
                {activeLightboxPhoto.roomName && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-gray-400 dark:text-gray-550 uppercase tracking-widest">{lang === 'id' ? 'Nama Ruangan' : 'Room Name'}</span>
                    <p className="text-xs font-bold text-yellow-700 dark:text-yellow-400 bg-yellow-50/50 dark:bg-yellow-950/10 px-3 py-2 rounded-xl border border-yellow-100 dark:border-yellow-900/10 uppercase tracking-wide">
                      {activeLightboxPhoto.roomName}
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-gray-400 dark:text-gray-550 uppercase tracking-widest">{lang === 'id' ? 'Catatan Lapangan' : 'Field Notes'}</span>
                  <p className="text-xs text-gray-700 dark:text-gray-250 bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-100 dark:border-gray-850 leading-relaxed">
                    {activeLightboxPhoto.notes}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-750">
                  <div className="flex items-center gap-2">
                    <div className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 uppercase bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-900/20">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                      <span>{lang === 'id' ? 'Terverifikasi Cloud' : 'Cloud Synchronized'}</span>
                    </div>

                    {role === 'admin' && activeLightboxPhoto.driveUrls && activeLightboxPhoto.driveUrls.length > 0 && (
                      <a
                        href={activeLightboxPhoto.driveUrls[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] font-bold text-blue-650 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 uppercase bg-blue-50 dark:bg-blue-950/20 px-2 py-1 rounded border border-blue-100 dark:border-blue-900/20 transition-colors"
                      >
                        <Link size={10} />
                        <span>Drive Link</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPhoto(activeLightboxPhoto);
                        setActiveLightboxPhoto(null);
                      }}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-850 text-gray-750 dark:text-gray-350 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Edit2 size={12} />
                      <span>{lang === 'id' ? 'Edit' : 'Edit'}</span>
                    </button>

                    {deleteConfirmId === activeLightboxPhoto.id ? (
                      <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-lg border border-red-200 dark:border-red-900/30">
                        <button
                          type="button"
                          onClick={() => handleDeleteSinglePhoto(activeLightboxPhoto)}
                          className="text-[10px] font-extrabold text-red-650 hover:text-red-850 uppercase tracking-wider"
                        >
                          {lang === 'id' ? 'Ya' : 'Yes'}
                        </button>
                        <span className="text-gray-350 dark:text-gray-650">|</span>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-[10px] font-extrabold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 uppercase tracking-wider"
                        >
                          {lang === 'id' ? 'Batal' : 'No'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(activeLightboxPhoto.id)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Trash2 size={12} />
                        <span>{lang === 'id' ? 'Hapus' : 'Delete'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Edit Photo Notes Modal */}
      {editingPhoto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleEditSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xl space-y-4 max-w-md w-full animate-in zoom-in-95 duration-150">
            <div>
              <h4 className="font-sans font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                {lang === 'id' ? 'Edit Catatan Progress' : 'Edit Progress Notes'}
              </h4>
              <p className="text-[11px] text-gray-400">
                {lang === 'id' ? 'Perbarui keterangan kemajuan untuk foto dokumentasi ini' : 'Update the description or progress status for this photo'}
              </p>
            </div>

            <div className="space-y-3.5">
              {/* Photo preview (small) */}
              <div className="aspect-video rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <img src={editingPhoto.images[0]} alt="Editing preview" className="w-full h-full object-cover" />
              </div>

              {/* Project selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Proyek' : 'Project'}</label>
                <select
                  value={editingPhoto.projectId}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, projectId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Date / Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Tanggal' : 'Date'}</label>
                  <input
                    type="date"
                    value={editingPhoto.date}
                    onChange={(e) => setEditingPhoto({ ...editingPhoto, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Waktu' : 'Time'}</label>
                  <input
                    type="time"
                    value={editingPhoto.time}
                    onChange={(e) => setEditingPhoto({ ...editingPhoto, time: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                  />
                </div>
              </div>

              {/* Room Name Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Nama Ruangan' : 'Room/Space Name'}</label>
                <input
                  type="text"
                  value={editingPhoto.roomName || ''}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, roomName: e.target.value })}
                  placeholder={lang === 'id' ? 'e.g. POMPA, Toilet, Lantai 1' : 'e.g. Pump Room, Toilet, 1st Floor'}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Catatan Kemajuan Progres' : 'Progress Notes'}</label>
                <textarea
                  required
                  value={editingPhoto.notes}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl min-h-[80px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setEditingPhoto(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl"
              >
                {lang === 'id' ? 'Simpan' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Print Preview Portal */}
      {showPrintPreview && createPortal(
        <div id="print-report-body-portal" className="fixed inset-0 bg-gray-900/95 text-white overflow-y-auto z-50 flex flex-col p-4 sm:p-6 md:p-8 animate-in fade-in duration-200">
          <style>{`
            @media print {
              #root {
                display: none !important;
              }
              #print-report-body-portal {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                background: white !important;
                color: black !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
                display: block !important;
              }
              .no-print {
                display: none !important;
              }
              .print-page {
                width: 210mm !important;
                height: 297mm !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                page-break-after: always !important;
                break-after: page !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                box-sizing: border-box !important;
                padding: 15mm !important;
                background: white !important;
                color: black !important;
              }
              .print-grid {
                display: grid !important;
                grid-template-cols: repeat(2, minmax(0, 1fr)) !important;
                gap: 16px !important;
                border: 2px solid black !important;
                padding: 16px !important;
                flex-grow: 1 !important;
                background: white !important;
              }
              .print-cell {
                border: 1px solid black !important;
                aspect-ratio: 4/3 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                overflow: hidden !important;
                background: white !important;
              }
              .print-img {
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
              }
              @page {
                size: A4 portrait;
                margin: 0;
              }
            }
          `}</style>

          {/* Top Control Bar (Hidden on print) */}
          <div className="no-print bg-gray-800 border border-gray-750 p-4 sm:p-5 rounded-2xl max-w-4xl w-full mx-auto shadow-2xl space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-sans font-black text-orange-500 uppercase tracking-wider flex items-center gap-2">
                  <Printer size={16} />
                  <span>{lang === 'id' ? 'Pengaturan Print PDF Laporan' : 'Print PDF Report Settings'}</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {lang === 'id' 
                    ? 'Tinjau tampilan lembar laporan sebelum mencetak atau menyimpan sebagai PDF' 
                    : 'Preview document pages before printing or saving to PDF file'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const originalTitle = document.title;
                    const activeProject = projects.find(p => p.id === selectedProjectFilter);
                    const projLabel = activeProject?.name || (customPrintTitle || 'Semua_Proyek');
                    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
                    const safeProjLabel = projLabel.replace(/[^a-zA-Z0-9]+/g, '_');
                    document.title = `EBA_PLATFORM_${safeProjLabel}_${timestamp}`;
                    window.print();
                    setTimeout(() => { document.title = originalTitle; }, 500);
                  }}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-[0.98]"
                >
                  <Printer size={13} />
                  <span>{lang === 'id' ? 'Cetak Sekarang' : 'Print Now'}</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowPrintPreview(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold rounded-xl transition-all"
                >
                  {lang === 'id' ? 'Tutup' : 'Close'}
                </button>
              </div>
            </div>

            {/* Control Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-750">
              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {lang === 'id' ? 'Judul Laporan (Kapital)' : 'Report Title (Caps)'}
                </label>
                <input
                  type="text"
                  value={customPrintTitle}
                  onChange={(e) => setCustomPrintTitle(e.target.value.toUpperCase())}
                  placeholder={lang === 'id' ? 'E.g. NAMA PROYEK' : 'E.g. PROJECT NAME'}
                  className="w-full px-3 py-2 text-xs border border-gray-700 bg-gray-900 text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* Print Scope selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {lang === 'id' ? 'Cakupan Foto Laporan' : 'Report Photos Scope'}
                </label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="flex items-center gap-2 text-xs cursor-pointer text-gray-300 hover:text-white">
                    <input
                      type="radio"
                      name="printScope"
                      checked={printScope === 'filtered'}
                      onChange={() => setPrintScope('filtered')}
                      className="accent-orange-500"
                    />
                    <span>
                      {lang === 'id' 
                        ? `Sesuai Filter Aktif (${filteredPhotos.length} foto)` 
                        : `Active Filtered Only (${filteredPhotos.length} photos)`}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer text-gray-300 hover:text-white">
                    <input
                      type="radio"
                      name="printScope"
                      checked={printScope === 'all-project'}
                      onChange={() => setPrintScope('all-project')}
                      className="accent-orange-500"
                    />
                    <span>
                      {lang === 'id' 
                        ? `Semua Foto Proyek (${photos.filter(ph => !selectedProjectFilter || ph.projectId === selectedProjectFilter).length} foto)` 
                        : `All Project Photos (${photos.filter(ph => !selectedProjectFilter || ph.projectId === selectedProjectFilter).length} photos)`}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Printable Canvas Wrapper */}
          <div className="no-print flex-grow flex items-start justify-center overflow-x-auto py-2">
            <div className="space-y-8 select-none">
              {(() => {
                const scopePhotos = getPhotosToPrint();
                const allImages = scopePhotos.flatMap(ph => (ph.images && ph.images.length > 0 ? ph.images : (ph.driveUrls || []))).map(src => getDisplayableImageSrc(src)).filter(Boolean);
                
                if (allImages.length === 0) {
                  return (
                    <div className="text-center text-gray-400 py-12 text-sm bg-gray-800 rounded-2xl p-8 max-w-md">
                      {lang === 'id' 
                        ? 'Tidak ada foto dokumentasi yang cocok dengan kriteria cetak.' 
                        : 'No documentation photos match the current print criteria.'}
                    </div>
                  );
                }

                const pageSize = 6;
                const pagesCount = Math.ceil(allImages.length / pageSize);
                
                return Array.from({ length: pagesCount }).map((_, pageIdx) => {
                  const pageImages = allImages.slice(pageIdx * pageSize, (pageIdx + 1) * pageSize);
                  return (
                    <div
                      key={pageIdx}
                      className="print-page bg-white text-black p-[15mm] shadow-2xl border border-gray-750/50 mx-auto flex flex-col justify-between"
                      style={{
                        width: '210mm',
                        height: '297mm',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Header */}
                      <div className="text-center mb-6">
                        <h1 className="text-xs sm:text-sm font-sans font-black underline uppercase tracking-wide text-black max-w-[95%] mx-auto leading-relaxed text-center">
                          {customPrintTitle || (lang === 'id' ? 'LAPORAN PROGRESS DOKUMENTASI' : 'PROJECT SITE PROGRESS DOCUMENTATION REPORT')}
                        </h1>
                      </div>

                      {/* 3x2 Grid Table */}
                      <div className="print-grid grid grid-cols-2 gap-4 border-2 border-black p-4 flex-grow bg-white">
                        {pageImages.map((src, imgIdx) => (
                          <div key={imgIdx} className="print-cell border border-black aspect-[4/3] flex items-center justify-center overflow-hidden bg-white">
                            <img src={src} className="print-img w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        ))}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-[10px] text-gray-500 mt-4 border-t border-gray-200 pt-2 print:border-t-0">
                        <span className="font-bold uppercase tracking-wider text-gray-400">
                          {lang === 'id' ? 'Laporan Progress Dokumentasi' : 'Documentation Progress Report'}
                        </span>
                        <span>
                          {lang === 'id' ? 'Halaman' : 'Page'} {pageIdx + 1} {lang === 'id' ? 'dari' : 'of'} {pagesCount}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Print-only duplicate target for clean window printing */}
          <div className="hidden print:block">
            {(() => {
              const scopePhotos = getPhotosToPrint();
              const allImages = scopePhotos.flatMap(ph => (ph.images && ph.images.length > 0 ? ph.images : (ph.driveUrls || []))).map(src => getDisplayableImageSrc(src)).filter(Boolean);
              const pageSize = 6;
              const pagesCount = Math.ceil(allImages.length / pageSize);
              
              return Array.from({ length: pagesCount }).map((_, pageIdx) => {
                const pageImages = allImages.slice(pageIdx * pageSize, (pageIdx + 1) * pageSize);
                return (
                  <div
                    key={pageIdx}
                    className="print-page bg-white text-black flex flex-col justify-between"
                    style={{
                      width: '210mm',
                      height: '297mm',
                      pageBreakAfter: 'always',
                      boxSizing: 'border-box',
                      padding: '15mm'
                    }}
                  >
                    <div className="text-center mb-6">
                      <h1 className="text-sm font-black underline uppercase tracking-wide text-black max-w-[95%] mx-auto leading-relaxed text-center">
                        {customPrintTitle || (lang === 'id' ? 'LAPORAN PROGRESS DOKUMENTASI' : 'PROJECT SITE PROGRESS DOCUMENTATION REPORT')}
                      </h1>
                    </div>

                    <div className="print-grid grid grid-cols-2 gap-4 border-2 border-black p-4 flex-grow bg-white">
                      {pageImages.map((src, imgIdx) => (
                        <div key={imgIdx} className="print-cell border border-black aspect-[4/3] flex items-center justify-center overflow-hidden bg-white">
                          <img src={src} className="print-img w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-500 mt-4 border-t border-gray-200 pt-2 print:border-t-0">
                      <span className="font-bold uppercase tracking-wider text-gray-400">
                        {lang === 'id' ? 'Laporan Progress Dokumentasi' : 'Documentation Progress Report'}
                      </span>
                      <span>
                        {lang === 'id' ? 'Halaman' : 'Page'} {pageIdx + 1} {lang === 'id' ? 'dari' : 'of'} {pagesCount}
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

        </div>,
        document.body
      )}

    </div>
  );
};
