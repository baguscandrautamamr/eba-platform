import React, { useState, useRef } from 'react';
import { Project, ProgressPhoto, Language, UserRole } from '../types';
import { Camera, Image as ImageIcon, MapPin, Loader2, UploadCloud, CheckCircle, WifiOff, RefreshCw, Layers, Edit2, Trash2, Calendar } from 'lucide-react';

interface ProgressPhotosProps {
  projects: Project[];
  photos: ProgressPhoto[];
  onAddPhoto: (photo: Omit<ProgressPhoto, 'id' | 'watermarked'>) => void;
  onUpdatePhoto: (photo: ProgressPhoto) => void;
  onDeletePhoto: (id: string) => void;
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
  // Editing and Deleting state
  const [editingPhoto, setEditingPhoto] = useState<ProgressPhoto | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter states
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('');
  const [timeRangeFilter, setTimeRangeFilter] = useState<'all' | 'today' | 'week' | 'month' | 'lastMonth' | 'twoMonthsAgo'>('all');

  // Lightbox Detail state
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState<ProgressPhoto | null>(null);

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
  const [capturing, setCapturing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]); // Base64s of watermarked images
  const [includeGps, setIncludeGps] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Simulated GPS details based on Project
  const getGpsForProject = (projId: string) => {
    if (projId === 'proj_1') return "-6.2088, 106.8456 (Gedung EBA - Jakarta Selatan)";
    if (projId === 'proj_2') return "-6.2736, 106.7248 (Bintaro Jaya Mall - Tangerang)";
    return "-6.1751, 106.8272 (Proyek MEP Central - Jakarta Pusat)";
  };

  // Watermark implementation using canvas
  const processImageAndApplyWatermark = (base64Str: string, projectName: string, gps: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Keep size of image
        canvas.width = img.width || 800;
        canvas.height = img.height || 600;
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

        resolve(canvas.toDataURL('image/jpeg'));
      };
    });
  };

  // Multi file selector
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setCapturing(true);
    const activeProjectName = projects.find(p => p.id === selProjId)?.name || 'EBA Proyek';
    const activeGps = getGpsForProject(selProjId);

    const base64Promises = Array.from(files).map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file as Blob);
        reader.onload = () => resolve(reader.result as string);
      });
    });

    const base64s = await Promise.all(base64Promises);
    
    // Watermark all selected files
    const watermarkedBase64s = await Promise.all(
      base64s.map(b64 => processImageAndApplyWatermark(b64, activeProjectName, activeGps))
    );

    setSelectedFiles((prev) => [...prev, ...watermarkedBase64s].slice(0, 5)); // max 5 photos
    setCapturing(false);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    const projObj = projects.find(p => p.id === selProjId);
    const activeProjectName = projObj?.name || 'EBA Proyek';
    const activeGps = getGpsForProject(selProjId);

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];

    const payload = {
      projectId: selProjId,
      projectName: activeProjectName,
      date,
      time,
      notes,
      images: selectedFiles,
      gpsLocation: includeGps ? activeGps : undefined
    };

    if (isOffline) {
      // Add to offline queue
      onAddOfflineItem('photo', payload);
      setNotes('');
      setSelectedFiles([]);
      alert(lang === 'id' ? 'Tersimpan dalam antrean upload offline! Foto akan terkirim setelah online.' : 'Saved in offline upload queue! Photos will sync once online.');
    } else {
      // Sync immediately
      onAddPhoto(payload);
      setNotes('');
      setSelectedFiles([]);
    }
  };

  return (
    <div className="space-y-6" id="progress-photos-tab">
      
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Project dropdown selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
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
              {lang === 'id' ? 'Klik foto untuk melihat keterangan lengkap dan detail gambar' : 'Click any photo thumbnail to see detailed notes and GPS location'}
            </p>
          </div>
          <span className="text-[10px] font-mono text-gray-400 font-bold bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded-md">
            {filteredPhotos.length} {lang === 'id' ? 'Foto' : 'Photos'}
          </span>
        </div>

        {/* Dense grid of smaller thumbnails */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5" id="photo-gallery-grid">
          {filteredPhotos.map((ph) => (
            <div
              key={ph.id}
              onClick={() => setActiveLightboxPhoto(ph)}
              className="group aspect-square bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-150 dark:border-gray-750 shadow-sm overflow-hidden relative cursor-pointer hover:shadow-md hover:border-orange-200 transition-all duration-200 animate-in fade-in"
            >
              <img
                src={ph.images[0]}
                alt="Progress thumbnail"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
              
              {/* Subtle hover/touch info badge overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-[9px] text-white">
                <p className="font-bold truncate">{ph.projectName}</p>
                <p className="font-mono text-gray-300 mt-0.5">{ph.date}</p>
              </div>

              {/* Verified Badge */}
              <div className="absolute top-1.5 right-1.5 bg-emerald-600 text-white font-mono text-[7px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                ✓
              </div>
            </div>
          ))}

          {filteredPhotos.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-400 dark:text-gray-500 text-xs">
              {lang === 'id' ? 'Tidak ada foto dokumentasi yang cocok dengan filter.' : 'No progress photos match the selected filters.'}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Detail View Modal */}
      {activeLightboxPhoto && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/60 shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-750 flex items-center justify-between">
              <div>
                <h4 className="font-sans font-bold text-xs text-orange-600 dark:text-orange-400 uppercase tracking-wider">{activeLightboxPhoto.projectName}</h4>
                <p className="text-[10px] text-gray-450 font-mono mt-0.5">Dokumentasi Lapangan | {activeLightboxPhoto.date} {activeLightboxPhoto.time}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveLightboxPhoto(null)}
                className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-900 hover:bg-gray-250 dark:hover:bg-gray-800 text-gray-650 dark:text-gray-400 flex items-center justify-center font-bold text-sm transition-colors"
              >
                ×
              </button>
            </div>

            {/* Photo Preview Stage */}
            <div className="bg-black flex items-center justify-center relative aspect-video sm:max-h-[380px]">
              <img
                src={activeLightboxPhoto.images[0]}
                alt="Fullscreen Doc"
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
              
              {activeLightboxPhoto.gpsLocation && (
                <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[9px] font-bold text-sky-400 flex items-center gap-1 shadow-sm">
                  <MapPin size={10} />
                  <span>{activeLightboxPhoto.gpsLocation}</span>
                </div>
              )}
            </div>

            {/* Footer with Description and actions */}
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <span className="text-[9px] font-black text-gray-400 dark:text-gray-550 uppercase tracking-widest">{lang === 'id' ? 'Catatan Lapangan' : 'Field Notes'}</span>
                <p className="text-xs text-gray-700 dark:text-gray-250 bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-100 dark:border-gray-850 leading-relaxed">
                  {activeLightboxPhoto.notes}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-750">
                <div className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 uppercase bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-900/20">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  <span>{lang === 'id' ? 'Terverifikasi Cloud' : 'Cloud Synchronized'}</span>
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
                        onClick={() => { onDeletePhoto(activeLightboxPhoto.id); setDeleteConfirmId(null); setActiveLightboxPhoto(null); }}
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

    </div>
  );
};
