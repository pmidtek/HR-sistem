import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCheck,
  Clock,
  FolderKanban,
  LayoutDashboard,
  Moon,
  Receipt,
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
  | "payroll"
  | "sales"
  | "projects"
  | "employees"
  | "settings";

export const roleLabel: Record<Role, string> = {
  stakeholder: "Stakeholder",
  hr: "HR",
  finance: "Finance",
  employee: "Pegawai",
};

/** Matriks akses dari BRIEF.md Bagian 2. Di server, aturan yang sama ditegakkan oleh permission Directus. */
export function canAccess(user: User, team: Team | null, feature: Feature): boolean {
  const r = user.role;
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
    case "sales":
      return r === "stakeholder" || r === "hr" || team?.kind === "sales";
    case "projects":
      return r === "stakeholder" || r === "hr" || team?.kind === "delivery";
  }
}

/** Boleh edit (bukan hanya lihat)? */
export function canEdit(user: User, team: Team | null, feature: Feature): boolean {
  if (feature === "sales") return team?.kind === "sales" || user.role === "stakeholder";
  if (feature === "employees") return user.role === "hr";
  return canAccess(user, team, feature);
}

export type NavItem = { feature: Feature; href: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
  {
    label: "Utama",
    items: [{ feature: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Pekerjaan Saya",
    items: [
      { feature: "timesheet", href: "/timesheet", label: "Timesheet", icon: Clock },
      { feature: "leave", href: "/leave", label: "Cuti", icon: CalendarDays },
      { feature: "overtime", href: "/overtime", label: "Lembur", icon: Moon },
      { feature: "reimbursements", href: "/reimbursements", label: "Reimburse", icon: Receipt },
      { feature: "payslips", href: "/payslips", label: "Slip Gaji", icon: FileText },
    ],
  },
  {
    label: "Bisnis",
    items: [
      { feature: "sales", href: "/sales", label: "Sales Pipeline", icon: BriefcaseBusiness },
      { feature: "projects", href: "/projects", label: "Project", icon: FolderKanban },
    ],
  },
  {
    label: "Kelola",
    items: [
      { feature: "approvals", href: "/approvals", label: "Persetujuan", icon: CheckCheck },
      { feature: "timesheet_recap", href: "/timesheet-recap", label: "Rekap Timesheet", icon: TableProperties },
      { feature: "payroll", href: "/payroll", label: "Payroll", icon: Wallet },
      { feature: "employees", href: "/employees", label: "Pegawai", icon: Users },
      { feature: "settings", href: "/settings", label: "Pengaturan", icon: Settings },
    ],
  },
];

export function featureForPath(pathname: string): Feature | null {
  for (const g of navGroups) {
    for (const i of g.items) if (pathname === i.href || pathname.startsWith(`${i.href}/`)) return i.feature;
  }
  return null;
}
