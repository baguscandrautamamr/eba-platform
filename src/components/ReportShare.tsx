import React, { useState } from 'react';
import { Project, MaterialTransaction, Employee, Attendance, ProgressPhoto, Overtime, OtherExpense, Language } from '../types';
import { Share2, Calendar, FileText, CheckCircle, Copy, Check } from 'lucide-react';

interface ReportShareProps {
  projects: Project[];
  materials: MaterialTransaction[];
  employees: Employee[];
  attendance: Attendance[];
  overtimes?: Overtime[];
  otherExpenses?: OtherExpense[];
  photos: ProgressPhoto[];
  lang: Language;
}

export const ReportShare: React.FC<ReportShareProps> = ({
  projects,
  materials,
  employees,
  attendance,
  overtimes = [],
  otherExpenses = [],
  photos,
  lang
}) => {
  const [selProjId, setSelProjId] = useState(projects[0]?.id || '');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [copied, setCopied] = useState(false);

  // Selected Project object
  const activeProj = projects.find(p => p.id === selProjId) || projects[0];

  // Compile daily summaries for selected project and date
  // PENTING: filter berdasarkan projectId JUGA, bukan cuma tanggal —
  // supaya laporan proyek A tidak menampilkan pegawai yang sebenarnya kerja di proyek B hari itu.
  const projectAttendance = attendance.filter(a => a.date === reportDate && a.projectId === selProjId);
  const projectOvertimes = overtimes.filter(o => o.date === reportDate && o.projectId === selProjId);
  const projectMaterials = materials.filter(m => m.projectId === selProjId && m.date === reportDate);
  const projectOtherExpenses = otherExpenses.filter(x => x.projectId === selProjId && x.date === reportDate);
  const projectPhotos = photos.filter(p => p.projectId === selProjId && p.date === reportDate);

  // Rincian anggaran terpakai HARI INI untuk proyek ini (bukan akumulasi keseluruhan proyek)
  const dailyMaterialCost = projectMaterials
    .filter(m => m.type === 'masuk')
    .reduce((acc, m) => acc + m.totalPrice, 0);
  const dailyOvertimeCost = projectOvertimes.reduce((acc, o) => acc + o.totalAmount, 0);
  const dailySalaryCost = projectAttendance
    .filter(a => a.status === 'hadir')
    .reduce((acc, a) => {
      const emp = employees.find(e => e.id === a.employeeId);
      return acc + (emp?.dailySalary || 0);
    }, 0);
  const dailyOtherExpenseCost = projectOtherExpenses.reduce((acc, x) => acc + x.amount, 0);
  const dailyTotalSpent = dailyMaterialCost + dailyOvertimeCost + dailySalaryCost + dailyOtherExpenseCost;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Format Indonesian Contractor Daily Report Message
  const compileReportText = () => {
    if (!activeProj) return '';

    const title = `*LAPORAN HARIAN PROYEK - EBA PROJECT*\n` +
                  `=====================================\n` +
                  `Proyek  : *${activeProj.name}*\n` +
                  `Tanggal : *${reportDate}*\n` +
                  `=====================================\n\n`;

    // 👷 Attendance
    let attendanceText = `👷 *KEHADIRAN & ABSENSI TIM*:\n`;
    if (projectAttendance.length === 0) {
      attendanceText += `_Belum ada data absensi diisi untuk proyek ini._\n`;
    } else {
      projectAttendance.forEach(a => {
        const emp = employees.find(e => e.id === a.employeeId);
        const roleStr = emp ? `(${emp.role})` : '';
        const statusStr = a.status === 'hadir' ? '✅ HADIR' : 
                          a.status === 'absen' ? '❌ ALPHA' : 
                          a.status === 'izin' ? '⚠️ IZIN' : 
                          a.status === 'sakit' ? '🤒 SAKIT' :
                          '🏖️ LIBUR';
        const noteStr = a.note ? ` (${a.note})` : '';
        attendanceText += `- ${a.employeeName} ${roleStr}: *${statusStr}*${noteStr}\n`;
      });
    }
    attendanceText += `\n`;

    // ⏱️ Lembur (Overtime) — hanya yang terkait proyek ini hari ini
    let overtimeText = `⏱️ *LEMBUR LAPANGAN*:\n`;
    if (projectOvertimes.length === 0) {
      overtimeText += `_Tidak ada lembur tercatat untuk proyek ini hari ini._\n`;
    } else {
      let totalOvertimeCost = 0;
      projectOvertimes.forEach(o => {
        totalOvertimeCost += o.totalAmount;
        overtimeText += `- ${o.employeeName}: *${o.hours} jam* (${formatRupiah(o.totalAmount)})${o.note ? ` — ${o.note}` : ''}\n`;
      });
      overtimeText += `_Total biaya lembur: *${formatRupiah(totalOvertimeCost)}*_\n`;
    }
    overtimeText += `\n`;

    // 📦 Materials In (Masuk)
    let materialText = `📦 *LOG MATERIAL MASUK*:\n`;
    const inbound = projectMaterials.filter(m => m.type === 'masuk');
    if (inbound.length === 0) {
      materialText += `_Tidak ada material masuk hari ini._\n`;
    } else {
      inbound.forEach(m => {
        materialText += `- ${m.quantity} ${m.unit} *${m.itemName}* (Ket: ${m.note || '-'})\n`;
      });
    }
    materialText += `\n`;

    // 💸 Pengeluaran Lapangan Lainnya
    let otherExpenseText = `💸 *PENGELUARAN LAPANGAN LAINNYA*:\n`;
    if (projectOtherExpenses.length === 0) {
      otherExpenseText += `_Tidak ada pengeluaran lain tercatat hari ini._\n`;
    } else {
      projectOtherExpenses.forEach(x => {
        otherExpenseText += `- ${x.category}: *${formatRupiah(x.amount)}*${x.note ? ` — ${x.note}` : ''}\n`;
      });
      otherExpenseText += `_Total pengeluaran lain: *${formatRupiah(dailyOtherExpenseCost)}*_\n`;
    }
    otherExpenseText += `\n`;

    // 💰 Rincian Anggaran Terpakai Hari Ini
    let budgetText = `💰 *RINCIAN ANGGARAN TERPAKAI HARI INI*:\n`;
    budgetText += `- Material: ${dailyMaterialCost > 0 ? formatRupiah(dailyMaterialCost) : '-'}\n`;
    budgetText += `- Lembur Pegawai: ${dailyOvertimeCost > 0 ? formatRupiah(dailyOvertimeCost) : '-'}\n`;
    budgetText += `- Gaji Pegawai (Hadir): ${dailySalaryCost > 0 ? formatRupiah(dailySalaryCost) : '-'}\n`;
    budgetText += `- Pengeluaran Lain: ${dailyOtherExpenseCost > 0 ? formatRupiah(dailyOtherExpenseCost) : '-'}\n`;
    budgetText += `_*TOTAL TERPAKAI HARI INI: ${formatRupiah(dailyTotalSpent)}*_\n`;
    if (activeProj.budget) {
      const remainingBudget = activeProj.budget - dailyTotalSpent;
      budgetText += `_Sisa anggaran proyek (setelah hari ini): ${formatRupiah(Math.max(remainingBudget, 0))}_\n`;
    }
    budgetText += `\n`;

    // 📷 Progress photos & Notes
    let progressText = `📷 *DOKUMENTASI PROGRESS LAPANGAN*:\n`;
    if (projectPhotos.length === 0) {
      progressText += `_Belum ada foto progress diunggah hari ini._\n`;
    } else {
      projectPhotos.forEach((p, i) => {
        progressText += `[Progres #${i+1}] ${p.notes}\n`;
        if (p.gpsLocation) {
          progressText += `📍 GPS: ${p.gpsLocation.split('(')[1]?.replace(')', '') || 'Koordinat Terlampir'}\n`;
        }
      });
    }
    progressText += `\n`;

    const footer = `=====================================\n` +
                   `_Dikirim otomatis via PWA EBA PROJECT_`;

    return `${title}${attendanceText}${overtimeText}${materialText}${otherExpenseText}${budgetText}${progressText}${footer}`;
  };

  const reportText = compileReportText();

  const handleShareWhatsApp = () => {
    if (!reportText) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(reportText)}`;
    window.open(url, '_blank');
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6" id="report-share-tab">
      
      {/* Parameters Panel */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
        <div>
          <span className="px-2 py-0.5 text-[9px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 rounded uppercase tracking-wider">
            WhatsApp Integration
          </span>
          <h3 className="font-sans font-bold text-sm sm:text-base text-gray-900 dark:text-white mt-1.5">
            {lang === 'id' ? 'Kirim Laporan Harian WA' : 'WhatsApp Daily Report Broadcaster'}
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {lang === 'id' ? 'Kompilasi otomatis log absensi tim, material datang, dan foto progres harian dalam 1 tombol' : 'Synthesize site presence, material arrivals, and camera photo logs into a single text broadcast'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Select Project */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Proyek' : 'Project'}</label>
            <select
              value={selProjId}
              onChange={(e) => setSelProjId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Select Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Tanggal Laporan' : 'Report Date'}</label>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-400" />
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Compiled Report Preview Box */}
      {activeProj && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="report-compiled-preview-area">
          
          {/* Formatted Text Box */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <h4 className="text-xs font-bold text-gray-950 dark:text-gray-100 flex items-center gap-2">
                <FileText size={15} className="text-emerald-600" />
                <span>{lang === 'id' ? 'Preview Draf Laporan Harian' : 'Compiled Draft Preview'}</span>
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyToClipboard}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-850 text-[10px] font-bold text-gray-700 dark:text-gray-350 rounded-lg flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Rich formatted monospace textarea preview */}
            <pre className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-850/80 font-mono text-[11px] leading-relaxed text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap max-h-[400px]">
              {reportText}
            </pre>
          </div>

          {/* Quick Stats sidebar & Call-To-Action sharing button */}
          <div className="bg-emerald-50/10 dark:bg-gray-800/40 border border-emerald-100/50 dark:border-gray-700 p-5 rounded-2xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">{lang === 'id' ? 'Ikhtisar Hari Ini' : 'Today\'s Digest'}</h4>
              
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-100 dark:border-gray-850">
                  <span className="text-gray-500">{lang === 'id' ? 'Pekerja Hadir' : 'Workers Present'}</span>
                  <span className="font-bold font-mono text-gray-950 dark:text-white">
                    {projectAttendance.filter(a => a.status === 'hadir').length} {lang === 'id' ? 'Orang' : 'Staff'}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-100 dark:border-gray-850">
                  <span className="text-gray-500">{lang === 'id' ? 'Bahan Masuk' : 'Supplies Arrived'}</span>
                  <span className="font-bold font-mono text-gray-950 dark:text-white">
                    {projectMaterials.filter(m => m.type === 'masuk').length} {lang === 'id' ? 'Item' : 'Items'}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-100 dark:border-gray-850">
                  <span className="text-gray-500">{lang === 'id' ? 'Foto Progress' : 'Camera Snapshots'}</span>
                  <span className="font-bold font-mono text-gray-950 dark:text-white">
                    {projectPhotos.length} {lang === 'id' ? 'Foto' : 'Photos'}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-orange-50 dark:bg-orange-950/20 p-2.5 rounded-xl border border-orange-100 dark:border-orange-900/30">
                  <span className="text-orange-700 dark:text-orange-400 font-semibold">{lang === 'id' ? 'Terpakai Hari Ini' : 'Spent Today'}</span>
                  <span className="font-bold font-mono text-orange-700 dark:text-orange-400">
                    {formatRupiah(dailyTotalSpent)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleShareWhatsApp}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all text-xs"
              id="send-whatsapp-trigger"
            >
              <Share2 size={15} />
              <span>{lang === 'id' ? 'BAGIKAN LAPORAN KE WA' : 'BROADCAST TO WHATSAPP'}</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
