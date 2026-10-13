/**
 * Tipe untuk Project Workspace (docs/PROJECT-WORKSPACE.md Bagian 2).
 * Tanggal "YYYY-MM-DD", waktu ISO string. Nama koleksi Directus nanti mengikuti nama tipe (snake_case).
 */
import type { Attachment } from "./types";

export type ProjectRole = "lead" | "member" | "viewer";
export type ProjectMember = { userId: string; role: ProjectRole; joinedAt: string };
export type ProjectLabel = { id: string; name: string; color: string };
export type ClientContactRole = "decision_maker" | "user" | "technical" | "finance" | "other";

export type Board = { id: string; projectId: string; name: string; order: number };

export type Epic = { id: string; projectId: string; title: string; description: string; color: string };
export type Story = { id: string; epicId: string; title: string };

export type SprintStatus = "planned" | "active" | "completed";
export type Sprint = {
  id: string;
  projectId: string;
  teamId: string | null;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  /** Snapshot task saat sprint dimulai. */
  plannedTaskIds: string[];
  completedAt: string | null;
};

export type Milestone = {
  id: string;
  projectId: string;
  name: string;
  description: string;
  targetDate: string;
  taskIds: string[];
  completedAt: string | null;
};

export type DeliverablePhase = "proposal" | "requirement" | "design" | "build" | "testing" | "final";
export type DeliverableStatus = "draft" | "in_progress" | "review" | "sent";
export type Deliverable = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  phase: DeliverablePhase;
  status: DeliverableStatus;
  deadline: string | null;
  link: string | null;
  ownerId: string;
  createdAt: string;
};

export type MomActionItem = {
  id: string;
  text: string;
  assigneeId: string | null;
  dueDate: string | null;
  done: boolean;
  taskId: string | null;
};

export type Mom = {
  id: string;
  projectId: string;
  title: string;
  meetingDate: string;
  attendeeIds: string[];
  /** Nama tamu/klien. */
  externalAttendees: string[];
  /** Markdown. */
  body: string;
  actionItems: MomActionItem[];
  attachments: Attachment[];
  status: "draft" | "published";
  authorId: string;
  updatedAt: string;
};

export type Note = {
  id: string;
  projectId: string;
  title: string;
  body: string;
  tags: string[];
  authorId: string;
  updatedAt: string;
  pinned: boolean;
};

export type DecisionStatus = "proposed" | "accepted" | "rejected" | "superseded" | "deprecated";
export type Decision = {
  id: string;
  projectId: string;
  /** Tampil sebagai DR-001. */
  number: number;
  title: string;
  context: string;
  decision: string;
  consequences: string;
  category: string;
  status: DecisionStatus;
  decidedById: string | null;
  decidedAt: string | null;
  sourceMomId: string | null;
  supersedesId: string | null;
};

export type ProjectLink = { id: string; projectId: string; label: string; url: string; category: string; addedBy: string };

export type TouchpointType = "meeting" | "call" | "email" | "visit" | "presentation";
export type ClientTouchpoint = {
  id: string;
  projectId: string;
  date: string;
  type: TouchpointType;
  summary: string;
  outcome: string;
  participantIds: string[];
  /** CompanyContact.id */
  contactIds: string[];
};

export type ClientKeyAction = {
  id: string;
  projectId: string;
  title: string;
  ownerId: string;
  dueDate: string | null;
  status: "open" | "done";
};

export type ChangeSource = "client" | "internal";
export type ChangeStatus = "submitted" | "under_review" | "approved" | "rejected" | "implemented";
export type ChangeRequest = {
  id: string;
  projectId: string;
  /** Tampil sebagai CR-001. */
  number: number;
  title: string;
  description: string;
  source: ChangeSource;
  /** Nama peminta (bisa orang klien). */
  requestedBy: string;
  requestedAt: string;
  impactDays: number;
  impactNote: string;
  estimateHours: number | null;
  status: ChangeStatus;
  decidedById: string | null;
  decidedAt: string | null;
  linkedTaskIds: string[];
};

export type Baseline = {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  /** Jumlah task saat baseline dibuat (untuk deteksi scope creep). */
  taskCount: number;
  plannedPoints: { date: string; percent: number }[];
};

export type ActivityKind =
  | "task_created"
  | "task_updated"
  | "task_moved"
  | "task_done"
  | "task_deleted"
  | "subtask"
  | "comment"
  | "board"
  | "sprint_started"
  | "sprint_completed"
  | "sprint"
  | "milestone"
  | "milestone_done"
  | "deliverable_status"
  | "deliverable"
  | "mom_published"
  | "mom"
  | "note"
  | "decision"
  | "link"
  | "client"
  | "cr_status"
  | "cr"
  | "member_added"
  | "member"
  | "settings";

export type ActivityLog = {
  id: string;
  projectId: string;
  actorId: string;
  at: string;
  kind: ActivityKind;
  /** Mis. "Task dipindahkan ke Done". */
  text: string;
  /** Mis. "#17", "CR-002"; null jika tidak ada. */
  targetRef: string | null;
};

export type JoinRequest = { id: string; projectId: string; userId: string; requestedAt: string };

export type InviteLink = { id: string; projectId: string; token: string; createdBy: string; expiresAt: string };
