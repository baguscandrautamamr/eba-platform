export type Language = 'id' | 'en';
export type Theme = 'light' | 'dark';
export type UserRole = 'admin' | 'user';

export interface Project {
  id: string;
  name: string;
  budget: number;
  startDate: string;
  endDate: string;
  scurvePlan: number[];   // 10 weeks progress percentages (0-100)
  scurveActual: number[]; // 10 weeks actual progress percentages (0-100)
  invoices: Invoice[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  title: string;
}

export interface MaterialTransaction {
  id: string;
  projectId: string;
  projectName: string;
  date: string;
  type: 'masuk' | 'keluar'; // masuk = incoming/pemasukan, keluar = outgoing/pengeluaran
  itemName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  note: string;
}

export interface ProgressPhoto {
  id: string;
  projectId: string;
  projectName: string;
  date: string;
  time: string;
  notes: string;
  images: string[]; // Base64 strings or URLs
  gpsLocation?: string; // Lat, Lng
  watermarked: boolean;
  driveUrls?: string[]; // Optional Google Drive web view links
  roomName?: string; // Room/Space name (Nama Ruangan)
}

export interface Employee {
  id: string;
  name: string;
  role: string; // e.g. Tukang, Kenek, Mandor, ME Specialist
  dailySalary: number; // Daily wage
}

export interface Attendance {
  id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  status: 'hadir' | 'absen' | 'izin' | 'sakit';
  note?: string;
  projectId?: string;
  projectName?: string;
}

export interface Kasbon {
  id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  note: string;
}

export interface Overtime {
  id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  hours: number;
  hourlyRate: number;
  totalAmount: number;
  note: string;
  projectId?: string;
  projectName?: string;
}

export interface OtherExpense {
  id: string;
  projectId: string;
  projectName: string;
  date: string;
  category: 'sewa_alat' | 'transport' | 'konsumsi' | 'retribusi' | 'lain_lain';
  amount: number;
  note: string;
}

export interface DeploymentLog {
  id: string;
  commitHash: string;
  commitMessage: string;
  branch: string;
  timestamp: string;
  status: 'success' | 'failed' | 'building' | 'rolled_back';
  vercelUrl?: string;
}

export interface UploadQueueItem {
  id: string;
  type: 'photo' | 'material' | 'attendance' | 'expense';
  projectId?: string;
  payload: any;
  timestamp: number;
}

export interface LanguagePack {
  dashboard: string;
  projects: string;
  materials: string;
  progressPhotos: string;
  hrAttendance: string;
  deployments: string;
  otherExpenses: string;
  slipGaji: string;
  attendance: string;
  kasbon: string;
  overtime: string;
  addProject: string;
  projectName: string;
  budget: string;
  startDate: string;
  endDate: string;
  actions: string;
  save: string;
  cancel: string;
  addMaterial: string;
  materialIn: string;
  materialOut: string;
  itemName: string;
  qty: string;
  unit: string;
  price: string;
  total: string;
  note: string;
  addPhoto: string;
  watermark: string;
  gpsRequired: string;
  slipGajiTitle: string;
  netSalary: string;
  totalLembur: string;
  totalKasbon: string;
  invoiceAlert: string;
  uploadQueue: string;
  offlineMode: string;
  syncCloud: string;
  encrypted: string;
  shareWA: string;
  selectProject: string;
  dailyReport: string;
  role: string;
  admin: string;
  user: string;
  theme: string;
  language: string;
}
