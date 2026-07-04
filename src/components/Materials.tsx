import React, { useState } from 'react';
import { Project, MaterialTransaction, Language, UserRole } from '../types';
import { Plus, Search, Filter, Lock, ArrowDownCircle, ArrowUpCircle, Edit2, Trash2 } from 'lucide-react';
import { formatNumberInput, parseFormattedNumber } from '../utils/currency';

interface MaterialsProps {
  projects: Project[];
  materials: MaterialTransaction[];
  onAddMaterial: (mat: Omit<MaterialTransaction, 'id' | 'totalPrice'>) => void;
  onUpdateMaterial: (mat: MaterialTransaction) => void;
  onDeleteMaterial: (id: string) => void;
  lang: Language;
  role: UserRole;
}

export const Materials: React.FC<MaterialsProps> = ({
  projects,
  materials,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
  lang,
  role
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [filterProj, setFilterProj] = useState<string>('all');

  // Editing state
  const [editingMaterial, setEditingMaterial] = useState<MaterialTransaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;
    onUpdateMaterial({
      ...editingMaterial,
      projectName: projects.find(p => p.id === editingMaterial.projectId)?.name || editingMaterial.projectName,
      totalPrice: editingMaterial.quantity * editingMaterial.pricePerUnit
    });
    setEditingMaterial(null);
  };

  // New Transaction Form State
  const [selProjId, setSelProjId] = useState(projects[0]?.id || '');
  const [type, setType] = useState<'masuk' | 'keluar'>('masuk');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('Roll');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selProjId || !itemName || !quantity) return;

    onAddMaterial({
      projectId: selProjId,
      projectName: projects.find(p => p.id === selProjId)?.name || '',
      date: new Date().toISOString().split('T')[0],
      type,
      itemName,
      quantity: Number(quantity),
      unit,
      pricePerUnit: parseFormattedNumber(price),
      note
    });

    setItemName('');
    setQuantity(1);
    setPrice('');
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

  // If Mandor: hide all financial columns and inputs
  const isMandor = role === 'mandor';

  // Filter materials
  const filteredMaterials = materials.filter(m => {
    const matchesProj = filterProj === 'all' || m.projectId === filterProj;
    const matchesSearch = m.itemName.toLowerCase().includes(search.toLowerCase()) || 
                          m.projectName.toLowerCase().includes(search.toLowerCase());
    return matchesProj && matchesSearch;
  });

  return (
    <div className="space-y-6" id="materials-tab-content">
      
      {/* Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-sans font-bold text-sm sm:text-base text-gray-900 dark:text-white">
            {lang === 'id' ? 'Log Inventaris & Alur Material' : 'Material Logs & Logistics'}
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {lang === 'id' ? 'Catat pemasukan (masuk) dan pengeluaran (keluar) material per proyek' : 'Log incoming supply and outgoing material allocations'}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-600/10 transition-colors"
          id="toggle-add-material-btn"
        >
          <Plus size={14} />
          <span>{lang === 'id' ? 'Catat Material' : 'Log Material'}</span>
        </button>
      </div>

      {/* Add Material Accordion */}
      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-md space-y-4 max-w-3xl animate-in fade-in duration-150" id="add-material-form">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Project Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Tujuan Proyek' : 'Target Project'}</label>
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

            {/* Type Selector (Masuk/Keluar) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Tipe Alur' : 'Transaction Type'}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('masuk')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                    type === 'masuk'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-500 dark:bg-emerald-900/15 dark:text-emerald-400'
                      : 'bg-white text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700'
                  }`}
                >
                  <ArrowDownCircle size={14} />
                  <span>{lang === 'id' ? 'Material Masuk' : 'Inbound Supply'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('keluar')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                    type === 'keluar'
                      ? 'bg-red-50 text-red-800 border-red-500 dark:bg-red-900/15 dark:text-red-400'
                      : 'bg-white text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700'
                  }`}
                >
                  <ArrowUpCircle size={14} />
                  <span>{lang === 'id' ? 'Material Keluar' : 'Outbound Allocation'}</span>
                </button>
              </div>
            </div>

            {/* Item Name */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Nama Barang / Deskripsi' : 'Item Name / Spec'}</label>
              <input
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                placeholder="e.g. Kabel NYM 3x2.5mm Supreme atau Semen Gresik 50kg"
              />
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Jumlah (Qty)' : 'Quantity'}</label>
              <input
                type="number"
                min="1"
                required
                value={quantity === 0 ? '' : quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
              />
            </div>

            {/* Unit */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Satuan' : 'Unit'}</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
              >
                <option value="Roll">Roll</option>
                <option value="Batang">Batang</option>
                <option value="Zak">Zak</option>
                <option value="Kg">Kg</option>
                <option value="Pcs">Pcs</option>
                <option value="Box">Box</option>
                <option value="m3">m3</option>
                <option value="Unit">Unit</option>
              </select>
            </div>

            {/* Price (Only show if NOT mandor) */}
            {!isMandor ? (
              <div className="space-y-1.5 sm:col-span-2 bg-orange-50/20 dark:bg-orange-950/5 p-3.5 rounded-xl border border-orange-100 dark:border-orange-900/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Harga Satuan (IDR)' : 'Price per Unit (IDR)'}</label>
                    <input
                      type="text"
                      value={price}
                      onChange={(e) => setPrice(formatNumberInput(e.target.value))}
                      className="w-full px-3 py-2 text-xs border rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                      placeholder="e.g. 850.000"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <span className="text-[9px] text-gray-400 font-bold uppercase">{lang === 'id' ? 'Estimasi Total Pengeluaran' : 'Estimated Total Cost'}</span>
                    <span className="text-sm font-bold font-mono text-gray-900 dark:text-white mt-1">
                      {formatRupiah(quantity * parseFormattedNumber(price))}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="sm:col-span-2 bg-amber-50/30 dark:bg-amber-950/5 p-3 rounded-xl border border-amber-100/50 dark:border-amber-900/10 flex items-center gap-2 text-amber-800 dark:text-amber-400 text-[10px]">
                <Lock size={12} />
                <span>{lang === 'id' ? 'Kolom harga disembunyikan otomatis untuk peran Mandor Lapangan.' : 'Price column automatically omitted under site foreman profile.'}</span>
              </div>
            )}

            {/* Note */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Keterangan tambahan' : 'Additional note'}</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 min-h-[60px]"
                placeholder="e.g. Dipasang di koridor utama lantai dasar..."
              />
            </div>

          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
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
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 gap-2" id="material-search-container">
          <Search size={14} className="text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-gray-900 dark:text-white w-full"
            placeholder={lang === 'id' ? 'Cari material atau proyek...' : 'Search supplies or projects...'}
          />
        </div>

        {/* Project Filter */}
        <div className="flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 gap-2" id="material-filter-container">
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

      {/* Materials Table / List Grid */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-2xl shadow-sm overflow-hidden" id="materials-log-list">
        
        {/* Mobile View: Vertical Cards (No horizontal scroll) */}
        <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-800">
          {filteredMaterials.map((mat) => (
            <div key={mat.id} className="p-4 space-y-2.5 hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
              {/* Top row: Date + Type Badge & Quantity */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${mat.type === 'masuk' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="font-mono text-[10px] text-gray-500 dark:text-gray-450">{mat.date}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                    mat.type === 'masuk' 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' 
                      : 'bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400'
                  }`}>
                    {mat.type === 'masuk' ? 'IN' : 'OUT'}
                  </span>
                </div>
                <span className="font-mono font-bold text-xs bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-lg border border-orange-100/30">
                  {mat.quantity} {mat.unit}
                </span>
              </div>

              {/* Middle row: Project Name */}
              <div className="text-xs font-extrabold text-gray-900 dark:text-white leading-tight">
                {mat.projectName}
              </div>

              {/* Material Details Block */}
              <div className="bg-gray-50 dark:bg-gray-900/60 p-2.5 rounded-xl border border-gray-100/50 dark:border-gray-800/50 space-y-1">
                <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  {mat.itemName}
                </div>
                {mat.note && (
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 italic">
                    {lang === 'id' ? 'Keterangan: ' : 'Note: '}{mat.note}
                  </div>
                )}
              </div>

              {/* Financial section (Only if NOT mandor) */}
              {!isMandor && (
                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-gray-100/50 dark:border-gray-850">
                  <span className="text-gray-400 dark:text-gray-550 font-medium">
                    {lang === 'id' ? 'Harga Satuan: ' : 'Rate: '}<span className="font-mono text-gray-700 dark:text-gray-300 font-bold">{formatRupiah(mat.pricePerUnit)}</span>
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    {lang === 'id' ? 'Total Nilai: ' : 'Total: '}
                    <span className="font-mono text-gray-950 dark:text-white font-extrabold text-xs ml-1">{formatRupiah(mat.totalPrice)}</span>
                  </span>
                </div>
              )}

              {/* Mobile Actions row */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-150 dark:border-gray-800">
                <button
                  onClick={() => setEditingMaterial(mat)}
                  className="flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-850 transition-colors"
                >
                  <Edit2 size={12} />
                  <span>{lang === 'id' ? 'Edit' : 'Edit'}</span>
                </button>
                {deleteConfirmId === mat.id ? (
                  <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-lg border border-red-200 dark:border-red-900/30">
                    <button
                      onClick={() => { onDeleteMaterial(mat.id); setDeleteConfirmId(null); }}
                      className="text-[10px] font-extrabold text-red-650 hover:text-red-800 uppercase tracking-wider"
                    >
                      {lang === 'id' ? 'Ya' : 'Yes'}
                    </button>
                    <span className="text-gray-350 dark:text-gray-650">|</span>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="text-[10px] font-extrabold text-gray-550 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 uppercase tracking-wider"
                    >
                      {lang === 'id' ? 'Batal' : 'No'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(mat.id)}
                    className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-750 transition-colors"
                  >
                    <Trash2 size={12} />
                    <span>{lang === 'id' ? 'Hapus' : 'Delete'}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredMaterials.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-xs font-medium">
              {lang === 'id' ? 'Tidak ada catatan material yang cocok.' : 'No materials logged matching filter criteria.'}
            </div>
          )}
        </div>

        {/* Desktop View: Wide Table Layout */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3.5">{lang === 'id' ? 'Tanggal & Alur' : 'Date & Flow'}</th>
                <th className="px-4 py-3.5">{lang === 'id' ? 'Nama Proyek' : 'Project Name'}</th>
                <th className="px-4 py-3.5">{lang === 'id' ? 'Deskripsi Barang' : 'Item Description'}</th>
                <th className="px-4 py-3.5 text-center">{lang === 'id' ? 'Kuantitas' : 'Quantity'}</th>
                {!isMandor && <th className="px-4 py-3.5 text-right">{lang === 'id' ? 'Harga Satuan' : 'Rate'}</th>}
                {!isMandor && <th className="px-4 py-3.5 text-right">{lang === 'id' ? 'Total Nilai' : 'Total Value'}</th>}
                <th className="px-4 py-3.5">{lang === 'id' ? 'Keterangan' : 'Note'}</th>
                <th className="px-4 py-3.5 text-right">{lang === 'id' ? 'Aksi' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {filteredMaterials.map((mat) => (
                <tr key={mat.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${mat.type === 'masuk' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <div className="font-mono text-[10px] text-gray-500 dark:text-gray-400">
                        {mat.date} 
                        <span className={`ml-1.5 px-1 py-0.5 rounded text-[8px] font-bold uppercase ${
                          mat.type === 'masuk' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' 
                            : 'bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400'
                        }`}>
                          {mat.type === 'masuk' ? 'IN' : 'OUT'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-gray-950 dark:text-gray-200">
                    <div className="truncate max-w-[150px]" title={mat.projectName}>
                      {mat.projectName}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-gray-900 dark:text-gray-300">
                    {mat.itemName}
                  </td>
                  <td className="px-4 py-3.5 text-center font-bold font-mono">
                    {mat.quantity} {mat.unit}
                  </td>
                  {!isMandor && (
                    <td className="px-4 py-3.5 text-right font-mono text-gray-600 dark:text-gray-400">
                      {formatRupiah(mat.pricePerUnit)}
                    </td>
                  )}
                  {!isMandor && (
                    <td className="px-4 py-3.5 text-right font-bold font-mono text-gray-900 dark:text-white">
                      {formatRupiah(mat.totalPrice)}
                    </td>
                  )}
                  <td className="px-4 py-3.5 text-gray-500 dark:text-gray-455 italic truncate max-w-[150px]">
                    {mat.note || '-'}
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingMaterial(mat)}
                        className="text-orange-600 hover:text-orange-800 p-1 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors"
                        title={lang === 'id' ? 'Edit' : 'Edit'}
                      >
                        <Edit2 size={13} />
                      </button>
                      
                      {deleteConfirmId === mat.id ? (
                        <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded-lg border border-red-200 dark:border-red-900/30">
                          <button
                            onClick={() => { onDeleteMaterial(mat.id); setDeleteConfirmId(null); }}
                            className="text-[9px] font-extrabold text-red-600 hover:text-red-800 uppercase tracking-wider"
                          >
                            {lang === 'id' ? 'Ya' : 'Yes'}
                          </button>
                          <span className="text-[9px] text-gray-400">|</span>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-[9px] font-extrabold text-gray-500 hover:text-gray-750 dark:text-gray-400 dark:hover:text-gray-200 uppercase tracking-wider"
                          >
                            {lang === 'id' ? 'Batal' : 'No'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(mat.id)}
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
              {filteredMaterials.length === 0 && (
                <tr>
                  <td colSpan={isMandor ? 6 : 8} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                    {lang === 'id' ? 'Tidak ada catatan material yang cocok.' : 'No materials logged matching filter criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Material Modal */}
      {editingMaterial && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleEditSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xl space-y-4 max-w-lg w-full animate-in zoom-in-95 duration-150">
            <div>
              <h4 className="font-sans font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                {lang === 'id' ? 'Edit Log Material' : 'Edit Material Log'}
              </h4>
              <p className="text-[11px] text-gray-400">
                {lang === 'id' ? 'Perbarui informasi transaksi material masuk/keluar' : 'Update incoming or outgoing material transaction details'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Project selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Tujuan Proyek' : 'Target Project'}</label>
                <select
                  value={editingMaterial.projectId}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, projectId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Type selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Tipe Alur' : 'Transaction Type'}</label>
                <select
                  value={editingMaterial.type}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, type: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                >
                  <option value="masuk">{lang === 'id' ? 'Material Masuk' : 'Inbound Supply'}</option>
                  <option value="keluar">{lang === 'id' ? 'Material Keluar' : 'Outbound Allocation'}</option>
                </select>
              </div>

              {/* Item Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Nama Barang / Deskripsi' : 'Item Name / Spec'}</label>
                <input
                  type="text"
                  required
                  value={editingMaterial.itemName}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, itemName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                />
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Jumlah (Qty)' : 'Quantity'}</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editingMaterial.quantity === 0 ? '' : editingMaterial.quantity}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                />
              </div>

              {/* Unit */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Satuan' : 'Unit'}</label>
                <select
                  value={editingMaterial.unit}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, unit: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                >
                  <option value="Roll">Roll</option>
                  <option value="Batang">Batang</option>
                  <option value="Zak">Zak</option>
                  <option value="Kg">Kg</option>
                  <option value="Pcs">Pcs</option>
                  <option value="Box">Box</option>
                  <option value="m3">m3</option>
                  <option value="Unit">Unit</option>
                </select>
              </div>

              {/* Price */}
              {!isMandor ? (
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Harga Satuan (IDR)' : 'Price per Unit (IDR)'}</label>
                  <input
                    type="text"
                    value={formatNumberInput(editingMaterial.pricePerUnit)}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, pricePerUnit: parseFormattedNumber(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl"
                  />
                </div>
              ) : (
                <div className="sm:col-span-2 bg-amber-50/30 dark:bg-amber-950/5 p-3 rounded-xl border border-amber-100/50 dark:border-amber-900/10 flex items-center gap-2 text-amber-800 dark:text-amber-400 text-[10px]">
                  <Lock size={12} />
                  <span>{lang === 'id' ? 'Kolom harga disembunyikan otomatis untuk peran Mandor Lapangan.' : 'Price column automatically omitted under site foreman profile.'}</span>
                </div>
              )}

              {/* Note */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{lang === 'id' ? 'Keterangan Tambahan' : 'Note'}</label>
                <textarea
                  value={editingMaterial.note}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, note: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl min-h-[60px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setEditingMaterial(null)}
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
