import React, { useState } from 'react';
import { Project, Invoice, Language, UserRole } from '../types';
import { translations } from '../utils/lang';
import { Plus, Eye, Check, ShieldAlert, Lock, Calendar, DollarSign, ListTodo, Activity, Edit2, Trash2 } from 'lucide-react';

interface ProjectListProps {
  projects: Project[];
  onAddProject: (proj: Omit<Project, 'id' | 'invoices'>) => void;
  onUpdateProject?: (proj: Project) => void;
  onDeleteProject?: (id: string) => void;
  onUpdateScurve: (projId: string, scurvePlan: number[], scurveActual: number[]) => void;
  onToggleInvoicePaid: (projId: string, invoiceId: string) => void;
  onAddInvoice: (projId: string, invoice: Omit<Invoice, 'id' | 'isPaid'>) => void;
  onUpdateInvoice: (projId: string, invoice: Invoice) => void;
  onDeleteInvoice: (projId: string, invoiceId: string) => void;
  lang: Language;
  role: UserRole;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onUpdateScurve,
  onToggleInvoicePaid,
  onAddInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  lang,
  role
}) => {
  const t = translations[lang];
  const [showAddProj, setShowAddProj] = useState(false);
  const [selectedProjId, setSelectedProjId] = useState<string | null>(projects[0]?.id || null);
  
  // New Project Form State
  const [newProjName, setNewProjName] = useState('');
  const [newProjBudget, setNewProjBudget] = useState(0);
  const [newProjStart, setNewProjStart] = useState('2026-07-01');
  const [newProjEnd, setNewProjEnd] = useState('2026-09-30');

  // New Invoice Form State
  const [showAddInv, setShowAddInv] = useState(false);
  const [invNum, setInvNum] = useState('');
  const [invAmt, setInvAmt] = useState(0);
  const [invDue, setInvDue] = useState('2026-07-15');
  const [invTitle, setInvTitle] = useState('');

  // Invoice editing/deleting state
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Project editing/deleting state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteConfirmProjId, setDeleteConfirmProjId] = useState<string | null>(null);

  const handleEditInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProj || !editingInvoice) return;
    onUpdateInvoice(activeProj.id, editingInvoice);
    setEditingInvoice(null);
  };

  const handleEditProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject && onUpdateProject) {
      onUpdateProject(editingProject);
      setEditingProject(null);
    }
  };

  // Selected project object
  const activeProj = projects.find(p => p.id === selectedProjId) || projects[0];

  // S-Curve edits states
  const [editScurve, setEditScurve] = useState<boolean>(false);
  const [tempPlan, setTempPlan] = useState<number[]>([]);
  const [tempActual, setTempActual] = useState<number[]>([]);

  const handleSelectProjectForScurve = (p: Project) => {
    setSelectedProjId(p.id);
    setTempPlan([...p.scurvePlan]);
    setTempActual([...p.scurveActual]);
    setEditScurve(false);
  };

  const handleStartScurveEdit = () => {
    if (!activeProj) return;
    setTempPlan([...activeProj.scurvePlan]);
    setTempActual([...activeProj.scurveActual]);
    setEditScurve(true);
  };

  const handleSaveScurve = () => {
    if (!activeProj) return;
    onUpdateScurve(activeProj.id, tempPlan, tempActual);
    setEditScurve(false);
  };

  const handleAddProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName || !newProjBudget) return;
    
    // Default s-curve coordinates
    const scurvePlan = [10, 20, 35, 50, 65, 80, 90, 95, 100];
    const scurveActual = [0, 0, 0, 0, 0, 0, 0, 0, 0];

    onAddProject({
      name: newProjName,
      budget: Number(newProjBudget),
      startDate: newProjStart,
      endDate: newProjEnd,
      scurvePlan,
      scurveActual
    });

    setNewProjName('');
    setNewProjBudget(0);
    setShowAddProj(false);
  };

  const handleAddInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProj || !invAmt || !invNum) return;

    onAddInvoice(activeProj.id, {
      invoiceNumber: invNum,
      amount: Number(invAmt),
      dueDate: invDue,
      title: invTitle
    });

    setInvNum('');
    setInvAmt(0);
    setInvTitle('');
    setShowAddInv(false);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // If Mandor role: hide all financial data
  const isMandor = role === 'mandor';

  return (
    <div className="space-y-6" id="project-list-tab">
      
      {/* Role Restriction Banner for Mandor */}
      {isMandor && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-4 rounded-2xl flex items-center gap-3" id="mandor-lock-banner">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl">
            <Lock size={18} />
          </div>
          <div>
            <h5 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-400">
              {lang === 'id' ? 'Akses Keuangan Terbatas' : 'Financial Data Restricted'}
            </h5>
            <p className="text-[11px] text-amber-700 dark:text-amber-400/80 leading-relaxed">
              {lang === 'id' 
                ? 'Sebagai Mandor Lapangan, Anda memiliki wewenang penuh mencatat progress fisik & absensi. Namun, data anggaran proyek, invoice, dan gaji dirahasiakan.' 
                : 'As site foreman, you can record daily progress and attendance. Financial budgets, invoices, and payroll remain locked.'}
            </p>
          </div>
        </div>
      )}

      {/* Main Project Control Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="project-cols">
        
        {/* Left Side: Project Names list */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-sans font-bold text-sm text-gray-950 dark:text-gray-100">
                {lang === 'id' ? 'Daftar Proyek Aktif' : 'Active Projects'}
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {lang === 'id' ? 'Pilih proyek untuk melihat detail' : 'Select a project to review'}
              </p>
            </div>
            {!isMandor && (
              <button
                onClick={() => setShowAddProj(!showAddProj)}
                className="p-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-md shadow-orange-600/10 flex items-center justify-center transition-colors"
                id="show-add-project-btn"
              >
                <Plus size={16} />
              </button>
            )}
          </div>

          {/* Add Project Form (Inline accordion) */}
          {showAddProj && (
            <form onSubmit={handleAddProjectSubmit} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 space-y-3" id="add-project-form">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t.projectName}</label>
                <input
                  type="text"
                  required
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="e.g. Instalasi Gedung B"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t.budget} (IDR)</label>
                <input
                  type="number"
                  required
                  value={newProjBudget}
                  onChange={(e) => setNewProjBudget(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="e.g. 250000000"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t.startDate}</label>
                  <input
                    type="date"
                    required
                    value={newProjStart}
                    onChange={(e) => setNewProjStart(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t.endDate}</label>
                  <input
                    type="date"
                    required
                    value={newProjEnd}
                    onChange={(e) => setNewProjEnd(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProj(false)}
                  className="px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-[11px] font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                >
                  {t.save}
                </button>
              </div>
            </form>
          )}

          {/* Project Cards Selector */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1" id="project-selector-cards">
            {projects.map((proj) => {
              const isActive = activeProj?.id === proj.id;
              return (
                <div
                  key={proj.id}
                  className={`w-full p-3.5 rounded-xl border transition-all relative ${
                    isActive
                      ? 'border-orange-500 bg-orange-50/20 dark:bg-orange-950/10 shadow-sm'
                      : 'border-gray-100 hover:border-gray-200 dark:border-gray-700/50 dark:hover:border-gray-700 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleSelectProjectForScurve(proj)}
                    >
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{proj.name}</h4>
                    </div>

                    {/* Edit & Delete Actions for Admin */}
                    {!isMandor && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProject(proj);
                          }}
                          className="text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 p-1 rounded transition-colors"
                          title={lang === 'id' ? 'Edit Proyek' : 'Edit Project'}
                        >
                          <Edit2 size={12} />
                        </button>
                        {deleteConfirmProjId === proj.id ? (
                          <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/30 z-10">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onDeleteProject) onDeleteProject(proj.id);
                                setDeleteConfirmProjId(null);
                              }}
                              className="text-[9px] font-extrabold text-red-650 hover:text-red-850 uppercase tracking-wider"
                            >
                              {lang === 'id' ? 'Ya' : 'Yes'}
                            </button>
                            <span className="text-[9px] text-gray-400">|</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmProjId(null);
                              }}
                              className="text-[9px] font-extrabold text-gray-500 hover:text-gray-750 dark:text-gray-400 dark:hover:text-gray-200 uppercase tracking-wider"
                            >
                              {lang === 'id' ? 'Batal' : 'No'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmProjId(proj.id);
                            }}
                            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded transition-colors"
                            title={lang === 'id' ? 'Hapus Proyek' : 'Delete Project'}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div 
                    className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-2 font-mono cursor-pointer"
                    onClick={() => handleSelectProjectForScurve(proj)}
                  >
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {proj.startDate} s/d {proj.endDate}
                    </span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">
                      {isMandor ? '••••••••' : formatRupiah(proj.budget)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Active Project details */}
        {activeProj && (
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-6" id="project-detail-panel">
            
            {/* Project Title Header */}
            <div className="border-b border-gray-100 dark:border-gray-700 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[9px] font-extrabold bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 rounded uppercase tracking-wider">
                  Active MEP
                </span>
                <span className="text-xs font-mono text-gray-400">{activeProj.id}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-1.5">{activeProj.name}</h2>
            </div>

            {/* Financial Overview (Hidden or blurred for Mandor) */}
            <div className="space-y-4">
              <h3 className="font-sans font-bold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <DollarSign size={14} />
                {lang === 'id' ? 'Ikhtisar Keuangan' : 'Financial Breakdown'}
              </h3>

              {isMandor ? (
                <div className="relative group p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col items-center justify-center text-center">
                  <Lock className="text-gray-400 mb-2 animate-bounce" size={24} />
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {lang === 'id' ? 'Disembunyikan untuk Peran Mandor' : 'Obfuscated for Mandor Role'}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 max-w-xs">
                    {lang === 'id' ? 'Silakan ganti peran ke Administrator di bilah navigasi atas untuk melihat rincian keuangan.' : 'Switch to Administrator role in top navigation panel to review finance.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">{t.budget}</span>
                      <h5 className="text-base font-bold text-gray-900 dark:text-white mt-1">{formatRupiah(activeProj.budget)}</h5>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">
                        {lang === 'id' ? 'Anggaran Terpakai' : 'Spent Budget'}
                      </span>
                      <h5 className="text-base font-bold text-gray-900 dark:text-white mt-1">
                        {/* We will render the dynamic spent or placeholder */}
                        {formatRupiah(activeProj.budget * 0.45)}
                      </h5>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Invoices Management Section (Admin Only) */}
            {!isMandor && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-5">
                  <h3 className="font-sans font-bold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <ListTodo size={14} />
                    {lang === 'id' ? 'Daftar Invoice & Penagihan' : 'Invoices & Billing'}
                  </h3>
                  <button
                    onClick={() => setShowAddInv(!showAddInv)}
                    className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                    id="add-invoice-toggle-btn"
                  >
                    <Plus size={12} />
                    {lang === 'id' ? 'Tambah Termin' : 'Add Term'}
                  </button>
                </div>

                {/* Add Invoice Form */}
                {showAddInv && (
                  <form onSubmit={handleAddInvoiceSubmit} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-700/60 space-y-3" id="add-invoice-form">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase">No. Invoice</label>
                        <input
                          type="text"
                          required
                          value={invNum}
                          onChange={(e) => setInvNum(e.target.value)}
                          className="w-full p-2 text-xs border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:outline-none"
                          placeholder="e.g. INV/EBA/003"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Jumlah (IDR)</label>
                        <input
                          type="number"
                          required
                          value={invAmt}
                          onChange={(e) => setInvAmt(Number(e.target.value))}
                          className="w-full p-2 text-xs border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:outline-none"
                          placeholder="e.g. 50000000"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Keterangan / Termin</label>
                        <input
                          type="text"
                          required
                          value={invTitle}
                          onChange={(e) => setInvTitle(e.target.value)}
                          className="w-full p-2 text-xs border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:outline-none"
                          placeholder="e.g. Pelunasan Pasang Kabel"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Jatuh Tempo</label>
                        <input
                          type="date"
                          required
                          value={invDue}
                          onChange={(e) => setInvDue(e.target.value)}
                          className="w-full p-2 text-xs border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddInv(false)}
                        className="px-3 py-1 bg-gray-200 dark:bg-gray-800 text-[10px] text-gray-700 dark:text-gray-300 font-bold rounded"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-orange-600 text-white text-[10px] font-bold rounded"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                )}
                {/* Invoices List */}
                <div className="space-y-2" id="invoices-list-items">
                  {activeProj.invoices.map((inv) => (
                    <div key={inv.id} className="p-3 border border-gray-100 dark:border-gray-750 bg-gray-50/50 dark:bg-gray-900/10 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-xs font-bold text-gray-950 dark:text-gray-100">{inv.invoiceNumber}</span>
                          <span className="text-[10px] text-gray-400 font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">{inv.title}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-455 mt-1 font-mono">
                          Jatuh Tempo: {inv.dueDate}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100/70 dark:border-gray-850">
                        <span className="text-xs font-bold font-mono text-gray-900 dark:text-white">{formatRupiah(inv.amount)}</span>
                        
                        {/* Edit & Delete Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingInvoice(inv)}
                            className="p-1.5 text-orange-600 hover:text-orange-800 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors"
                            title={lang === 'id' ? 'Edit' : 'Edit'}
                          >
                            <Edit2 size={13} />
                          </button>
                          
                          {deleteConfirmId === inv.id ? (
                            <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/30">
                              <button
                                onClick={() => { onDeleteInvoice(activeProj.id, inv.id); setDeleteConfirmId(null); }}
                                className="text-[9px] font-extrabold text-red-650 hover:text-red-800 uppercase tracking-wider"
                              >
                                {lang === 'id' ? 'Ya' : 'Yes'}
                              </button>
                              <span className="text-[9px] text-gray-400">|</span>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-[9px] font-extrabold text-gray-550 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 uppercase tracking-wider"
                              >
                                {lang === 'id' ? 'Batal' : 'No'}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(inv.id)}
                              className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                              title={lang === 'id' ? 'Hapus' : 'Delete'}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}

                          <button
                            onClick={() => onToggleInvoicePaid(activeProj.id, inv.id)}
                            className={`p-1.5 rounded-lg flex items-center justify-center border transition-colors ${
                              inv.isPaid
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-850'
                                : 'bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-850 text-gray-400 hover:text-gray-600 border-gray-200 dark:border-gray-700'
                            }`}
                            title={inv.isPaid ? 'Lunas / Paid' : 'Belum Lunas / Unpaid'}
                          >
                            <Check size={14} className={inv.isPaid ? 'stroke-[3]' : 'stroke-[2]'} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


          </div>
        )}
      </div>

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleEditInvoiceSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xl space-y-4 max-w-md w-full animate-in zoom-in-95 duration-150">
            <div>
              <h4 className="font-sans font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                {lang === 'id' ? 'Edit Termin / Invoice' : 'Edit Billing Term / Invoice'}
              </h4>
              <p className="text-[11px] text-gray-400">
                {lang === 'id' ? 'Perbarui nomor invoice, jumlah penagihan, dan tanggal jatuh tempo' : 'Update the invoice number, billing amount, and due date'}
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">No. Invoice</label>
                <input
                  type="text"
                  required
                  value={editingInvoice.invoiceNumber}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, invoiceNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Jumlah (IDR)' : 'Amount (IDR)'}</label>
                <input
                  type="number"
                  required
                  value={editingInvoice.amount}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Keterangan / Termin' : 'Description / Term'}</label>
                <input
                  type="text"
                  required
                  value={editingInvoice.title}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Jatuh Tempo' : 'Due Date'}</label>
                <input
                  type="date"
                  required
                  value={editingInvoice.dueDate}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, dueDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
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

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleEditProjectSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xl space-y-4 max-w-md w-full animate-in zoom-in-95 duration-150">
            <div>
              <h4 className="font-sans font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                {lang === 'id' ? 'Edit Proyek' : 'Edit Project'}
              </h4>
              <p className="text-[11px] text-gray-400">
                {lang === 'id' ? 'Perbarui informasi nama proyek, total anggaran, dan rentang tanggal' : 'Update the project name, total budget allocation, and date ranges'}
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t.projectName}</label>
                <input
                  type="text"
                  required
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t.budget} (IDR)</label>
                <input
                  type="number"
                  required
                  value={editingProject.budget}
                  onChange={(e) => setEditingProject({ ...editingProject, budget: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t.startDate}</label>
                  <input
                    type="date"
                    required
                    value={editingProject.startDate}
                    onChange={(e) => setEditingProject({ ...editingProject, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t.endDate}</label>
                  <input
                    type="date"
                    required
                    value={editingProject.endDate}
                    onChange={(e) => setEditingProject({ ...editingProject, endDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setEditingProject(null)}
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
