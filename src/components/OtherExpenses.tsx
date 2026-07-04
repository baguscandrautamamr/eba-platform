import React, { useState } from 'react';
import { Project, OtherExpense, Language, UserRole } from '../types';
import { Plus, Search, Filter, Lock, HelpCircle, Edit2, Trash2 } from 'lucide-react';

interface OtherExpensesProps {
  projects: Project[];
  expenses: OtherExpense[];
  onAddExpense: (exp: Omit<OtherExpense, 'id'>) => void;
  onUpdateExpense: (exp: OtherExpense) => void;
  onDeleteExpense: (id: string) => void;
  lang: Language;
  role: UserRole;
}

export const OtherExpenses: React.FC<OtherExpensesProps> = ({
  projects,
  expenses,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  lang,
  role
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [filterProj, setFilterProj] = useState<string>('all');

  // Editing state
  const [editingExpense, setEditingExpense] = useState<OtherExpense | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    onUpdateExpense({
      ...editingExpense,
      projectName: projects.find(p => p.id === editingExpense.projectId)?.name || editingExpense.projectName
    });
    setEditingExpense(null);
  };

  // New Expense Form State
  const [selProjId, setSelProjId] = useState(projects[0]?.id || '');
  const [category, setCategory] = useState<'sewa_alat' | 'transport' | 'konsumsi' | 'retribusi' | 'lain_lain'>('sewa_alat');
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selProjId || !amount) return;

    onAddExpense({
      projectId: selProjId,
      projectName: projects.find(p => p.id === selProjId)?.name || '',
      date: new Date().toISOString().split('T')[0],
      category,
      amount: Number(amount),
      note
    });

    setAmount(0);
    setNote('');
    setShowAdd(false);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getCategoryLabel = (cat: string) => {
    if (lang === 'id') {
      switch (cat) {
        case 'sewa_alat': return 'Sewa Alat (Scaffolding/Genset)';
        case 'transport': return 'Bensin / Transportasi';
        case 'konsumsi': return 'Konsumsi & Makan';
        case 'retribusi': return 'Retribusi / Izin Lingkungan';
        default: return 'Lain-lain';
      }
    } else {
      switch (cat) {
        case 'sewa_alat': return 'Equipment Rental';
        case 'transport': return 'Transport & Petrol';
        case 'konsumsi': return 'Food & Catering';
        case 'retribusi': return 'Local Fees / Permit';
        default: return 'Miscellaneous';
      }
    }
  };

  // If Mandor: obfuscate pricing
  const isMandor = role === 'mandor';

  const filteredExpenses = expenses.filter(e => {
    const matchesProj = filterProj === 'all' || e.projectId === filterProj;
    const matchesSearch = e.note.toLowerCase().includes(search.toLowerCase()) || 
                          e.projectName.toLowerCase().includes(search.toLowerCase());
    return matchesProj && matchesSearch;
  });

  return (
    <div className="space-y-6" id="other-expenses-tab">
      
      {/* Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-sans font-bold text-sm sm:text-base text-gray-900 dark:text-white">
            {lang === 'id' ? 'Pengeluaran Lapangan Lainnya (tb_pengeluaran_lain)' : 'Other Operational Site Expenditures'}
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {lang === 'id' ? 'Sewa genset, scaffolding, bahan bakar mobil bak, konsumsi mandor & retribusi keamanan' : 'Record equipment hires, site petrol, meals, and administrative fees'}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-600/10 transition-colors"
          id="toggle-add-expense-btn"
        >
          <Plus size={14} />
          <span>{lang === 'id' ? 'Tambah Pengeluaran' : 'Add Expense'}</span>
        </button>
      </div>

      {/* Add Operational Expense Accordion */}
      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-md space-y-4 max-w-2xl animate-in fade-in duration-150" id="add-expense-form">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Project Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Proyek Beban' : 'Charge Project'}</label>
              <select
                value={selProjId}
                onChange={(e) => setSelProjId(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Category selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Kategori Pengeluaran' : 'Expense Category'}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
              >
                <option value="sewa_alat">{lang === 'id' ? 'Sewa Alat (Scaffolding/Genset)' : 'Equipment Hire (Scaffolding/Genset)'}</option>
                <option value="transport">{lang === 'id' ? 'Bensin / Transportasi' : 'Transport & Petrol'}</option>
                <option value="konsumsi">{lang === 'id' ? 'Konsumsi & Makan' : 'Catering & Meals'}</option>
                <option value="retribusi">{lang === 'id' ? 'Retribusi / Izin Lingkungan' : 'Permits & Environment Dues'}</option>
                <option value="lain_lain">{lang === 'id' ? 'Lain-lain / Lapangan' : 'Miscellaneous'}</option>
              </select>
            </div>

            {/* Amount */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Besar Pengeluaran (IDR)' : 'Spent Amount (IDR)'}</label>
              {isMandor ? (
                <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 text-xs text-amber-800 dark:text-amber-400 flex items-center gap-2">
                  <Lock size={12} />
                  <span>{lang === 'id' ? 'Input keuangan dikunci untuk Mandor.' : 'Inputs restricted under Site Foreman.'}</span>
                </div>
              ) : (
                <input
                  type="number"
                  required
                  value={amount === 0 ? '' : amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 font-mono"
                  placeholder="e.g. 1500000"
                />
              )}
            </div>

            {/* Details note */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Detail Pengeluaran / Kwitansi' : 'Receipt Description'}</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 min-h-[60px]"
                placeholder="e.g. Kwitansi #1024 - Sewa Scaffolding 10 set selama 1 minggu di site Gedung B"
              />
            </div>

          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700"
            >
              {lang === 'id' ? 'Batal' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isMandor}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl"
            >
              {lang === 'id' ? 'Simpan Pengeluaran' : 'Save Expense'}
            </button>
          </div>
        </form>
      )}

      {/* Filter panel */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 gap-2">
          <Search size={14} className="text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-gray-900 dark:text-white w-full"
            placeholder={lang === 'id' ? 'Cari di kwitansi / catatan...' : 'Search in receipts...'}
          />
        </div>

        <div className="flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 gap-2">
          <Filter size={14} className="text-gray-400" />
          <select
            value={filterProj}
            onChange={(e) => setFilterProj(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-gray-700 dark:text-gray-300 pr-2"
          >
            <option value="all" className="dark:bg-gray-900">{lang === 'id' ? 'Semua Proyek' : 'All Projects'}</option>
            {projects.map(p => (
              <option key={p.id} value={p.id} className="dark:bg-gray-900">{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List expenses table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-2xl shadow-sm overflow-hidden" id="other-expenses-list">
        
        {/* Mobile View: Vertical Cards (No horizontal scroll) */}
        <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-800">
          {filteredExpenses.map((e) => (
            <div key={e.id} className="p-4 space-y-2.5 hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors animate-in fade-in duration-100">
              {/* Date & Category Badge */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-gray-400">{e.date}</span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider bg-orange-100 text-orange-850 dark:bg-orange-950/20 dark:text-orange-400">
                  {getCategoryLabel(e.category)}
                </span>
              </div>

              {/* Project & Note */}
              <div>
                <h5 className="font-bold text-xs text-gray-900 dark:text-white">{e.projectName}</h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{e.note}</p>
              </div>

              {/* Amount & Actions */}
              <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-800 pt-2.5">
                {!isMandor ? (
                  <span className="font-mono font-extrabold text-red-600 text-xs">
                    {formatRupiah(e.amount)}
                  </span>
                ) : (
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Locked</span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingExpense(e)}
                    className="text-orange-600 hover:text-orange-800 p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors"
                    title={lang === 'id' ? 'Edit' : 'Edit'}
                  >
                    <Edit2 size={13} />
                  </button>
                  
                  {deleteConfirmId === e.id ? (
                    <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded-lg border border-red-200 dark:border-red-900/30">
                      <button
                        onClick={() => { onDeleteExpense(e.id); setDeleteConfirmId(null); }}
                        className="text-[9px] font-extrabold text-red-650 hover:text-red-800 uppercase tracking-wider"
                      >
                        {lang === 'id' ? 'Ya' : 'Yes'}
                      </button>
                      <span className="text-[9px] text-gray-400">|</span>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-[9px] font-extrabold text-gray-550 hover:text-gray-750 dark:text-gray-400 dark:hover:text-gray-200 uppercase tracking-wider"
                      >
                        {lang === 'id' ? 'Batal' : 'No'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(e.id)}
                      className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      title={lang === 'id' ? 'Hapus' : 'Delete'}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredExpenses.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-xs">
              {lang === 'id' ? 'Tidak ada catatan pengeluaran operasional.' : 'No other expenditures recorded.'}
            </div>
          )}
        </div>

        {/* Desktop View: Traditional Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3.5">{lang === 'id' ? 'Tanggal & Kategori' : 'Date & Category'}</th>
                <th className="px-4 py-3.5">{lang === 'id' ? 'Proyek Beban' : 'Charged Project'}</th>
                <th className="px-4 py-3.5">{lang === 'id' ? 'Keterangan Kuitansi' : 'Receipt Details'}</th>
                {!isMandor && <th className="px-4 py-3.5 text-right">{lang === 'id' ? 'Jumlah Anggaran' : 'Spent Amount'}</th>}
                <th className="px-4 py-3.5 text-right">{lang === 'id' ? 'Aksi' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {filteredExpenses.map(e => (
                <tr key={e.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                  <td className="px-4 py-3.5">
                    <div>
                      <span className="font-mono text-[10px] text-gray-400">{e.date}</span>
                      <div className="font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                        {getCategoryLabel(e.category)}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-gray-900 dark:text-white">
                    {e.projectName}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">
                    {e.note}
                  </td>
                  {!isMandor && (
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-red-600">
                      {formatRupiah(e.amount)}
                    </td>
                  )}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingExpense(e)}
                        className="text-orange-600 hover:text-orange-800 p-1 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors"
                        title={lang === 'id' ? 'Edit' : 'Edit'}
                      >
                        <Edit2 size={13} />
                      </button>
                      
                      {deleteConfirmId === e.id ? (
                        <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded-lg border border-red-200 dark:border-red-900/30">
                          <button
                            onClick={() => { onDeleteExpense(e.id); setDeleteConfirmId(null); }}
                            className="text-[9px] font-extrabold text-red-650 hover:text-red-800 uppercase tracking-wider"
                          >
                            {lang === 'id' ? 'Ya' : 'Yes'}
                          </button>
                          <span className="text-[9px] text-gray-400">|</span>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-[9px] font-extrabold text-gray-550 hover:text-gray-750 dark:text-gray-400 dark:hover:text-gray-200 uppercase tracking-wider"
                          >
                            {lang === 'id' ? 'Batal' : 'No'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(e.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          title={lang === 'id' ? 'Hapus' : 'Delete'}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={isMandor ? 4 : 5} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                    {lang === 'id' ? 'Tidak ada catatan pengeluaran operasional.' : 'No other expenditures recorded.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleEditSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xl space-y-4 max-w-md w-full animate-in zoom-in-95 duration-150">
            <div>
              <h4 className="font-sans font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                {lang === 'id' ? 'Edit Pengeluaran Operasional' : 'Edit Operational Expense'}
              </h4>
              <p className="text-[11px] text-gray-400">
                {lang === 'id' ? 'Perbarui rincian pengeluaran operasional proyek' : 'Update the details of project operational expenditure'}
              </p>
            </div>

            <div className="space-y-3.5">
              {/* Project selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Proyek' : 'Project'}</label>
                <select
                  value={editingExpense.projectId}
                  onChange={(e) => setEditingExpense({ ...editingExpense, projectId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Category selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Kategori Beban' : 'Expense Category'}</label>
                <select
                  value={editingExpense.category}
                  onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                >
                  <option value="sewa_alat">{lang === 'id' ? 'Sewa Alat (Scaffolding/Genset)' : 'Equipment Rental'}</option>
                  <option value="transport">{lang === 'id' ? 'Bensin / Transportasi' : 'Transport / Fuel'}</option>
                  <option value="konsumsi">{lang === 'id' ? 'Konsumsi & Makan' : 'F&B / Consumables'}</option>
                  <option value="retribusi">{lang === 'id' ? 'Retribusi, Kas Lapangan & Keamanan' : 'Retributions & Site Fees'}</option>
                  <option value="lain_lain">{lang === 'id' ? 'Lain-lain / Biaya Tak Terduga' : 'Others'}</option>
                </select>
              </div>

              {/* Date selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Tanggal Kuitansi' : 'Receipt Date'}</label>
                <input
                  type="date"
                  value={editingExpense.date}
                  onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                />
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Besar Pengeluaran (IDR)' : 'Spent Amount (IDR)'}</label>
                {isMandor ? (
                  <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-800 dark:text-amber-400 flex items-center gap-2">
                    <Lock size={12} />
                    <span>{lang === 'id' ? 'Input keuangan dikunci untuk Mandor.' : 'Inputs restricted under Site Foreman.'}</span>
                  </div>
                ) : (
                  <input
                    type="number"
                    value={editingExpense.amount === 0 ? '' : editingExpense.amount}
                    onChange={(e) => setEditingExpense({ ...editingExpense, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                  />
                )}
              </div>

              {/* Note / Receipts */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Deskripsi / Detail Nota' : 'Details / Notes'}</label>
                <textarea
                  value={editingExpense.note}
                  onChange={(e) => setEditingExpense({ ...editingExpense, note: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl min-h-[60px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
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
