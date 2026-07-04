import React, { useState } from 'react';
import { Project, MaterialTransaction, Employee, Attendance, Kasbon, Overtime, OtherExpense, Language, UserRole } from '../types';
import { AlertCircle, TrendingUp, CheckCircle, Wallet, Users, FileText, ArrowUpRight, ArrowDownRight, Calendar, Clock, ClipboardCheck } from 'lucide-react';
import { DatabaseSync } from './DatabaseSync';

interface DashboardProps {
  projects: Project[];
  materials: MaterialTransaction[];
  employees: Employee[];
  attendance: Attendance[];
  kasbons: Kasbon[];
  overtimes: Overtime[];
  otherExpenses: OtherExpense[];
  lang: Language;
  role?: UserRole;
  isOffline: boolean;
  onDataRestore: (restoredData: any) => void;
  onDataBackup: () => any;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  materials,
  employees,
  attendance,
  kasbons,
  overtimes,
  otherExpenses,
  lang,
  role = 'admin',
  isOffline,
  onDataRestore,
  onDataBackup
}) => {
  // Calculate totals
  const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);

  // Spent calculation
  const totalMaterialSpent = materials
    .filter(m => m.type === 'masuk') // material masuk is an expense for the project
    .reduce((acc, m) => acc + m.totalPrice, 0);

  const totalOtherExpenses = otherExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Staff wages: calculate based on attendance and overtime minus kasbon
  // Wait, let's calculate total salary spent: sum(attendance days * daily salary) + sum(overtime amounts)
  const totalSalarySpent = attendance
    .filter(a => a.status === 'hadir')
    .reduce((acc, a) => {
      const emp = employees.find(e => e.id === a.employeeId);
      return acc + (emp ? emp.dailySalary : 0);
    }, 0);

  const totalOvertimeSpent = overtimes.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalSpent = totalMaterialSpent + totalOtherExpenses + totalSalarySpent + totalOvertimeSpent;

  // Formatting utility
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Due Invoice Reminders (2026-07-03 is current simulated date)
  const currentDateStr = "2026-07-03";
  const currentDate = new Date(currentDateStr);

  const dueInvoices = projects.flatMap(p => 
    p.invoices.map(inv => {
      const dueDate = new Date(inv.dueDate);
      const diffTime = dueDate.getTime() - currentDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        ...inv,
        projectName: p.name,
        diffDays,
        isOverdue: diffDays < 0 && !inv.isPaid,
        isNearDue: diffDays >= 0 && diffDays <= 3 && !inv.isPaid
      };
    })
  ).filter(inv => inv.isOverdue || inv.isNearDue);

  // Daily Operational Metrics for Mandor
  const todayAttendanceCount = attendance.filter(a => a.date === currentDateStr && a.status === 'hadir').length;
  const todayOvertimeHours = overtimes.filter(o => o.date === currentDateStr).reduce((acc, o) => acc + o.hours, 0);

  const isMandor = role === 'user';

  return (
    <div className="space-y-6" id="dashboard-tab-content">
      
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" id="kpi-grid">
        
        {/* Card 1: Total Portfolio Budget (Admin) / Today's Attendance (Mandor) */}
        {!isMandor ? (
          <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col justify-between h-full transition-all hover:shadow-md">
            <div className="flex items-center justify-between w-full gap-1.5">
              <span className="text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate">
                {lang === 'id' ? 'Total Portfolio' : 'Portfolio Budget'}
              </span>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
                <Wallet size={14} className="sm:w-[18px] sm:h-[18px]" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <h4 className="text-xs sm:text-sm md:text-base font-extrabold text-gray-900 dark:text-white leading-none font-mono tracking-tight">
                {formatRupiah(totalBudget)}
              </h4>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col justify-between h-full transition-all hover:shadow-md">
            <div className="flex items-center justify-between w-full gap-1.5">
              <span className="text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate">
                {lang === 'id' ? 'Hadir Hari Ini' : 'Present Today'}
              </span>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                <ClipboardCheck size={14} className="sm:w-[18px] sm:h-[18px]" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <h4 className="text-xs sm:text-sm md:text-base font-extrabold text-gray-900 dark:text-white leading-none font-mono tracking-tight">
                {todayAttendanceCount} {lang === 'id' ? 'Pegawai' : 'Staff'}
              </h4>
            </div>
          </div>
        )}

        {/* Card 2: Total Spent (Admin) / Today's Overtime Hours (Mandor) */}
        {!isMandor ? (
          <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col justify-between h-full transition-all hover:shadow-md">
            <div className="flex items-center justify-between w-full gap-1.5">
              <span className="text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate">
                {lang === 'id' ? 'Total Pengeluaran' : 'Total Spent'}
              </span>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <ArrowDownRight size={14} className="sm:w-[18px] sm:h-[18px]" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <h4 className="text-xs sm:text-sm md:text-base font-extrabold text-gray-900 dark:text-white leading-none font-mono tracking-tight">
                {formatRupiah(totalSpent)}
              </h4>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col justify-between h-full transition-all hover:shadow-md">
            <div className="flex items-center justify-between w-full gap-1.5">
              <span className="text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate">
                {lang === 'id' ? 'Lembur Hari Ini' : 'Overtime Today'}
              </span>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
                <Clock size={14} className="sm:w-[18px] sm:h-[18px]" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <h4 className="text-xs sm:text-sm md:text-base font-extrabold text-gray-900 dark:text-white leading-none font-mono tracking-tight">
                {todayOvertimeHours} {lang === 'id' ? 'Jam Kerja' : 'Hours'}
              </h4>
            </div>
          </div>
        )}

        {/* Card 3: Active Projects */}
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col justify-between h-full transition-all hover:shadow-md">
          <div className="flex items-center justify-between w-full gap-1.5">
            <span className="text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate">
              {lang === 'id' ? 'Proyek Berjalan' : 'Active Projects'}
            </span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={14} className="sm:w-[18px] sm:h-[18px]" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <h4 className="text-xs sm:text-sm md:text-base font-extrabold text-gray-900 dark:text-white leading-none font-mono tracking-tight">
              {projects.length} {lang === 'id' ? 'Proyek' : 'Projects'}
            </h4>
          </div>
        </div>

        {/* Card 4: Employee Count */}
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col justify-between h-full transition-all hover:shadow-md">
          <div className="flex items-center justify-between w-full gap-1.5">
            <span className="text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate">
              {lang === 'id' ? 'Tenaga Kerja' : 'Total Workforce'}
            </span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Users size={14} className="sm:w-[18px] sm:h-[18px]" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <h4 className="text-xs sm:text-sm md:text-base font-extrabold text-gray-900 dark:text-white leading-none font-mono tracking-tight">
              {employees.length} {lang === 'id' ? 'Pegawai' : 'Staff'}
            </h4>
          </div>
        </div>

      </div>

      {/* Invoice Due Warning Panel (If active - Admin only) */}
      {dueInvoices.length > 0 && !isMandor && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl p-4 flex items-start gap-3.5" id="invoice-due-panel">
          <div className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl mt-0.5">
            <AlertCircle size={18} />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <h5 className="font-sans font-bold text-red-900 dark:text-red-400 text-xs sm:text-sm">
                {lang === 'id' ? 'Peringatan Invoice Jatuh Tempo!' : 'Unpaid Invoice Due Alert!'}
              </h5>
              <p className="text-[11px] text-red-700 dark:text-red-300/80">
                {lang === 'id' 
                  ? 'Segera ajukan penagihan atau lakukan verifikasi untuk invoice proyek berikut agar cashflow operasional tetap berjalan lancar.' 
                  : 'Please process or verify follow-ups on the following project invoices to maintain steady cash flow.'}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {dueInvoices.map((inv) => (
                <div key={inv.id} className="bg-white/80 dark:bg-gray-900/40 p-2.5 rounded-xl border border-red-100 dark:border-red-950 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest bg-red-100 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
                      {inv.isOverdue ? (lang === 'id' ? 'TERLEWAT' : 'OVERDUE') : (lang === 'id' ? 'DEKAT' : 'NEAR DUE')}
                    </span>
                    <h6 className="text-xs font-bold text-gray-900 dark:text-white mt-1.5 truncate">{inv.projectName}</h6>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{inv.title}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 mt-2 pt-2 text-[10px] font-mono">
                    <span className="text-gray-900 dark:text-white font-bold">{formatRupiah(inv.amount)}</span>
                    <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                      <Calendar size={10} />
                      {inv.dueDate} ({inv.diffDays < 0 ? `${Math.abs(inv.diffDays)} hari lalu` : `${inv.diffDays} hari lagi`})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* Project Status panel: Financial Health (Admin) or Operational Timeline (Mandor) */}
      {!isMandor ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 shadow-sm space-y-3" id="financial-summary-panel">
          <div>
            <h3 className="font-sans font-bold text-sm text-gray-900 dark:text-white">
              {lang === 'id' ? 'Kesehatan Anggaran Proyek' : 'Project Financial Health & Balances'}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {lang === 'id' ? 'Persentase penyerapan anggaran dibanding plafon total' : 'Budget utilization percentages vs total allowance limits'}
            </p>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {projects.map((proj) => {
              // Spent for this specific project
              const matCost = materials
                .filter(m => m.projectId === proj.id && m.type === 'masuk')
                .reduce((acc, m) => acc + m.totalPrice, 0);

              const expCost = otherExpenses
                .filter(e => e.projectId === proj.id)
                .reduce((acc, e) => acc + e.amount, 0);

              // Attendance labor cost for this project is simulated proportionally or tracked
              // We can distribute attendance labor cost or calculate direct sum
              const staffCost = attendance
                .filter(a => a.status === 'hadir')
                .reduce((acc, a) => {
                  const emp = employees.find(e => e.id === a.employeeId);
                  // Assign to this project if project specific or simply simulate 1/N
                  return acc + (emp ? emp.dailySalary / projects.length : 0);
                }, 0);

              const projSpent = matCost + expCost + staffCost;
              const percentage = Math.min(100, (projSpent / proj.budget) * 100);
              const remaining = proj.budget - projSpent;

              return (
                <div key={proj.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className="text-gray-950 dark:text-gray-100">{proj.name}</span>
                      <span className="text-gray-500 font-mono">
                        {percentage.toFixed(1)}% ({formatRupiah(projSpent)})
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-700/80 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 rounded-full ${
                          percentage > 90 
                            ? 'bg-red-600' 
                            : percentage > 70 
                              ? 'bg-amber-500' 
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-baseline justify-between sm:text-right min-w-[120px]">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'SISA BUDGET' : 'LEFT BUDGET'}</span>
                    <span className={`text-xs font-bold font-mono ${remaining < 0 ? 'text-red-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {formatRupiah(remaining)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 shadow-sm space-y-4" id="mandor-schedule-panel">
          <div>
            <h3 className="font-sans font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar size={16} className="text-orange-500 stroke-[2.5]" />
              {lang === 'id' ? 'Jadwal & Target Progress Lapangan' : 'Field Schedule & Progress Targets'}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {lang === 'id' ? 'Durasi proyek berjalan serta capaian progres mingguan aktual' : 'Active project durations and actual weekly progress milestones'}
            </p>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-850">
            {projects.map((proj) => {
              // Find latest actual progress and plan progress
              const lastActualIdx = proj.scurveActual.reduce((acc, val, idx) => val > 0 ? idx : acc, 0);
              const latestActualPct = proj.scurveActual[lastActualIdx] || 0;
              const latestPlanPct = proj.scurvePlan[lastActualIdx] || 0;
              const isOnTrack = latestActualPct >= latestPlanPct;

              return (
                <div key={proj.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between sm:justify-start gap-3">
                      <h4 className="text-xs font-extrabold text-gray-900 dark:text-white">{proj.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                        isOnTrack 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                          : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                      }`}>
                        {isOnTrack 
                          ? (lang === 'id' ? 'TEPAT WAKTU' : 'ON TRACK') 
                          : (lang === 'id' ? 'TERLAMBAT' : 'DELAYED')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                      <Calendar size={12} className="text-gray-400" />
                      <span>{proj.startDate} s/d {proj.endDate}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                        <span>{lang === 'id' ? 'Realisasi Aktual' : 'Actual Progress'}</span>
                        <span className="font-mono text-gray-800 dark:text-gray-250 font-bold">{latestActualPct}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 dark:bg-gray-700/80 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 rounded-full ${
                            isOnTrack ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${latestActualPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:flex-col md:items-end gap-1 min-w-[130px] p-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800/80">
                    <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      {lang === 'id' ? 'TARGET PLAN' : 'PLAN TARGET'}
                    </span>
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                      {latestPlanPct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cloud Database Sync Panel */}
      <DatabaseSync
        onDataRestore={onDataRestore}
        onDataBackup={onDataBackup}
        lang={lang}
        role={role}
        isOffline={isOffline}
      />

    </div>
  );
};
