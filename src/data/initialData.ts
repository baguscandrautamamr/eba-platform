import { Project, MaterialTransaction, Employee, Attendance, Kasbon, Overtime, OtherExpense, DeploymentLog, ProgressPhoto } from '../types';

export const initialProjects: Project[] = [
  {
    id: "proj_1",
    name: "Gedung Kantor EBA (MEP)",
    budget: 450000000, // Rp 450.000.000
    startDate: "2026-06-01",
    endDate: "2026-08-15",
    scurvePlan: [10, 20, 30, 45, 60, 70, 80, 90, 95, 100],
    scurveActual: [12, 18, 32, 42, 58, 65, 0, 0, 0, 0], // Currently on week 6
    invoices: [
      {
        id: "inv_1",
        invoiceNumber: "INV/EBA/2026/001",
        amount: 150000000,
        dueDate: "2026-06-15",
        isPaid: true,
        title: "DP Termijn 1 - 30%"
      },
      {
        id: "inv_2",
        invoiceNumber: "INV/EBA/2026/002",
        amount: 150000000,
        dueDate: "2026-07-01", // Due date slightly before current time (2026-07-03)
        isPaid: false,
        title: "Termijn 2 - 30% (Pemasangan Tray & Kabel)"
      },
      {
        id: "inv_3",
        invoiceNumber: "INV/EBA/2026/003",
        amount: 150000000,
        dueDate: "2026-07-10", // Upcoming due date
        isPaid: false,
        title: "Termijn 3 - Pelunasan 40%"
      }
    ]
  },
  {
    id: "proj_2",
    name: "MEP Instalasi Mall Bintaro",
    budget: 750000000, // Rp 750.000.000
    startDate: "2026-05-10",
    endDate: "2026-09-01",
    scurvePlan: [5, 12, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    scurveActual: [6, 11, 22, 28, 38, 48, 55, 68, 0, 0, 0], // Week 8
    invoices: [
      {
        id: "inv_4",
        invoiceNumber: "INV/EBA/2026/004",
        amount: 225000000,
        dueDate: "2026-05-20",
        isPaid: true,
        title: "DP Termijn 1"
      },
      {
        id: "inv_5",
        invoiceNumber: "INV/EBA/2026/005",
        amount: 225000000,
        dueDate: "2026-07-05", // Near due date
        isPaid: false,
        title: "Termijn 2 - Bobot 50%"
      }
    ]
  },
  {
    id: "proj_3",
    name: "Renovasi ME Perumahan Cluster",
    budget: 120000000, // Rp 120.000.000
    startDate: "2026-06-20",
    endDate: "2026-07-25",
    scurvePlan: [15, 35, 60, 85, 100],
    scurveActual: [18, 40, 0, 0, 0], // Week 2
    invoices: [
      {
        id: "inv_6",
        invoiceNumber: "INV/EBA/2026/006",
        amount: 36000000,
        dueDate: "2026-06-25",
        isPaid: true,
        title: "DP 30%"
      },
      {
        id: "inv_7",
        invoiceNumber: "INV/EBA/2026/007",
        amount: 84000000,
        dueDate: "2026-07-24",
        isPaid: false,
        title: "Pelunasan 70%"
      }
    ]
  }
];

export const initialEmployees: Employee[] = [
  { id: "emp_1", name: "Ahmad Jalaludin", role: "Tukang Listrik (ME)", dailySalary: 150000 },
  { id: "emp_2", name: "Slamet Rahardjo", role: "Kenek / Helper", dailySalary: 100000 },
  { id: "emp_3", name: "Budi Santoso", role: "Mandor Lapangan", dailySalary: 200000 },
  { id: "emp_4", name: "Rian Prasetyo", role: "Tukang Las & Pipa", dailySalary: 160000 },
  { id: "emp_5", name: "Dedi Wijaya", role: "Teknisi Panel", dailySalary: 170000 }
];

export const initialMaterials: MaterialTransaction[] = [
  {
    id: "mat_1",
    projectId: "proj_1",
    projectName: "Gedung Kantor EBA (MEP)",
    date: "2026-07-01",
    type: "masuk",
    itemName: "Kabel NYM 3x2.5mm Supreme",
    quantity: 10,
    unit: "Roll",
    pricePerUnit: 850000,
    totalPrice: 8500000,
    note: "Untuk instalasi lantai 2"
  },
  {
    id: "mat_2",
    projectId: "proj_1",
    projectName: "Gedung Kantor EBA (MEP)",
    date: "2026-07-02",
    type: "masuk",
    itemName: "Pipa Conduit PVC Clipsal 20mm",
    quantity: 150,
    unit: "Batang",
    pricePerUnit: 15000,
    totalPrice: 2250000,
    note: "Pipa pelindung kabel"
  },
  {
    id: "mat_3",
    projectId: "proj_1",
    projectName: "Gedung Kantor EBA (MEP)",
    date: "2026-07-02",
    type: "keluar",
    itemName: "Fitting Tee Conduit",
    quantity: 40,
    unit: "Pcs",
    pricePerUnit: 3500,
    totalPrice: 14000,
    note: "Dipakai di koridor lantai 1"
  },
  {
    id: "mat_4",
    projectId: "proj_2",
    projectName: "MEP Instalasi Mall Bintaro",
    date: "2026-07-03",
    type: "masuk",
    itemName: "Lampu Panel LED Downlight 12W Philips",
    quantity: 120,
    unit: "Unit",
    pricePerUnit: 95000,
    totalPrice: 11400000,
    note: "Lampu penerangan lobby utama"
  }
];

export const initialAttendance: Attendance[] = [
  // 2026-07-02
  { id: "att_1", date: "2026-07-02", employeeId: "emp_1", employeeName: "Ahmad Jalaludin", status: "hadir" },
  { id: "att_2", date: "2026-07-02", employeeId: "emp_2", employeeName: "Slamet Rahardjo", status: "hadir" },
  { id: "att_3", date: "2026-07-02", employeeId: "emp_3", employeeName: "Budi Santoso", status: "hadir" },
  { id: "att_4", date: "2026-07-02", employeeId: "emp_4", employeeName: "Rian Prasetyo", status: "izin", note: "Ada urusan keluarga" },
  { id: "att_5", date: "2026-07-02", employeeId: "emp_5", employeeName: "Dedi Wijaya", status: "hadir" },
  // 2026-07-03
  { id: "att_6", date: "2026-07-03", employeeId: "emp_1", employeeName: "Ahmad Jalaludin", status: "hadir" },
  { id: "att_7", date: "2026-07-03", employeeId: "emp_2", employeeName: "Slamet Rahardjo", status: "hadir" },
  { id: "att_8", date: "2026-07-03", employeeId: "emp_3", employeeName: "Budi Santoso", status: "hadir" },
  { id: "att_9", date: "2026-07-03", employeeId: "emp_4", employeeName: "Rian Prasetyo", status: "hadir" },
  { id: "att_10", date: "2026-07-03", employeeId: "emp_5", employeeName: "Dedi Wijaya", status: "sakit", note: "Demam tinggi" }
];

export const initialKasbons: Kasbon[] = [
  { id: "kas_1", date: "2026-07-01", employeeId: "emp_1", employeeName: "Ahmad Jalaludin", amount: 50000, note: "Beli bensin dan rokok" },
  { id: "kas_2", date: "2026-07-02", employeeId: "emp_2", employeeName: "Slamet Rahardjo", amount: 30000, note: "Kasbon makan siang" }
];

export const initialOvertimes: Overtime[] = [
  { id: "ov_1", date: "2026-07-02", employeeId: "emp_1", employeeName: "Ahmad Jalaludin", hours: 3, hourlyRate: 25000, totalAmount: 75000, note: "Lembur tarik kabel induk" },
  { id: "ov_2", date: "2026-07-02", employeeId: "emp_2", employeeName: "Slamet Rahardjo", hours: 3, hourlyRate: 15000, totalAmount: 45000, note: "Lembur tarik kabel induk" }
];

export const initialOtherExpenses: OtherExpense[] = [
  {
    id: "exp_1",
    projectId: "proj_1",
    projectName: "Gedung Kantor EBA (MEP)",
    date: "2026-07-01",
    category: "sewa_alat",
    amount: 1500000,
    note: "Sewa Scaffolding 10 Set selama 1 minggu"
  },
  {
    id: "exp_2",
    projectId: "proj_1",
    projectName: "Gedung Kantor EBA (MEP)",
    date: "2026-07-02",
    category: "konsumsi",
    amount: 350000,
    note: "Konsumsi lembur malam tim ME"
  },
  {
    id: "exp_3",
    projectId: "proj_2",
    projectName: "MEP Instalasi Mall Bintaro",
    date: "2026-07-03",
    category: "transport",
    amount: 250000,
    note: "Bensin operasional mobil bak material"
  }
];

export const initialDeploymentLogs: DeploymentLog[] = [
  {
    id: "dep_1",
    commitHash: "e6f432b",
    commitMessage: "feat: add automatic GPS watermark to camera uploads",
    branch: "main",
    timestamp: "2026-07-03 14:32:10",
    status: "success",
    vercelUrl: "eba-project-94112.vercel.app"
  },
  {
    id: "dep_2",
    commitHash: "a1b2c3d",
    commitMessage: "feat: add PDF payroll generator & WhatsApp summary share button",
    branch: "main",
    timestamp: "2026-07-03 11:20:05",
    status: "success",
    vercelUrl: "eba-project-94112.vercel.app"
  },
  {
    id: "dep_3",
    commitHash: "f7c9a8b",
    commitMessage: "fix: solve offline queue synchronization race condition",
    branch: "main",
    timestamp: "2026-07-03 09:15:00",
    status: "failed"
  },
  {
    id: "dep_4",
    commitHash: "d4e5f6a",
    commitMessage: "chore: rollback to e6f432b after f7c9a8b failure",
    branch: "main",
    timestamp: "2026-07-03 09:16:30",
    status: "rolled_back",
    vercelUrl: "eba-project-94112.vercel.app"
  }
];

export const initialProgressPhotos: ProgressPhoto[] = [
  {
    id: "ph_1",
    projectId: "proj_1",
    projectName: "Gedung Kantor EBA (MEP)",
    date: "2026-07-02",
    time: "15:30:22",
    notes: "Pemasangan rak kabel tray jalur utama lantai 2 telah selesai dikerjakan.",
    images: [
      "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=600&q=80"
    ],
    gpsLocation: "-6.2088, 106.8456 (Jakarta Selatan)",
    watermarked: true
  },
  {
    id: "ph_2",
    projectId: "proj_2",
    projectName: "MEP Instalasi Mall Bintaro",
    date: "2026-07-03",
    time: "11:15:00",
    notes: "Instalasi downlight panel LED koridor zona barat, progres mencapai 80%.",
    images: [
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80"
    ],
    gpsLocation: "-6.2736, 106.7248 (Bintaro Jaya)",
    watermarked: true
  }
];
