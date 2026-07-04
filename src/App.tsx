import { useState, useEffect } from 'react';
import { 
  Project, 
  Invoice,
  MaterialTransaction, 
  Employee, 
  Attendance, 
  Kasbon, 
  Overtime, 
  OtherExpense, 
  ProgressPhoto, 
  DeploymentLog, 
  Theme, 
  Language, 
  UserRole,
  UploadQueueItem
} from './types';
import { translations } from './utils/lang';
import { 
  initialProjects, 
  initialEmployees, 
  initialMaterials, 
  initialAttendance, 
  initialKasbons, 
  initialOvertimes, 
  initialOtherExpenses, 
  initialDeploymentLogs, 
  initialProgressPhotos 
} from './data/initialData';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ProjectList } from './components/ProjectList';
import { Materials } from './components/Materials';
import { ProgressPhotos } from './components/ProgressPhotos';
import { AttendanceAndStaff } from './components/AttendanceAndStaff';
import { OtherExpenses } from './components/OtherExpenses';
import { ReportShare } from './components/ReportShare';
import { DeploymentDashboard } from './components/DeploymentDashboard';
import { 
  LayoutDashboard, 
  FolderGit2, 
  Truck, 
  Camera, 
  Users, 
  FileCheck, 
  Share2, 
  Terminal, 
  CheckCircle2, 
  LockKeyhole,
  Smartphone,
  Eye,
  MoreHorizontal,
  X
} from 'lucide-react';

export default function App() {
  // System State
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('EBA_THEME') as Theme) || 'light');
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('EBA_LANG') as Language) || 'id');
  const [role, setRole] = useState<UserRole>(() => {
    const savedRole = localStorage.getItem('EBA_ROLE');
    if (!savedRole || savedRole === 'guest' || savedRole === 'mandor') {
      localStorage.setItem('EBA_ROLE', 'user');
      return 'user';
    }
    return savedRole as UserRole;
  });
  const [isOffline, setIsOffline] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState('EBA_SECURE_KEY');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Core Datasets
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [materials, setMaterials] = useState<MaterialTransaction[]>(initialMaterials);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [attendance, setAttendance] = useState<Attendance[]>(initialAttendance);
  const [kasbons, setKasbons] = useState<Kasbon[]>(initialKasbons);
  const [overtimes, setOvertimes] = useState<Overtime[]>(initialOvertimes);
  const [otherExpenses, setOtherExpenses] = useState<OtherExpense[]>(initialOtherExpenses);
  const [photos, setPhotos] = useState<ProgressPhoto[]>(initialProgressPhotos);
  const [deploymentLogs, setDeploymentLogs] = useState<DeploymentLog[]>(initialDeploymentLogs);
  
  // Offline Sync Queue state
  const [offlineQueue, setOfflineQueue] = useState<UploadQueueItem[]>([]);

  const t = translations[lang];

  // Apply Theme class on root
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Sync HTML lang attribute with app state to prevent automatic translation prompts
  useEffect(() => {
    window.document.documentElement.lang = lang;
  }, [lang]);

  // Handle User Role restriction
  useEffect(() => {
    if (role === 'user' && activeTab !== 'photos') {
      setActiveTab('photos');
    }
  }, [role, activeTab]);

  // Load and save state simulated encryption
  useEffect(() => {
    const savedProjects = localStorage.getItem('EBA_PROJECTS');
    const savedMaterials = localStorage.getItem('EBA_MATERIALS');
    const savedEmployees = localStorage.getItem('EBA_EMPLOYEES');
    const savedAttendance = localStorage.getItem('EBA_ATTENDANCE');
    const savedKasbons = localStorage.getItem('EBA_KASBONS');
    const savedOvertimes = localStorage.getItem('EBA_OVERTIMES');
    const savedExpenses = localStorage.getItem('EBA_EXPENSES');
    const savedPhotos = localStorage.getItem('EBA_PHOTOS');

    if (savedProjects) setProjects(JSON.parse(savedProjects));
    if (savedMaterials) setMaterials(JSON.parse(savedMaterials));
    if (savedEmployees) setEmployees(JSON.parse(savedEmployees));
    if (savedAttendance) setAttendance(JSON.parse(savedAttendance));
    if (savedKasbons) setKasbons(JSON.parse(savedKasbons));
    if (savedOvertimes) setOvertimes(JSON.parse(savedOvertimes));
    if (savedExpenses) setOtherExpenses(JSON.parse(savedExpenses));
    if (savedPhotos) setPhotos(JSON.parse(savedPhotos));
  }, []);

  const saveToLocalStorage = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn(`Failed to save to localStorage for key ${key}:`, e);
    }
  };

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    saveToLocalStorage('EBA_THEME', newTheme);
  };

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    saveToLocalStorage('EBA_LANG', newLang);
  };

  const handleSetRole = (newRole: UserRole) => {
    setRole(newRole);
    saveToLocalStorage('EBA_ROLE', newRole);
  };

  // State Modifiers
  const handleAddProject = (newProj: Omit<Project, 'id' | 'invoices'>) => {
    const proj: Project = {
      ...newProj,
      id: `proj_${Date.now()}`,
      invoices: [
        {
          id: `inv_${Date.now()}_1`,
          invoiceNumber: `INV/EBA/2026/${Math.floor(Math.random() * 900) + 100}`,
          amount: Math.round(newProj.budget * 0.3),
          dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          isPaid: false,
          title: "DP Termin 1 - 30%"
        }
      ]
    };
    const updated = [proj, ...projects];
    setProjects(updated);
    saveToLocalStorage('EBA_PROJECTS', updated);
  };

  const handleUpdateProject = (updatedProj: Project) => {
    const updated = projects.map(p => p.id === updatedProj.id ? updatedProj : p);
    setProjects(updated);
    saveToLocalStorage('EBA_PROJECTS', updated);
  };

  const handleDeleteProject = (projId: string) => {
    const updated = projects.filter(p => p.id !== projId);
    setProjects(updated);
    saveToLocalStorage('EBA_PROJECTS', updated);
  };

  const handleUpdateScurve = (projId: string, scurvePlan: number[], scurveActual: number[]) => {
    const updated = projects.map(p => {
      if (p.id === projId) {
        return { ...p, scurvePlan, scurveActual };
      }
      return p;
    });
    setProjects(updated);
    saveToLocalStorage('EBA_PROJECTS', updated);
  };

  const handleToggleInvoicePaid = (projId: string, invoiceId: string) => {
    const updated = projects.map(p => {
      if (p.id === projId) {
        return {
          ...p,
          invoices: p.invoices.map(inv => inv.id === invoiceId ? { ...inv, isPaid: !inv.isPaid } : inv)
        };
      }
      return p;
    });
    setProjects(updated);
    saveToLocalStorage('EBA_PROJECTS', updated);
  };

  const handleAddInvoice = (projId: string, invoice: Omit<Invoice, 'id' | 'isPaid'>) => {
    const updated = projects.map(p => {
      if (p.id === projId) {
        return {
          ...p,
          invoices: [
            ...p.invoices,
            {
              ...invoice,
              id: `inv_${Date.now()}`,
              isPaid: false
            }
          ]
        };
      }
      return p;
    });
    setProjects(updated);
    saveToLocalStorage('EBA_PROJECTS', updated);
  };

  const handleUpdateInvoice = (projId: string, updatedInv: Invoice) => {
    const updated = projects.map(p => {
      if (p.id === projId) {
        return {
          ...p,
          invoices: p.invoices.map(inv => inv.id === updatedInv.id ? updatedInv : inv)
        };
      }
      return p;
    });
    setProjects(updated);
    saveToLocalStorage('EBA_PROJECTS', updated);
  };

  const handleDeleteInvoice = (projId: string, invoiceId: string) => {
    const updated = projects.map(p => {
      if (p.id === projId) {
        return {
          ...p,
          invoices: p.invoices.filter(inv => inv.id !== invoiceId)
        };
      }
      return p;
    });
    setProjects(updated);
    saveToLocalStorage('EBA_PROJECTS', updated);
  };

  const handleAddMaterial = (newMat: Omit<MaterialTransaction, 'id' | 'totalPrice'>) => {
    const mat: MaterialTransaction = {
      ...newMat,
      id: `mat_${Date.now()}`,
      totalPrice: newMat.quantity * newMat.pricePerUnit
    };
    const updated = [mat, ...materials];
    setMaterials(updated);
    saveToLocalStorage('EBA_MATERIALS', updated);
  };

  const handleAddPhoto = (newPhoto: Omit<ProgressPhoto, 'id' | 'watermarked'> & { id?: string }) => {
    const photo: ProgressPhoto = {
      ...newPhoto,
      id: newPhoto.id || `ph_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      watermarked: true
    };
    setPhotos(prev => {
      const updated = [photo, ...prev];
      saveToLocalStorage('EBA_PHOTOS', updated);
      return updated;
    });
  };

  const handleAddEmployee = (newEmp: Omit<Employee, 'id'>) => {
    const emp: Employee = {
      ...newEmp,
      id: `emp_${Date.now()}`
    };
    const updated = [...employees, emp];
    setEmployees(updated);
    saveToLocalStorage('EBA_EMPLOYEES', updated);
  };

  const handleUpdateEmployee = (updatedEmp: Employee) => {
    const updated = employees.map(emp => emp.id === updatedEmp.id ? updatedEmp : emp);
    setEmployees(updated);
    saveToLocalStorage('EBA_EMPLOYEES', updated);
  };

  const handleDeleteEmployee = (empId: string) => {
    const updated = employees.filter(emp => emp.id !== empId);
    setEmployees(updated);
    saveToLocalStorage('EBA_EMPLOYEES', updated);
  };

  const handleLogAttendance = (records: Omit<Attendance, 'id'>[]) => {
    const formatted: Attendance[] = records.map((r, i) => ({
      ...r,
      id: `att_${Date.now()}_${i}`
    }));
    // Overwrite attendance for the same date to avoid duplication
    const targetDate = records[0]?.date;
    const filtered = attendance.filter(a => a.date !== targetDate);
    const updated = [...formatted, ...filtered];
    setAttendance(updated);
    saveToLocalStorage('EBA_ATTENDANCE', updated);
  };

  const handleAddKasbon = (newKas: Omit<Kasbon, 'id'>) => {
    const kas: Kasbon = {
      ...newKas,
      id: `kas_${Date.now()}`
    };
    const updated = [kas, ...kasbons];
    setKasbons(updated);
    saveToLocalStorage('EBA_KASBONS', updated);
  };

  const handleUpdateKasbon = (updatedKas: Kasbon) => {
    const updated = kasbons.map(k => k.id === updatedKas.id ? updatedKas : k);
    setKasbons(updated);
    saveToLocalStorage('EBA_KASBONS', updated);
  };

  const handleDeleteKasbon = (id: string) => {
    const updated = kasbons.filter(k => k.id !== id);
    setKasbons(updated);
    saveToLocalStorage('EBA_KASBONS', updated);
  };

  const handleAddOvertime = (newOv: Omit<Overtime, 'id' | 'totalAmount'>) => {
    const ov: Overtime = {
      ...newOv,
      id: `ov_${Date.now()}`,
      totalAmount: newOv.hours * newOv.hourlyRate
    };
    const updated = [ov, ...overtimes];
    setOvertimes(updated);
    saveToLocalStorage('EBA_OVERTIMES', updated);
  };

  const handleUpdateOvertime = (updatedOv: Overtime) => {
    const updated = overtimes.map(o => o.id === updatedOv.id ? { ...updatedOv, totalAmount: updatedOv.hours * updatedOv.hourlyRate } : o);
    setOvertimes(updated);
    saveToLocalStorage('EBA_OVERTIMES', updated);
  };

  const handleDeleteOvertime = (id: string) => {
    const updated = overtimes.filter(o => o.id !== id);
    setOvertimes(updated);
    saveToLocalStorage('EBA_OVERTIMES', updated);
  };

  const handleAddExpense = (newExp: Omit<OtherExpense, 'id'>) => {
    const exp: OtherExpense = {
      ...newExp,
      id: `exp_${Date.now()}`
    };
    const updated = [exp, ...otherExpenses];
    setOtherExpenses(updated);
    saveToLocalStorage('EBA_EXPENSES', updated);
  };

  const handleUpdateExpense = (updatedExp: OtherExpense) => {
    const updated = otherExpenses.map(e => e.id === updatedExp.id ? updatedExp : e);
    setOtherExpenses(updated);
    saveToLocalStorage('EBA_EXPENSES', updated);
  };

  const handleDeleteExpense = (id: string) => {
    const updated = otherExpenses.filter(e => e.id !== id);
    setOtherExpenses(updated);
    saveToLocalStorage('EBA_EXPENSES', updated);
  };

  const handleUpdateMaterial = (updatedMat: MaterialTransaction) => {
    const updated = materials.map(m => m.id === updatedMat.id ? updatedMat : m);
    setMaterials(updated);
    saveToLocalStorage('EBA_MATERIALS', updated);
  };

  const handleDeleteMaterial = (id: string) => {
    const updated = materials.filter(m => m.id !== id);
    setMaterials(updated);
    saveToLocalStorage('EBA_MATERIALS', updated);
  };

  const handleUpdatePhoto = (updatedPhoto: ProgressPhoto) => {
    const updated = photos.map(p => p.id === updatedPhoto.id ? updatedPhoto : p);
    setPhotos(updated);
    saveToLocalStorage('EBA_PHOTOS', updated);
  };

  const handleDeletePhoto = (idOrIds: string | string[]) => {
    setPhotos(prev => {
      const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
      const updated = prev.filter(p => !ids.includes(p.id));
      saveToLocalStorage('EBA_PHOTOS', updated);
      return updated;
    });
  };

  const handleAddOfflineItem = (type: 'photo', payload: any) => {
    const queueItem: UploadQueueItem = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type,
      payload,
      timestamp: Date.now()
    };
    setOfflineQueue(prev => [...prev, queueItem]);
  };

  const handleSyncQueue = () => {
    // Process queue elements
    offlineQueue.forEach((item) => {
      if (item.type === 'photo') {
        handleAddPhoto(item.payload);
      }
    });
    setOfflineQueue([]);
  };

  // Database Backup and Restore Handlers
  const handleRestoreDatabase = (restored: any) => {
    if (!restored) return;
    
    if (Array.isArray(restored.projects)) {
      setProjects(restored.projects);
      saveToLocalStorage('EBA_PROJECTS', restored.projects);
    }
    if (Array.isArray(restored.materials)) {
      setMaterials(restored.materials);
      saveToLocalStorage('EBA_MATERIALS', restored.materials);
    }
    if (Array.isArray(restored.employees)) {
      setEmployees(restored.employees);
      saveToLocalStorage('EBA_EMPLOYEES', restored.employees);
    }
    if (Array.isArray(restored.attendance)) {
      setAttendance(restored.attendance);
      saveToLocalStorage('EBA_ATTENDANCE', restored.attendance);
    }
    if (Array.isArray(restored.kasbons)) {
      setKasbons(restored.kasbons);
      saveToLocalStorage('EBA_KASBONS', restored.kasbons);
    }
    if (Array.isArray(restored.overtimes)) {
      setOvertimes(restored.overtimes);
      saveToLocalStorage('EBA_OVERTIMES', restored.overtimes);
    }
    if (Array.isArray(restored.otherExpenses)) {
      setOtherExpenses(restored.otherExpenses);
      saveToLocalStorage('EBA_EXPENSES', restored.otherExpenses);
    }
    if (Array.isArray(restored.photos)) {
      setPhotos(restored.photos);
      saveToLocalStorage('EBA_PHOTOS', restored.photos);
    }
  };

  const handleBackupDatabase = () => {
    return {
      projects,
      materials,
      employees,
      attendance,
      kasbons,
      overtimes,
      otherExpenses: otherExpenses,
      photos
    };
  };

  // DevOps simulated logs modifiers
  const handleAddDeploymentLog = (log: DeploymentLog) => {
    setDeploymentLogs([log, ...deploymentLogs]);
  };

  const handleRollbackDeployment = (targetHash: string) => {
    const target = deploymentLogs.find(l => l.commitHash === targetHash);
    if (!target) return;

    const rollbackLog: DeploymentLog = {
      id: `dep_${Date.now()}`,
      commitHash: 'rollback',
      commitMessage: `Manual Rollback: Reverted production to stable commit [${targetHash}]`,
      branch: 'main',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: 'rolled_back',
      vercelUrl: 'eba-project-94112.vercel.app'
    };
    setDeploymentLogs([rollbackLog, ...deploymentLogs]);
  };

  // Nav Links List
  const tabs = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'projects', label: t.projects, icon: FolderGit2 },
    { id: 'materials', label: t.materials, icon: Truck },
    { id: 'photos', label: t.progressPhotos, icon: Camera },
    { id: 'attendance', label: t.hrAttendance, icon: Users },
    { id: 'expenses', label: t.otherExpenses, icon: FileCheck },
    { id: 'report', label: t.dailyReport, icon: Share2 },
    { id: 'devops', label: t.deployments, icon: Terminal }
  ];

  // Filter tabs for User and Admin
  const filteredTabs = role === 'user' 
    ? tabs.filter(tab => tab.id === 'photos')
    : tabs;

  const showMoreMenu = filteredTabs.length > 4;
  const primaryTabs = showMoreMenu ? filteredTabs.slice(0, 4) : filteredTabs;
  const secondaryTabs = showMoreMenu ? filteredTabs.slice(4) : [];
  const isSecondaryActive = secondaryTabs.some(tab => tab.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 flex flex-col transition-colors duration-250 font-sans" id="eba-main-container">
      
      {/* Header controls */}
      <Header 
        theme={theme}
        setTheme={handleSetTheme}
        lang={lang}
        setLang={handleSetLang}
        role={role}
        setRole={handleSetRole}
        isOffline={isOffline}
        setIsOffline={setIsOffline}
        t={t}
        syncQueueLength={offlineQueue.length}
        onSync={handleSyncQueue}
        encryptionKey={encryptionKey}
        setEncryptionKey={setEncryptionKey}
      />

      {/* Main Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col md:flex-row gap-6 pb-24 md:pb-6" id="eba-body">
        
        {/* Desktop Sidebar (Hidden on mobile) */}
        <aside className="hidden md:flex flex-col gap-1.5 w-60 h-fit bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 rounded-2xl shadow-sm" id="desktop-sidebar">
          <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 mb-2">
            Navigation Rails
          </div>
          {filteredTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/15'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                id={`tab-${tab.id}-desc`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Dynamic Pages Area */}
        <main className="flex-1 min-w-0" id="main-route-outlet">
          {activeTab === 'dashboard' && (
            <Dashboard 
              projects={projects}
              materials={materials}
              employees={employees}
              attendance={attendance}
              kasbons={kasbons}
              overtimes={overtimes}
              otherExpenses={otherExpenses}
              lang={lang}
              role={role}
              isOffline={isOffline}
              onDataRestore={handleRestoreDatabase}
              onDataBackup={handleBackupDatabase}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectList 
              projects={projects}
              materials={materials}
              otherExpenses={otherExpenses}
              onAddProject={handleAddProject}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              onUpdateScurve={handleUpdateScurve}
              onToggleInvoicePaid={handleToggleInvoicePaid}
              onAddInvoice={handleAddInvoice}
              onUpdateInvoice={handleUpdateInvoice}
              onDeleteInvoice={handleDeleteInvoice}
              lang={lang}
              role={role}
            />
          )}

          {activeTab === 'materials' && (
            <Materials 
              projects={projects}
              materials={materials}
              onAddMaterial={handleAddMaterial}
              onUpdateMaterial={handleUpdateMaterial}
              onDeleteMaterial={handleDeleteMaterial}
              lang={lang}
              role={role}
            />
          )}

          {activeTab === 'photos' && (
            <ProgressPhotos 
              projects={projects}
              photos={photos}
              onAddPhoto={handleAddPhoto}
              onUpdatePhoto={handleUpdatePhoto}
              onDeletePhoto={handleDeletePhoto}
              isOffline={isOffline}
              offlineQueue={offlineQueue}
              onAddOfflineItem={handleAddOfflineItem}
              lang={lang}
              role={role}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendanceAndStaff 
              employees={employees}
              attendance={attendance}
              kasbons={kasbons}
              overtimes={overtimes}
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onLogAttendance={handleLogAttendance}
              onAddKasbon={handleAddKasbon}
              onUpdateKasbon={handleUpdateKasbon}
              onDeleteKasbon={handleDeleteKasbon}
              onAddOvertime={handleAddOvertime}
              onUpdateOvertime={handleUpdateOvertime}
              onDeleteOvertime={handleDeleteOvertime}
              lang={lang}
              role={role}
            />
          )}

          {activeTab === 'expenses' && (
            <OtherExpenses 
              projects={projects}
              expenses={otherExpenses}
              onAddExpense={handleAddExpense}
              onUpdateExpense={handleUpdateExpense}
              onDeleteExpense={handleDeleteExpense}
              lang={lang}
              role={role}
            />
          )}

          {activeTab === 'report' && (
            <ReportShare 
              projects={projects}
              materials={materials}
              employees={employees}
              attendance={attendance}
              photos={photos}
              lang={lang}
            />
          )}

          {activeTab === 'devops' && role === 'admin' && (
            <DeploymentDashboard 
              logs={deploymentLogs}
              onAddLog={handleAddDeploymentLog}
              onRollback={handleRollbackDeployment}
              lang={lang}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Hidden on Desktop) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-gray-900/95 border-t border-gray-150 dark:border-gray-800 backdrop-blur-md px-2 py-2.5 z-40 flex items-center justify-around shadow-2xl transition-colors duration-200" id="mobile-nav-bar">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setIsMoreOpen(false);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
                isActive
                  ? 'text-orange-600 dark:text-orange-500 scale-105 font-bold'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'
              }`}
              id={`tab-${tab.id}-mob`}
            >
              <Icon size={19} className="stroke-[2.5]" />
              <span className="text-[10px] font-bold mt-1 tracking-tight truncate max-w-[72px] text-center">{tab.label}</span>
            </button>
          );
        })}

        {showMoreMenu && (
          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
              isSecondaryActive || isMoreOpen
                ? 'text-orange-600 dark:text-orange-500 scale-105 font-bold'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'
            }`}
            id="tab-more-mob"
          >
            <MoreHorizontal size={19} className="stroke-[2.5]" />
            <span className="text-[10px] font-bold mt-1 tracking-tight text-center">
              {lang === 'id' ? 'Lainnya' : 'More'}
            </span>
          </button>
        )}
      </nav>

      {/* Mobile "More" Menu Bottom Sheet */}
      {showMoreMenu && isMoreOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end justify-center transition-opacity duration-200 animate-in fade-in" onClick={() => setIsMoreOpen(false)}>
          <div 
            className="bg-white dark:bg-gray-900 border-t border-gray-150 dark:border-gray-800 rounded-t-3xl p-5 pb-8 w-full max-w-md shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h4 className="font-sans font-bold text-sm text-gray-900 dark:text-white">
                  {lang === 'id' ? 'Menu Lainnya' : 'More Options'}
                </h4>
                <p className="text-[10px] text-gray-400">
                  {lang === 'id' ? 'Akses fitur dan kelola data operasional tambahan' : 'Access additional features and operational logs'}
                </p>
              </div>
              <button 
                onClick={() => setIsMoreOpen(false)}
                className="p-1.5 bg-gray-50 dark:bg-gray-850 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Grid of secondary tabs */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {secondaryTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMoreOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all ${
                      isActive
                        ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/25 text-orange-600 dark:text-orange-500 font-bold shadow-md shadow-orange-500/5'
                        : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/30 text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-gray-850'
                    }`}
                  >
                    <Icon size={21} className={isActive ? 'text-orange-600 dark:text-orange-500' : 'text-gray-400 dark:text-gray-500'} />
                    <span className="text-[11px] font-bold mt-2 tracking-tight">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
