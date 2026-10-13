import {
  BarChart3,
  Diamond,
  FileText,
  FolderOpen,
  Handshake,
  LayoutDashboard,
  Package,
  Repeat,
  Settings,
  SquareKanban,
  Timer,
  Users,
  type LucideIcon,
} from "lucide-react";

export type ProjectNavItem = { slug: string; label: string; icon: LucideIcon; manageOnly?: boolean };

/** Menu workspace project (docs/PROJECT-WORKSPACE.md Bagian 1). slug "" = Overview. */
export const projectNav: ProjectNavItem[] = [
  { slug: "", label: "Overview", icon: LayoutDashboard },
  { slug: "board", label: "Board", icon: SquareKanban },
  { slug: "sprints", label: "Sprints", icon: Timer },
  { slug: "milestones", label: "Milestones", icon: Diamond },
  { slug: "deliverables", label: "Deliverables", icon: Package },
  { slug: "mom", label: "MOM", icon: FileText },
  { slug: "files", label: "Files", icon: FolderOpen },
  { slug: "client", label: "Client", icon: Handshake },
  { slug: "changes", label: "Changes", icon: Repeat },
  { slug: "analytics", label: "Analytics", icon: BarChart3 },
  { slug: "team", label: "Team", icon: Users },
  { slug: "settings", label: "Settings", icon: Settings, manageOnly: true },
];

export function activeSlug(pathname: string, base: string): string {
  const rest = pathname.slice(base.length).replace(/^\//, "");
  return rest.split("/")[0] ?? "";
}
