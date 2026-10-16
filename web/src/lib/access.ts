import {
  CalendarDays,
  CheckCheck,
  Clock,
  FolderKanban,
  LayoutDashboard,
  Moon,
  Receipt,
  ReceiptText,
  Settings,
  TableProperties,
  Users,
  Wallet,
  FileText,
  type LucideIcon,
} from "lucide-react";
import type { Role, Team, User } from "./types";

export type Feature =
  | "dashboard"
  | "timesheet"
  | "leave"
  | "overtime"
  | "reimbursements"
  | "payslips"
  | "approvals"
  | "timesheet_recap"
  | "reimburse_recap"
  | "payroll"
  | "projects"
  | "employees"
  | "settings";

export const roleLabel: Record<Role, string> = {
  stakeholder: "Stakeholder",
  hr: "HR",
  finance: "Finance",
  employee: "Employee",
  external: "External",
};

/** Matriks akses dari BRIEF.md Bagian 2. Di server, aturan yang sama ditegakkan oleh permission Directus. */
export function canAccess(user: User, team: Team | null, feature: Feature): boolean {
  const r = user.role;
  // External (freelance/vendor) hanya bisa mengajukan & melihat reimburse miliknya.
  if (r === "external") return feature === "dashboard" || feature === "reimbursements";
  switch (feature) {
    case "dashboard":
    case "timesheet":
    case "leave":
    case "overtime":
    case "reimbursements":
    case "payslips":
      return true;
    case "approvals":
    case "timesheet_recap":
    case "employees":
    case "settings":
      return r !== "employee";
    case "payroll":
      return r === "finance" || r === "stakeholder";
    case "reimburse_recap":
      return r !== "employee";
    case "projects":
      // Semua pegawai; daftar project difilter per keanggotaan (lib/projects.ts).
      return true;
  }
}

/** Boleh edit (bukan hanya lihat)? */
export function canEdit(user: User, team: Team | null, feature: Feature): boolean {
  // HR & Finance bisa menambah pegawai/external; verifikasi rekening khusus Finance.
  if (feature === "employees") return user.role === "hr" || user.role === "finance";
  return canAccess(user, team, feature);
}

export type NavItem = { feature: Feature; href: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [{ feature: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "My work",
    items: [
      { feature: "timesheet", href: "/timesheet", label: "Timesheet", icon: Clock },
      { feature: "leave", href: "/leave", label: "Leave", icon: CalendarDays },
      { feature: "overtime", href: "/overtime", label: "Overtime", icon: Moon },
      { feature: "reimbursements", href: "/reimbursements", label: "Reimbursement", icon: Receipt },
      { feature: "payslips", href: "/payslips", label: "Payslips", icon: FileText },
    ],
  },
  {
    label: "Business",
    items: [
      { feature: "projects", href: "/projects", label: "Projects", icon: FolderKanban },
    ],
  },
  {
    label: "Manage",
    items: [
      { feature: "approvals", href: "/approvals", label: "Approvals", icon: CheckCheck },
      { feature: "timesheet_recap", href: "/timesheet-recap", label: "Timesheet recap", icon: TableProperties },
      { feature: "reimburse_recap", href: "/reimburse-recap", label: "Reimbursement recap", icon: ReceiptText },
      { feature: "payroll", href: "/payroll", label: "Payroll", icon: Wallet },
      { feature: "employees", href: "/employees", label: "Employees", icon: Users },
      { feature: "settings", href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

/**
 * Modul yang sudah dirilis. Modul lain tetap tampil di menu tapi berlabel "Soon" dan halamannya "Coming soon".
 * Rilis bertahap (permintaan owner, 15 Okt 2026): mulai dari Reimburse. Tambahkan fitur di sini untuk merilis.
 */
export const releasedFeatures: ReadonlySet<Feature> = new Set<Feature>([
  "dashboard",
  "reimbursements",
  "reimburse_recap",
  "approvals",
  "employees",
  "settings",
]);

export const isReleased = (f: Feature) => releasedFeatures.has(f);

export function featureForPath(pathname: string): Feature | null {
  for (const g of navGroups) {
    for (const i of g.items) if (pathname === i.href || pathname.startsWith(`${i.href}/`)) return i.feature;
  }
  return null;
}
