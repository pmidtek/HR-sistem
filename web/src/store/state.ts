import type { AppSettings } from "@/lib/settings-types";
import type {
  ActivityCode,
  BoardColumn,
  Company,
  Holiday,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  Notification,
  Opportunity,
  OvertimeRequest,
  PayrollRun,
  Payslip,
  Project,
  Reimbursement,
  ReimbursementCategory,
  Task,
  Team,
  TimesheetEntry,
  User,
} from "@/lib/types";
import { activityCodes, holidays, teams, users } from "@/lib/mock/people";
import { defaultSettings } from "@/lib/mock/settings";
import {
  leaveBalances,
  leaveRequests,
  leaveTypes,
  overtimeRequests,
  reimbursementCategories,
  reimbursements,
  timesheetEntries,
} from "@/lib/mock/work";
import { companies, opportunities } from "@/lib/mock/sales";
import { boardColumns, boards, epics, projects, sprints, stories } from "@/lib/mock/projects/base";
import { tasks } from "@/lib/mock/projects/tasks";
import {
  baselines,
  changeRequests,
  decisions,
  deliverables,
  joinRequests,
  keyActions,
  milestones,
  moms,
  notes,
  projectLinks,
  touchpoints,
} from "@/lib/mock/projects/workspace";
import { activityLogs } from "@/lib/mock/projects/activity";
import type {
  ActivityLog,
  Baseline,
  Board,
  ChangeRequest,
  ClientKeyAction,
  ClientTouchpoint,
  Decision,
  Deliverable,
  Epic,
  InviteLink,
  JoinRequest,
  Milestone,
  Mom,
  Note,
  ProjectLink,
  Sprint,
  Story,
} from "@/lib/project-types";
import { notifications, payrollRuns, payslips } from "@/lib/mock/payroll";

export type DataState = {
  users: User[];
  teams: Team[];
  holidays: Holiday[];
  activityCodes: ActivityCode[];
  timesheet: TimesheetEntry[];
  leaveTypes: LeaveType[];
  leaveBalances: LeaveBalance[];
  leaveRequests: LeaveRequest[];
  overtimeRequests: OvertimeRequest[];
  reimbursementCategories: ReimbursementCategory[];
  reimbursements: Reimbursement[];
  payrollRuns: PayrollRun[];
  payslips: Payslip[];
  companies: Company[];
  opportunities: Opportunity[];
  projects: Project[];
  boards: Board[];
  boardColumns: BoardColumn[];
  tasks: Task[];
  epics: Epic[];
  stories: Story[];
  sprints: Sprint[];
  milestones: Milestone[];
  deliverables: Deliverable[];
  moms: Mom[];
  notes: Note[];
  decisions: Decision[];
  projectLinks: ProjectLink[];
  touchpoints: ClientTouchpoint[];
  keyActions: ClientKeyAction[];
  changeRequests: ChangeRequest[];
  baselines: Baseline[];
  activityLogs: ActivityLog[];
  joinRequests: JoinRequest[];
  inviteLinks: InviteLink[];
  notifications: Notification[];
  settings: AppSettings;
};

export const initialState: DataState = {
  users,
  teams,
  holidays,
  activityCodes,
  // Entri yang sudah masuk lembur disetujui terkunci.
  timesheet: timesheetEntries.map((e) => ({
    ...e,
    locked: overtimeRequests.some((r) => r.status === "approved" && r.userId === e.userId && r.date === e.date),
  })),
  leaveTypes,
  leaveBalances,
  leaveRequests,
  overtimeRequests,
  reimbursementCategories,
  reimbursements,
  payrollRuns,
  payslips,
  companies,
  opportunities,
  projects,
  boards,
  boardColumns,
  tasks,
  epics,
  stories,
  sprints,
  milestones,
  deliverables,
  moms,
  notes,
  decisions,
  projectLinks,
  touchpoints,
  keyActions,
  changeRequests,
  baselines,
  activityLogs,
  joinRequests,
  inviteLinks: [],
  notifications,
  settings: defaultSettings,
};

let seq = 1000;
export function newId(prefix: string): string {
  seq += 1;
  return `${prefix}${seq}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
