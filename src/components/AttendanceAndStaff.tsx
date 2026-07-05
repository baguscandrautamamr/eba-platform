import React, { useState } from 'react';
import { Employee, Attendance, Kasbon, Overtime, Language, UserRole, Project } from '../types';
import { Plus, Users, Calendar, Clock, DollarSign, FileText, CheckCircle, Lock, Printer, Share2, Search, Edit2, Trash2 } from 'lucide-react';
import { formatNumberInput, parseFormattedNumber } from '../utils/currency';

interface AttendanceAndStaffProps {
  employees: Employee[];
  attendance: Attendance[];
  kasbons: Kasbon[];
  overtimes: Overtime[];
  projects?: Project[];
  onAddEmployee: (emp: Omit<Employee, 'id'>) => void;
  onUpdateEmployee?: (emp: Employee) => void;
  onDeleteEmployee?: (id: string) => void;
  onLogAttendance: (att: Omit<Attendance, 'id'>[]) => void;
  onAddKasbon: (kas: Omit<Kasbon, 'id'>) => void;
  onUpdateKasbon?: (kas: Kasbon) => void;
  onDeleteKasbon?: (id: string) => void;
  onAddOvertime: (ov: Omit<Overtime, 'id' | 'totalAmount'>) => void;
  onUpdateOvertime?: (ov: Overtime) => void;
  onDeleteOvertime?: (id: string) => void;
  lang: Language;
  role: UserRole;
}

export const AttendanceAndStaff: React.FC<AttendanceAndStaffProps> = ({
  employees,
  attendance,
  kasbons,
  overtimes,
  projects = [],
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onLogAttendance,
  onAddKasbon,
  onUpdateKasbon,
  onDeleteKasbon,
  onAddOvertime,
  onUpdateOvertime,
  onDeleteOvertime,
  lang,
  role
}) => {
  const [subTab, setSubTab] = useState<'roster' | 'absen' | 'kasbon' | 'lembur' | 'payslip'>('absen');
  const [mainTab, setMainTab] = useState<'presence' | 'finance'>('presence');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttProjectId, setSelectedAttProjectId] = useState(projects[0]?.id || '');

  // Edit & Delete Employee states
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteConfirmEmpId, setDeleteConfirmEmpId] = useState<string | null>(null);

  // Edit & Delete Kasbon states
  const [editingKasbon, setEditingKasbon] = useState<Kasbon | null>(null);
  const [deleteConfirmKasId, setDeleteConfirmKasId] = useState<string | null>(null);

  // Edit & Delete Overtime states
  const [editingOvertime, setEditingOvertime] = useState<Overtime | null>(null);
  const [deleteConfirmOvId, setDeleteConfirmOvId] = useState<string | null>(null);

  // Inline Overtime state for Attendance logging
  const [inlineOvertimes, setInlineOvertimes] = useState<Record<string, { enabled: boolean; hours: number; note: string }>>({});

  // Filtered lists for search
  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOvertimes = overtimes.filter(o => 
    o.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredKasbons = kasbons.filter(k => 
    k.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // New Employee Form
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('Tukang Listrik (ME)');
  const [empWage, setEmpWage] = useState('150.000');

  // Attendance Form
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyPresence, setDailyPresence] = useState<Record<string, { status: 'hadir' | 'absen' | 'izin' | 'sakit' | 'libur'; note: string; projectId: string }>>(
    employees.reduce((acc, emp) => ({
      ...acc,
      [emp.id]: { status: 'hadir', note: '', projectId: projects[0]?.id || '' }
    }), {})
  );

  // New Kasbon Form
  const [kasEmpId, setKasEmpId] = useState(employees[0]?.id || '');
  const [kasAmt, setKasAmt] = useState<string | number>('');
  const [kasNote, setKasNote] = useState('');

  // New Overtime Form
  const [ovEmpId, setOvEmpId] = useState(employees[0]?.id || '');
  const [ovHours, setOvHours] = useState(2);
  const [ovRate, setOvRate] = useState('25.000');
  const [ovNote, setOvNote] = useState('');

  // Payroll Slip Generator state
  const [slipEmpId, setSlipEmpId] = useState(employees[0]?.id || '');
  const [slipDateStart, setSlipDateStart] = useState('2026-07-01');
  const [slipDateEnd, setSlipDateEnd] = useState('2026-07-03');

  const handleAddEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName) return;
    onAddEmployee({ name: empName, role: empRole, dailySalary: parseFormattedNumber(empWage) });
    setEmpName('');
    setEmpWage('150.000');
    setShowAddEmp(false);
  };

  const handleEditEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmployee && onUpdateEmployee) {
      onUpdateEmployee(editingEmployee);
      setEditingEmployee(null);
    }
  };

  const handleEditKasbonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingKasbon && onUpdateKasbon) {
      onUpdateKasbon(editingKasbon);
      setEditingKasbon(null);
    }
  };

  const handleEditOvertimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOvertime && onUpdateOvertime) {
      onUpdateOvertime(editingOvertime);
      setEditingOvertime(null);
    }
  };

  const handleAttendanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Setiap pegawai bisa di-absen untuk proyek berbeda pada hari yang sama —
    // projectId diambil dari pilihan masing-masing baris pegawai (dailyPresence),
    // bukan dari 1 dropdown global.
    const records = filteredEmployees.map(emp => {
      const state = dailyPresence[emp.id] || { status: 'hadir', note: '', projectId: projects[0]?.id || '' };
      const proj = projects.find(p => p.id === state.projectId);
      return {
        date: attendanceDate,
        employeeId: emp.id,
        employeeName: emp.name,
        status: state.status,
        note: state.note,
        projectId: proj?.id || '',
        projectName: proj?.name || ''
      };
    });
    onLogAttendance(records);

    // Process inline overtimes — linked ke project yang dipilih untuk pegawai itu hari itu
    Object.keys(inlineOvertimes).forEach((empId) => {
      const ovState = inlineOvertimes[empId];
      if (ovState && ovState.enabled && ovState.hours > 0) {
        const emp = employees.find(e => e.id === empId);
        if (emp) {
          const empState = dailyPresence[empId] || { status: 'hadir', note: '', projectId: projects[0]?.id || '' };
          const proj = projects.find(p => p.id === empState.projectId);
          // Standard rate/hour is 25000 or custom default
          onAddOvertime({
            employeeId: emp.id,
            employeeName: emp.name,
            date: attendanceDate,
            hours: ovState.hours,
            hourlyRate: 25000,
            note: ovState.note || (lang === 'id' ? 'Lembur Harian' : 'Daily Overtime'),
            projectId: proj?.id || '',
            projectName: proj?.name || ''
          });
        }
      }
    });


    // Reset inline overtime states
    setInlineOvertimes({});

    alert(lang === 'id' ? 'Berhasil mengunci absensi hari ini!' : 'Attendance locked for selected date!');
  };

  const handleAddKasbonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kasAmt || !kasEmpId) return;
    onAddKasbon({
      date: new Date().toISOString().split('T')[0],
      employeeId: kasEmpId,
      employeeName: employees.find(e => e.id === kasEmpId)?.name || '',
      amount: parseFormattedNumber(String(kasAmt)),
      note: kasNote
    });
    setKasAmt('');
    setKasNote('');
    alert('Kasbon berhasil dicatat!');
  };

  const handleAddOvertimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ovHours || !ovEmpId) return;
    onAddOvertime({
      date: new Date().toISOString().split('T')[0],
      employeeId: ovEmpId,
      employeeName: employees.find(e => e.id === ovEmpId)?.name || '',
      hours: Number(ovHours),
      hourlyRate: parseFormattedNumber(ovRate),
      note: ovNote
    });
    setOvHours(2);
    setOvRate('25.000');
    setOvNote('');
    alert('Lembur berhasil dicatat!');
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Slip calculation variables
  const selectedSlipEmployee = employees.find(e => e.id === slipEmpId);
  
  const getEmployeePayrollStats = (empId: string, start: string, end: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return { attendanceDays: 0, basicSalary: 0, overtimeEarned: 0, kasbonDeducted: 0, netSalary: 0 };

    // filter attendance inside range
    const rangeAttendance = attendance.filter(a => 
      a.employeeId === empId && 
      a.date >= start && 
      a.date <= end && 
      a.status === 'hadir'
    );
    const attendanceDays = rangeAttendance.length;
    const basicSalary = attendanceDays * emp.dailySalary;

    // overtimes inside range
    const rangeOvertimes = overtimes.filter(o => 
      o.employeeId === empId && 
      o.date >= start && 
      o.date <= end
    );
    const overtimeEarned = rangeOvertimes.reduce((acc, o) => acc + o.totalAmount, 0);

    // kasbons inside range
    const rangeKasbons = kasbons.filter(k => 
      k.employeeId === empId && 
      k.date >= start && 
      k.date <= end
    );
    const kasbonDeducted = rangeKasbons.reduce((acc, k) => acc + k.amount, 0);

    const netSalary = basicSalary + overtimeEarned - kasbonDeducted;

    return {
      attendanceDays,
      basicSalary,
      overtimeEarned,
      kasbonDeducted,
      netSalary,
      rangeOvertimes,
      rangeKasbons
    };
  };

  const payroll = getEmployeePayrollStats(slipEmpId, slipDateStart, slipDateEnd);

  const handleSharePayslipWA = () => {
    if (!selectedSlipEmployee) return;
    const msg = `*SLIP GAJI EBA PROJECT*\n` +
      `-----------------------------------------\n` +
      `Nama Pegawai : ${selectedSlipEmployee.name}\n` +
      `Jabatan      : ${selectedSlipEmployee.role}\n` +
      `Periode      : ${slipDateStart} s/d ${slipDateEnd}\n` +
      `-----------------------------------------\n` +
      `Hadir Kerja  : ${payroll.attendanceDays} hari x ${formatRupiah(selectedSlipEmployee.dailySalary)}\n` +
      `Gaji Pokok   : ${formatRupiah(payroll.basicSalary)}\n` +
      `Uang Lembur  : ${formatRupiah(payroll.overtimeEarned)}\n` +
      `Potong Kasbon: -${formatRupiah(payroll.kasbonDeducted)}\n` +
      `-----------------------------------------\n` +
      `*GAJI BERSIH : ${formatRupiah(payroll.netSalary)}*\n` +
      `-----------------------------------------\n` +
      `Terima kasih atas kerja keras Anda di lapangan. EBA PROJECT MEP.`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // User safety
  const isMandor = role === 'user';

  return (
    <div className="space-y-6" id="attendance-payroll-tab">
      
      {/* Main Tabs Bar: Divided into exactly two sections */}
      {!isMandor ? (
        <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-2xl" id="staff-main-tabs">
          <button
            type="button"
            onClick={() => {
              setMainTab('presence');
              setSubTab('absen');
            }}
            className={`py-2.5 text-xs font-bold rounded-xl transition-all text-center ${
              mainTab === 'presence'
                ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-500 shadow-sm font-extrabold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            {lang === 'id' ? 'Kehadiran & Lembur' : 'Attendance & Overtime'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMainTab('finance');
              setSubTab('roster');
            }}
            className={`py-2.5 text-xs font-bold rounded-xl transition-all text-center ${
              mainTab === 'finance'
                ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-500 shadow-sm font-extrabold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            {lang === 'id' ? 'Keuangan & Gaji' : 'Finance & Payroll'}
          </button>
        </div>
      ) : (
        <div className="bg-orange-50 dark:bg-orange-950/20 px-4 py-3 rounded-xl border border-orange-100 dark:border-orange-900/30 text-xs font-extrabold text-orange-800 dark:text-orange-400">
          {lang === 'id' ? 'Menu Absensi Mandor Lapangan' : 'Field Mandor Attendance Panel'}
        </div>
      )}

      {/* Secondary Selector inside Attendance Tab */}
      {mainTab === 'presence' && (
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-50/50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800/80 rounded-xl" id="presence-sub-tabs">
          <button
            type="button"
            onClick={() => setSubTab('absen')}
            className={`py-1.5 text-[10px] font-bold rounded-lg transition-all text-center uppercase tracking-wider ${
              subTab === 'absen'
                ? 'bg-orange-500 text-white shadow-sm font-extrabold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            {lang === 'id' ? '1. Catat Absensi' : '1. Daily Attendance'}
          </button>
          <button
            type="button"
            onClick={() => setSubTab('lembur')}
            className={`py-1.5 text-[10px] font-bold rounded-lg transition-all text-center uppercase tracking-wider ${
              subTab === 'lembur'
                ? 'bg-orange-500 text-white shadow-sm font-extrabold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            {lang === 'id' ? '2. Lembur Pegawai' : '2. Overtime Log'}
          </button>
        </div>
      )}

      {/* Secondary Selector inside Finance Tab (Only for non-mandor) */}
      {mainTab === 'finance' && !isMandor && (
        <div className="grid grid-cols-3 gap-1 p-1 bg-gray-50/50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800/80 rounded-xl" id="finance-sub-tabs">
          <button
            type="button"
            onClick={() => setSubTab('roster')}
            className={`py-1.5 text-[9px] sm:text-[10px] font-bold rounded-lg transition-all text-center uppercase leading-tight ${
              subTab === 'roster'
                ? 'bg-orange-500 text-white shadow-sm font-extrabold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-750'
            }`}
          >
            {lang === 'id' ? '1. Roster Gaji' : '1. Roster'}
          </button>
          <button
            type="button"
            onClick={() => setSubTab('kasbon')}
            className={`py-1.5 text-[9px] sm:text-[10px] font-bold rounded-lg transition-all text-center uppercase leading-tight ${
              subTab === 'kasbon'
                ? 'bg-orange-500 text-white shadow-sm font-extrabold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-750'
            }`}
          >
            {lang === 'id' ? '2. Kasbon' : '2. Advance'}
          </button>
          <button
            type="button"
            onClick={() => setSubTab('payslip')}
            className={`py-1.5 text-[9px] sm:text-[10px] font-bold rounded-lg transition-all text-center uppercase leading-tight ${
              subTab === 'payslip'
                ? 'bg-orange-500 text-white shadow-sm font-extrabold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-750'
            }`}
          >
            {lang === 'id' ? '3. Hitung Gaji' : '3. Payslips'}
          </button>
        </div>
      )}

      {/* Search Filter Panel */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex-1 w-full flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 gap-2 animate-in fade-in duration-100">
          <Search size={14} className="text-gray-400 animate-pulse" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-gray-900 dark:text-white w-full"
            placeholder={lang === 'id' ? 'Cari nama atau peran pekerja...' : 'Search worker name or role...'}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-755 font-bold px-1.5 transition-colors"
            >
              {lang === 'id' ? 'Bersihkan' : 'Clear'}
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold self-end sm:self-center">
            {lang === 'id' ? `Menampilkan ${filteredEmployees.length} dari ${employees.length} pekerja` : `Showing ${filteredEmployees.length} of ${employees.length} workers`}
          </div>
        )}
      </div>

      {/* Sub Tab: Daily Attendance Grid */}
      {subTab === 'absen' && (
        <div className="space-y-4" id="absen-view">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-sans font-bold text-sm text-gray-900 dark:text-white">
                {lang === 'id' ? 'Presensi Harian Lapangan' : 'Daily Worker Attendance'}
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {lang === 'id' ? 'Pilih tanggal, sesuaikan kehadiran pekerja, lalu kunci data' : 'Set worker attendance state, optional notes, and click lock'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {projects.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedAttProjectId}
                    onChange={(e) => setSelectedAttProjectId(e.target.value)}
                    className="px-3 py-1.5 text-xs border rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      // Terapkan proyek terpilih ke SEMUA baris pegawai sekaligus (bisa di-override per orang)
                      const updated = { ...dailyPresence };
                      filteredEmployees.forEach(emp => {
                        updated[emp.id] = { ...(updated[emp.id] || { status: 'hadir', note: '' }), projectId: selectedAttProjectId };
                      });
                      setDailyPresence(updated);
                    }}
                    className="px-2.5 py-1.5 text-[10px] font-bold bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-800 whitespace-nowrap"
                    title={lang === 'id' ? 'Terapkan proyek ini ke semua pegawai (bisa diubah per orang di bawah)' : 'Apply this project to all workers (can be overridden per row below)'}
                  >
                    {lang === 'id' ? 'Terapkan ke Semua' : 'Apply to All'}
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-400" />
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="px-3 py-1.5 text-xs border rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>
          </div>

          <p className="text-[10px] text-amber-600 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 px-3 py-2 rounded-xl">
            💡 {lang === 'id' 
              ? 'Setiap pegawai bisa dipilih proyeknya masing-masing di bawah — cocok untuk tim yang pindah lokasi kerja setiap hari.' 
              : 'Each worker can have their own project selected below — ideal for teams that move between sites daily.'}
          </p>

          <form onSubmit={handleAttendanceSubmit} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden p-5 space-y-4">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredEmployees.length === 0 ? (
                <div className="py-8 text-center text-gray-450 dark:text-gray-500 text-xs font-medium">
                  {lang === 'id' ? 'Tidak ada pekerja yang cocok dengan pencarian Anda.' : 'No workers match your search query.'}
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const state = dailyPresence[emp.id] || { status: 'hadir', note: '', projectId: projects[0]?.id || '' };
                  return (
                    <div key={emp.id} className="py-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0 animate-in fade-in duration-100">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-gray-950 dark:text-gray-100">{emp.name}</h4>
                          <p className="text-[10px] text-gray-400">{emp.role}</p>
                          {projects.length > 0 && (
                            <select
                              value={state.projectId || projects[0]?.id || ''}
                              onChange={(e) => setDailyPresence({
                                ...dailyPresence,
                                [emp.id]: { ...state, projectId: e.target.value }
                              })}
                              className="mt-1 text-[10px] font-bold px-2 py-1 border border-orange-200 dark:border-orange-900/40 rounded-lg bg-orange-50/50 dark:bg-orange-950/10 text-orange-700 dark:text-orange-400"
                            >
                              {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Attendance status radio triggers */}
                          <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1 text-[10px] font-bold">
                            {(['hadir', 'absen', 'izin', 'sakit', 'libur'] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setDailyPresence({
                                  ...dailyPresence,
                                  [emp.id]: { ...state, status: st }
                                })}
                                className={`px-2.5 py-1 rounded-md transition-all uppercase ${
                                  state.status === st
                                    ? st === 'hadir' ? 'bg-emerald-500 text-white shadow-sm' :
                                      st === 'absen' ? 'bg-red-500 text-white shadow-sm' :
                                      st === 'izin' ? 'bg-amber-500 text-white shadow-sm' :
                                      st === 'sakit' ? 'bg-blue-500 text-white shadow-sm' :
                                      'bg-slate-500 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                              >
                                {st === 'hadir' ? (lang === 'id' ? 'HADIR' : 'PRES') :
                                 st === 'absen' ? (lang === 'id' ? 'ALPHA' : 'ABS') :
                                 st === 'izin' ? (lang === 'id' ? 'IZIN' : 'EXC') :
                                 st === 'sakit' ? (lang === 'id' ? 'SAKIT' : 'SICK') :
                                 (lang === 'id' ? 'LIBUR' : 'OFF')}
                              </button>
                            ))}
                          </div>

                          {/* Presence note */}
                          <input
                            type="text"
                            value={state.note}
                            onChange={(e) => setDailyPresence({
                              ...dailyPresence,
                              [emp.id]: { ...state, note: e.target.value }
                            })}
                            placeholder={lang === 'id' ? 'Sebab (izin/sakit)...' : 'Reason / note...'}
                            className="px-2.5 py-1 text-[10px] border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:outline-none"
                          />

                          {/* Overtime toggle button — hanya muncul kalau status HADIR */}
                          {state.status === 'hadir' && (
                            <button
                              type="button"
                              onClick={() => {
                                const isEnabled = inlineOvertimes[emp.id]?.enabled;
                                setInlineOvertimes({
                                  ...inlineOvertimes,
                                  [emp.id]: {
                                    enabled: !isEnabled,
                                    hours: inlineOvertimes[emp.id]?.hours || 2,
                                    note: inlineOvertimes[emp.id]?.note || ''
                                  }
                                });
                              }}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border flex items-center gap-1 transition-colors ${
                                inlineOvertimes[emp.id]?.enabled
                                  ? 'bg-orange-500 border-orange-500 text-white'
                                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-805'
                              }`}
                            >
                              <Clock size={11} />
                              <span>{lang === 'id' ? 'Lembur' : 'OT'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inline overtime settings panel */}
                      {inlineOvertimes[emp.id]?.enabled && (
                        <div className="mt-2 p-2 bg-orange-50/40 dark:bg-orange-950/10 border border-orange-100/60 dark:border-orange-950/20 rounded-xl flex flex-col sm:flex-row sm:items-center gap-2 text-[10px] text-gray-700 dark:text-gray-300 animate-in slide-in-from-top-1 duration-100">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-orange-700 dark:text-orange-400">Jam Lembur:</span>
                            <input
                              type="number"
                              min="1"
                              value={inlineOvertimes[emp.id]?.hours ?? ''}
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/^0+(?=\d)/, '');
                                setInlineOvertimes({
                                  ...inlineOvertimes,
                                  [emp.id]: {
                                    ...inlineOvertimes[emp.id],
                                    hours: cleaned === '' ? 0 : Number(cleaned)
                                  }
                                });
                              }}
                              className="w-14 p-1.5 text-center border border-orange-200 dark:border-orange-900/40 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div className="flex-1 flex items-center gap-1">
                            <span className="font-bold text-orange-700 dark:text-orange-400">Pekerjaan:</span>
                            <input
                              type="text"
                              placeholder={lang === 'id' ? 'e.g. Pasang pipa / rakit panel...' : 'e.g. Work description...'}
                              value={inlineOvertimes[emp.id]?.note || ''}
                              onChange={(e) => setInlineOvertimes({
                                ...inlineOvertimes,
                                [emp.id]: {
                                  ...inlineOvertimes[emp.id],
                                  note: e.target.value
                                }
                              })}
                              className="flex-1 p-1 border border-orange-200 dark:border-orange-900/40 rounded bg-white dark:bg-gray-900 text-gray-905 dark:text-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="submit"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-600/10"
              >
                {lang === 'id' ? 'Kunci & Kirim Absensi' : 'Lock & Save Attendance'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sub Tab: Overtime Log */}
      {subTab === 'lembur' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="lembur-view">
          
          {/* Overtime entry form */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4 h-fit">
            <div>
              <h3 className="font-sans font-bold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                {lang === 'id' ? 'Input Lembur Pegawai' : 'Log Worker Overtime'}
              </h3>
              <p className="text-[11px] text-gray-400">
                {lang === 'id' ? 'Tambahkan jam lembur beserta tarif per jam' : 'Record extra hours with pre-negotiated hourly rate'}
              </p>
            </div>

            <form onSubmit={handleAddOvertimeSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">Nama Pekerja</label>
                <select
                  value={ovEmpId}
                  onChange={(e) => setOvEmpId(e.target.value)}
                  className="w-full p-2 text-xs border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                >
                  {filteredEmployees.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">{lang === 'id' ? 'Jumlah Jam' : 'Hours'}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={ovHours || ''}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/^0+(?=\d)/, '');
                      setOvHours(cleaned === '' ? 0 : Number(cleaned));
                    }}
                    className="w-full p-2 text-xs border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                  />
                </div>
                {!isMandor ? (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase">{lang === 'id' ? 'Tarif / Jam' : 'Hourly Rate'}</label>
                    <input
                      type="text"
                      required
                      value={ovRate}
                      onChange={(e) => setOvRate(formatNumberInput(e.target.value))}
                      className="w-full p-2 text-xs border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col justify-end text-[9px] text-amber-600 bg-amber-50/40 p-2 border border-amber-100 rounded-lg">
                    <Lock size={10} className="mb-0.5" />
                    <span>Lembur rate hidden</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">Pekerjaan / Catatan</label>
                <input
                  type="text"
                  required
                  value={ovNote}
                  onChange={(e) => setOvNote(e.target.value)}
                  className="w-full p-2 text-xs border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                  placeholder="e.g. Pasang tray panel induk"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl"
              >
                {lang === 'id' ? 'Catat Lembur' : 'Log Overtime'}
              </button>
            </form>
          </div>

          {/* Overtime lists */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-gray-950 dark:text-gray-100">
              {lang === 'id' ? 'Riwayat Lembur Lapangan' : 'Overtime History logs'}
            </h4>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {filteredOvertimes.length === 0 ? (
                <div className="py-8 text-center text-gray-450 dark:text-gray-500 text-xs font-medium">
                  {lang === 'id' ? 'Tidak ada catatan lembur yang cocok.' : 'No matching overtime logs.'}
                </div>
              ) : (
                filteredOvertimes.map(o => (
                  <div key={o.id} className="p-3 bg-gray-50/50 dark:bg-gray-900/10 border border-gray-100 dark:border-gray-750 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-100 gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-gray-900 dark:text-white">{o.employeeName}</span>
                      <p className="text-[10px] text-gray-500 mt-0.5 truncate">{o.note} | <span className="font-mono">{o.date}</span></p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-bold font-mono text-gray-900 dark:text-white">{o.hours} Jam</span>
                        {!isMandor && <p className="text-[10px] text-emerald-600 font-mono">+{formatRupiah(o.totalAmount)}</p>}
                      </div>
                      
                      <div className="flex items-center gap-1.5 pl-2 border-l border-gray-100 dark:border-gray-800">
                        <button
                          onClick={() => setEditingOvertime(o)}
                          className="text-orange-600 hover:text-orange-800 p-1 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors"
                          title={lang === 'id' ? 'Edit' : 'Edit'}
                        >
                          <Edit2 size={13} />
                        </button>

                        {deleteConfirmOvId === o.id ? (
                          <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/30">
                            <button
                              onClick={() => { if (onDeleteOvertime) onDeleteOvertime(o.id); setDeleteConfirmOvId(null); }}
                              className="text-[9px] font-extrabold text-red-650 hover:text-red-800 uppercase tracking-wider"
                            >
                              {lang === 'id' ? 'Ya' : 'Yes'}
                            </button>
                            <span className="text-[9px] text-gray-400">|</span>
                            <button
                              onClick={() => setDeleteConfirmOvId(null)}
                              className="text-[9px] font-extrabold text-gray-550 hover:text-gray-750 dark:text-gray-400 dark:hover:text-gray-200 uppercase tracking-wider"
                            >
                              {lang === 'id' ? 'Batal' : 'No'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmOvId(o.id)}
                            className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            title={lang === 'id' ? 'Hapus' : 'Delete'}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* Sub Tab: Employees Roster */}
      {subTab === 'roster' && !isMandor && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="roster-view">
          
          {/* Add Employee Form */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4 h-fit">
            <h3 className="font-sans font-bold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              {lang === 'id' ? 'Daftar Pegawai Baru' : 'Add Employee'}
            </h3>
            <form onSubmit={handleAddEmployeeSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full p-2 text-xs border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                  placeholder="e.g. Sujatmiko"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">Spesialisasi / Peran</label>
                <select
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  className="w-full p-2 text-xs border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                >
                  <option value="Tukang Listrik (ME)">Tukang Listrik (ME)</option>
                  <option value="Kenek / Helper">Kenek / Helper</option>
                  <option value="Tukang Las & Pipa">Tukang Las & Pipa</option>
                  <option value="Mandor Lapangan">Mandor Lapangan</option>
                  <option value="Teknisi Panel">Teknisi Panel</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">{lang === 'id' ? 'Gaji Harian (IDR)' : 'Daily Wage (IDR)'}</label>
                <input
                  type="text"
                  required
                  value={empWage}
                  onChange={(e) => setEmpWage(formatNumberInput(e.target.value))}
                  className="w-full p-2 text-xs border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl"
              >
                {lang === 'id' ? 'Simpan' : 'Save'}
              </button>
            </form>
          </div>

          {/* Roster list */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-gray-950 dark:text-gray-100">Roster Tim MEP</h4>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredEmployees.length === 0 ? (
                <div className="py-8 text-center text-gray-450 dark:text-gray-500 text-xs font-medium">
                  {lang === 'id' ? 'Tidak ada pekerja yang cocok dengan pencarian Anda.' : 'No workers match your search query.'}
                </div>
              ) : (
                filteredEmployees.map(e => (
                  <div key={e.id} className="py-2.5 flex items-center justify-between text-xs animate-in fade-in duration-100 gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-gray-900 dark:text-white block truncate">{e.name}</span>
                      <p className="text-[10px] text-gray-400">{e.role}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {formatRupiah(e.dailySalary)} <span className="text-[9px] text-gray-400">/hari</span>
                      </span>
                      
                      <div className="flex items-center gap-1.5 border-l border-gray-100 dark:border-gray-800 pl-3">
                        <button
                          onClick={() => setEditingEmployee(e)}
                          className="text-orange-600 hover:text-orange-800 p-1 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors"
                          title={lang === 'id' ? 'Edit' : 'Edit'}
                        >
                          <Edit2 size={13} />
                        </button>

                        {deleteConfirmEmpId === e.id ? (
                          <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/30">
                            <button
                              onClick={() => { if (onDeleteEmployee) onDeleteEmployee(e.id); setDeleteConfirmEmpId(null); }}
                              className="text-[9px] font-extrabold text-red-650 hover:text-red-800 uppercase tracking-wider"
                            >
                              {lang === 'id' ? 'Ya' : 'Yes'}
                            </button>
                            <span className="text-[9px] text-gray-400">|</span>
                            <button
                              onClick={() => setDeleteConfirmEmpId(null)}
                              className="text-[9px] font-extrabold text-gray-550 hover:text-gray-750 dark:text-gray-400 dark:hover:text-gray-200 uppercase tracking-wider"
                            >
                              {lang === 'id' ? 'Batal' : 'No'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmEmpId(e.id)}
                            className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            title={lang === 'id' ? 'Hapus' : 'Delete'}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* Sub Tab: Kasbon */}
      {subTab === 'kasbon' && !isMandor && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="kasbon-view">
          
          {/* Add Kasbon form */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4 h-fit">
            <h3 className="font-sans font-bold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              {lang === 'id' ? 'Catat Pinjaman Kasbon' : 'New Advance Payment'}
            </h3>
            <form onSubmit={handleAddKasbonSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">Nama Pekerja</label>
                <select
                  value={kasEmpId}
                  onChange={(e) => setKasEmpId(e.target.value)}
                  className="w-full p-2 text-xs border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                >
                  {filteredEmployees.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">Jumlah Kasbon (IDR)</label>
                <input
                  type="text"
                  required
                  value={kasAmt}
                  onChange={(e) => setKasAmt(formatNumberInput(e.target.value))}
                  className="w-full p-2 text-xs border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                  placeholder="e.g. 50.000"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">Alasan / Catatan</label>
                <input
                  type="text"
                  required
                  value={kasNote}
                  onChange={(e) => setKasNote(e.target.value)}
                  className="w-full p-2 text-xs border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                  placeholder="e.g. Beli beras / gas LPG"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl"
              >
                {lang === 'id' ? 'Catat Kasbon' : 'Log Cash Advance'}
              </button>
            </form>
          </div>

          {/* Kasbon records list */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-gray-950 dark:text-gray-100">Daftar Pemotongan Kasbon</h4>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {filteredKasbons.length === 0 ? (
                <div className="py-8 text-center text-gray-450 dark:text-gray-500 text-xs font-medium">
                  {lang === 'id' ? 'Tidak ada catatan kasbon yang cocok.' : 'No matching cash advances.'}
                </div>
              ) : (
                filteredKasbons.map(k => (
                  <div key={k.id} className="p-3 bg-gray-50/50 dark:bg-gray-900/10 border border-gray-100 dark:border-gray-750 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-100 gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-gray-900 dark:text-white">{k.employeeName}</span>
                      <p className="text-[10px] text-gray-500 mt-0.5 truncate">{k.note} | <span className="font-mono">{k.date}</span></p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold font-mono text-red-600 whitespace-nowrap">-{formatRupiah(k.amount)}</span>
                      
                      <div className="flex items-center gap-1.5 pl-2 border-l border-gray-100 dark:border-gray-800">
                        <button
                          onClick={() => setEditingKasbon(k)}
                          className="text-orange-600 hover:text-orange-800 p-1 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors"
                          title={lang === 'id' ? 'Edit' : 'Edit'}
                        >
                          <Edit2 size={13} />
                        </button>

                        {deleteConfirmKasId === k.id ? (
                          <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/30">
                            <button
                              onClick={() => { if (onDeleteKasbon) onDeleteKasbon(k.id); setDeleteConfirmKasId(null); }}
                              className="text-[9px] font-extrabold text-red-650 hover:text-red-800 uppercase tracking-wider"
                            >
                              {lang === 'id' ? 'Ya' : 'Yes'}
                            </button>
                            <span className="text-[9px] text-gray-400">|</span>
                            <button
                              onClick={() => setDeleteConfirmKasId(null)}
                              className="text-[9px] font-extrabold text-gray-550 hover:text-gray-750 dark:text-gray-400 dark:hover:text-gray-200 uppercase tracking-wider"
                            >
                              {lang === 'id' ? 'Batal' : 'No'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmKasId(k.id)}
                            className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            title={lang === 'id' ? 'Hapus' : 'Delete'}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* Sub Tab: Payroll payslip generator */}
      {subTab === 'payslip' && !isMandor && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="payslip-view">
          
          {/* Slip selector parameters */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4 h-fit">
            <div>
              <h3 className="font-sans font-bold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <FileText size={14} />
                <span>Kalkulator Slip Gaji Mingguan</span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Hitung akumulasi absensi kerja pekerja lapangan dikurangi potongan kasbon dan ditambah lembur.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">Pilih Pekerja</label>
                <select
                  value={slipEmpId}
                  onChange={(e) => setSlipEmpId(e.target.value)}
                  className="w-full p-2 text-xs border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                >
                  {filteredEmployees.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">Awal Periode</label>
                  <input
                    type="date"
                    value={slipDateStart}
                    onChange={(e) => setSlipDateStart(e.target.value)}
                    className="w-full p-2 text-xs border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">Akhir Periode</label>
                  <input
                    type="date"
                    value={slipDateEnd}
                    onChange={(e) => setSlipDateEnd(e.target.value)}
                    className="w-full p-2 text-xs border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payslip preview receipt card */}
          {selectedSlipEmployee && (
            <div className="bg-amber-50/20 dark:bg-gray-900 border border-amber-200 dark:border-gray-800 p-6 rounded-2xl shadow-md space-y-4 relative overflow-hidden" id="payslip-preview-receipt">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-200/20 dark:bg-amber-900/10 rounded-bl-full flex items-center justify-center">
                <Printer size={18} className="text-amber-700 dark:text-amber-500 mr-2 mt-2" />
              </div>

              <div className="border-b border-dashed border-amber-200 dark:border-gray-850 pb-3 text-center">
                <h4 className="font-sans font-black text-gray-900 dark:text-white tracking-widest text-sm">SLIP GAJI PEGAWAI</h4>
                <p className="text-[10px] text-gray-500 font-mono">EBA PROJECT CONSTRUCTIONS</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 dark:text-gray-300 font-mono">
                <div>Nama : <span className="font-bold text-gray-900 dark:text-white">{selectedSlipEmployee.name}</span></div>
                <div>Peran : <span className="font-bold text-gray-900 dark:text-white">{selectedSlipEmployee.role}</span></div>
                <div className="col-span-2 border-t border-gray-100 dark:border-gray-800 pt-2 mt-1">
                  Periode : {slipDateStart} s/d {slipDateEnd}
                </div>
              </div>

              <div className="border-t border-b border-dashed border-amber-200 dark:border-gray-850 py-3 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span>Hadir Kerja ({payroll.attendanceDays} Hari)</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatRupiah(payroll.basicSalary)}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Total Lembur</span>
                  <span className="font-bold">+{formatRupiah(payroll.overtimeEarned)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Potongan Kasbon</span>
                  <span className="font-bold">-{formatRupiah(payroll.kasbonDeducted)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center bg-amber-500/10 dark:bg-gray-800 p-3 rounded-xl border border-amber-300/30">
                <span className="text-xs font-bold text-gray-900 dark:text-white uppercase">GAJI BERSIH (NET)</span>
                <span className="text-base font-black font-mono text-orange-600 dark:text-orange-400">
                  {formatRupiah(payroll.netSalary)}
                </span>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleSharePayslipWA}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Share2 size={13} />
                  <span>Kirim WA</span>
                </button>
              </div>

            </div>
          )}

        </div>
      )}

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <form onSubmit={handleEditEmployeeSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xl space-y-4 max-w-md w-full animate-in zoom-in-95 duration-150">
            <div>
              <h4 className="font-sans font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                {lang === 'id' ? 'Edit Data Pegawai' : 'Edit Employee Details'}
              </h4>
              <p className="text-[11px] text-gray-400">
                {lang === 'id' ? 'Perbarui informasi profil dan gaji harian pekerja' : 'Update the profile info and daily wage of the worker'}
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editingEmployee.name}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Spesialisasi / Peran</label>
                <select
                  value={editingEmployee.role}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, role: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl font-sans"
                >
                  <option value="Tukang Listrik (ME)">Tukang Listrik (ME)</option>
                  <option value="Kenek / Helper">Kenek / Helper</option>
                  <option value="Tukang Las & Pipa">Tukang Las & Pipa</option>
                  <option value="Mandor Lapangan">Mandor Lapangan</option>
                  <option value="Teknisi Panel">Teknisi Panel</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Gaji Harian (IDR)</label>
                <input
                  type="text"
                  required
                  value={formatNumberInput(editingEmployee.dailySalary)}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, dailySalary: parseFormattedNumber(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl font-mono"
                />
              </div>

            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-750 dark:text-gray-450 dark:hover:text-gray-200"
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

      {/* Edit Kasbon Modal */}
      {editingKasbon && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <form onSubmit={handleEditKasbonSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xl space-y-4 max-w-md w-full animate-in zoom-in-95 duration-150">
            <div>
              <h4 className="font-sans font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                {lang === 'id' ? 'Edit Data Kasbon' : 'Edit Advance Payment'}
              </h4>
              <p className="text-[11px] text-gray-400">
                {lang === 'id' ? 'Perbarui informasi jumlah kasbon dan catatan pinjaman' : 'Update the advance payment details and loan note'}
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Nama Pekerja</label>
                <div className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-500 rounded-xl font-sans">
                  {editingKasbon.employeeName}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Jumlah Kasbon (IDR)</label>
                <input
                  type="text"
                  required
                  value={formatNumberInput(editingKasbon.amount)}
                  onChange={(e) => setEditingKasbon({ ...editingKasbon, amount: parseFormattedNumber(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Alasan / Catatan</label>
                <input
                  type="text"
                  required
                  value={editingKasbon.note}
                  onChange={(e) => setEditingKasbon({ ...editingKasbon, note: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl font-sans"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setEditingKasbon(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-750 dark:text-gray-450 dark:hover:text-gray-200"
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

      {/* Edit Overtime Modal */}
      {editingOvertime && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <form onSubmit={handleEditOvertimeSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xl space-y-4 max-w-md w-full animate-in zoom-in-95 duration-150">
            <div>
              <h4 className="font-sans font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                {lang === 'id' ? 'Edit Data Lembur' : 'Edit Overtime Details'}
              </h4>
              <p className="text-[11px] text-gray-400">
                {lang === 'id' ? 'Perbarui informasi durasi jam lembur dan pekerjaan' : 'Update the duration and overtime work description'}
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Nama Pekerja</label>
                <div className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-500 rounded-xl font-sans">
                  {editingOvertime.employeeName}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Jumlah Jam</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editingOvertime.hours === 0 ? '' : editingOvertime.hours}
                    onChange={(e) => setEditingOvertime({ ...editingOvertime, hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Tarif / Jam (IDR)</label>
                  <input
                    type="text"
                    required
                    value={formatNumberInput(editingOvertime.hourlyRate)}
                    onChange={(e) => setEditingOvertime({ ...editingOvertime, hourlyRate: parseFormattedNumber(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Pekerjaan / Catatan</label>
                <input
                  type="text"
                  required
                  value={editingOvertime.note}
                  onChange={(e) => setEditingOvertime({ ...editingOvertime, note: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl font-sans"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setEditingOvertime(null)}
                className="px-4 py-2 text-xs font-bold text-gray-550 hover:text-gray-750 dark:text-gray-450 dark:hover:text-gray-200"
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
