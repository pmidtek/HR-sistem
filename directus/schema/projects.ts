/**
 * Sales (company & opportunity) dan Project Workspace (docs/PROJECT-WORKSPACE.md).
 * Daftar id kecil yang hanya dibaca bersama induknya (label, checklist, peserta) disimpan sebagai JSON
 * supaya sederhana; relasi yang perlu difilter/di-query (anggota, assignee, tim) memakai tabel relasi.
 */
import { collection, folder, type C } from "./dsl";

folder("grp_sales", "handshake", "Company & opportunity", "Sales", 7);
folder("grp_projects", "folder_open", "Project workspace", "Projects", 8);

collection("companies", { icon: "domain", group: "grp_sales", display: "{{name}}" }, (c) => {
  c.string("name", { required: true }).string("industry", { width: "half" }).string("website", { width: "half" })
    .text("address").text("notes").stamps(["created", "updated"]);
});

collection("company_contacts", { icon: "contact_phone", group: "grp_sales", display: "{{name}}" }, (c) => {
  c.m2o("company", "companies", { required: true, onDelete: "CASCADE", reverse: "contacts" })
    .string("name", { required: true, width: "half" }).string("title", { width: "half" })
    .string("email", { width: "half" }).string("phone", { width: "half" });
});

collection("opportunities", { icon: "trending_up", group: "grp_sales", display: "{{code}} {{name}}" }, (c) => {
  c.string("code", { required: true, unique: true, max: 12, readonly: true, width: "half", note: "OPYYXXXX (otomatis)" })
    .string("name", { required: true, width: "half" })
    .m2o("company", "companies", { required: true, width: "half", display: "{{name}}" })
    .m2o("owner", "directus_users", { width: "half", note: "PIC Sales" })
    .bigInteger("value", { default: 0, width: "half", note: "Rupiah. bigInteger → dikirim API sebagai string" })
    .choice("stage", ["lead", "qualification", "proposal", "negotiation", "won", "lost"], { required: true, default: "lead", width: "half" })
    .integer("probability", { default: 10, width: "half" })
    .date("expected_close", { width: "half" })
    .text("lost_reason")
    .stamps(["created", "updated"]);
});

collection("opportunity_activities", { icon: "event_note", group: "grp_sales", display: "{{date}} {{type}}" }, (c) => {
  c.m2o("opportunity", "opportunities", { required: true, onDelete: "CASCADE", reverse: "activities" })
    .date("date", { required: true, width: "half" })
    .choice("type", ["meeting", "call", "email", "presentation", "other"], { required: true, width: "half" })
    .text("notes").stamps(["created", "user_created"]);
});

collection("projects", { icon: "folder_open", group: "grp_projects", display: "{{code}} {{name}}" }, (c) => {
  c.string("code", { required: true, unique: true, max: 12, readonly: true, width: "half", note: "PRYYXXXX (otomatis)" })
    .string("name", { required: true, width: "half" })
    .m2o("opportunity", "opportunities", { width: "half", display: "{{code}}" })
    .m2o("company", "companies", { width: "half", display: "{{name}}", note: "Kosong = project internal" })
    .m2o("lead", "directus_users", { width: "half" })
    .choice("status", ["not_started", "ongoing", "review", "done", "on_hold", "cancelled"], { required: true, default: "not_started", width: "half" })
    .date("start_date", { width: "half" }).date("target_date", { width: "half" })
    .text("description")
    .string("color", { width: "half" })
    .boolean("archived", { default: false, width: "half" })
    .json("labels", { default: [], note: "[{id, name, color}]" })
    .json("default_columns", { default: ["Backlog", "To Do", "In Progress", "Review", "Done"] })
    .json("quick_link_ids", { default: [] })
    .json("client_contact_roles", { default: {}, note: "{contactId: decision_maker|user|technical|finance|other}" })
    .m2m("teams", "teams", "project_teams")
    .stamps(["created", "updated", "user_created"]);
});

/** Tabel anak project: semuanya punya `project` (hapus project = hapus anaknya). */
function child(name: string, icon: string, display: string, build: (c: C) => void, sort = false, reverse?: string) {
  collection(name, { icon, group: "grp_projects", display, sort }, (c) => {
    c.m2o("project", "projects", { required: true, onDelete: "CASCADE", indexed: true, reverse });
    build(c);
  });
}

child("project_members", "group", "{{user.first_name}} ({{role}})", (c) => {
  c.m2o("user", "directus_users", { required: true, onDelete: "CASCADE", width: "half" })
    .choice("role", ["lead", "member", "viewer"], { required: true, default: "member", width: "half" })
    .date("joined_at", { width: "half" });
}, false, "members");
child("boards", "view_kanban", "{{name}}", (c) => c.string("name", { required: true }), true);
child("board_columns", "view_column", "{{name}}", (c) => {
  c.m2o("board", "boards", { required: true, onDelete: "CASCADE", reverse: "columns" })
    .string("name", { required: true, width: "half" }).boolean("is_done", { default: false, width: "half" }).string("color", { width: "half" });
}, true);
child("epics", "flag", "{{title}}", (c) => c.string("title", { required: true }).text("description").string("color"));
child("sprints", "directions_run", "{{name}}", (c) => {
  c.m2o("team", "teams", { width: "half" }).string("name", { required: true, width: "half" }).text("goal")
    .date("start_date", { width: "half" }).date("end_date", { width: "half" })
    .choice("status", ["planned", "active", "completed"], { default: "planned", width: "half" })
    .timestamp("completed_at", { width: "half" }).json("planned_task_ids", { default: [] });
});
child("tasks", "task_alt", "#{{number}} {{title}}", (c) => {
  c.m2o("board", "boards", { required: true, onDelete: "CASCADE", width: "half" })
    .m2o("board_column", "board_columns", { width: "half", display: "{{name}}" })
    .integer("number", { required: true, readonly: true, width: "half", note: "Nomor urut per project (#17)" })
    .string("title", { required: true }).text("description")
    .choice("priority", ["low", "medium", "high", "urgent"], { default: "medium", width: "half" })
    .m2o("story", "stories", { width: "half" }).m2o("sprint", "sprints", { width: "half" })
    .date("start_date", { width: "half" }).date("deadline", { width: "half" })
    .float("estimate_hours", { width: "half" })
    .boolean("blocked", { default: false, width: "half" }).text("blocked_reason")
    .json("label_ids", { default: [] }).json("depends_on", { default: [] })
    .json("checklist", { default: [], note: "[{id, text, done}]" })
    .timestamp("completed_at", { width: "half" })
    .m2m("assignees", "directus_users", "task_assignees")
    .m2m("attachments", "directus_files", "task_files")
    .stamps(["created", "updated", "user_created"]);
}, true);
child("milestones", "outlined_flag", "{{name}}", (c) => {
  c.string("name", { required: true }).text("description").date("target_date", { width: "half" })
    .timestamp("completed_at", { width: "half" }).json("task_ids", { default: [] });
});
child("deliverables", "inventory_2", "{{title}}", (c) => {
  c.string("title", { required: true }).text("description")
    .choice("phase", ["proposal", "requirement", "design", "build", "testing", "final"], { width: "half" })
    .choice("status", ["draft", "in_progress", "review", "sent"], { default: "draft", width: "half" })
    .date("deadline", { width: "half" }).string("link", { width: "half" })
    .m2o("owner", "directus_users", { width: "half" }).stamps(["created"]);
});
child("moms", "summarize", "{{title}}", (c) => {
  c.string("title", { required: true }).date("meeting_date", { width: "half" })
    .choice("status", ["draft", "published"], { default: "draft", width: "half" })
    .text("body", { note: "Markdown" }).json("attendee_ids", { default: [] }).json("external_attendees", { default: [] })
    .json("action_items", { default: [], note: "[{id, text, assigneeId, dueDate, done, taskId}]" })
    .m2m("attachments", "directus_files", "mom_files")
    .stamps(["created", "updated", "user_created"]);
});
child("project_notes", "sticky_note_2", "{{title}}", (c) => {
  c.string("title", { required: true }).text("body").json("tags", { default: [] }).boolean("pinned", { default: false })
    .stamps(["created", "updated", "user_created"]);
});
child("decisions", "gavel", "DR-{{number}} {{title}}", (c) => {
  c.integer("number", { required: true, readonly: true, width: "half" }).string("title", { required: true, width: "half" })
    .text("context").text("decision").text("consequences").string("category", { width: "half" })
    .choice("status", ["proposed", "accepted", "rejected", "superseded", "deprecated"], { default: "proposed", width: "half" })
    .m2o("decided_by", "directus_users", { width: "half" }).date("decided_at", { width: "half" })
    .m2o("source_mom", "moms", { width: "half" }).m2o("supersedes", "decisions", { width: "half" });
});
child("project_links", "link", "{{label}}", (c) => {
  c.string("label", { required: true, width: "half" }).string("url", { required: true, width: "half" }).string("category")
    .stamps(["created", "user_created"]);
});
child("client_touchpoints", "forum", "{{date}} {{type}}", (c) => {
  c.date("date", { required: true, width: "half" })
    .choice("type", ["meeting", "call", "email", "visit", "presentation"], { required: true, width: "half" })
    .text("summary").text("outcome").json("participant_ids", { default: [] }).json("contact_ids", { default: [] });
});
child("client_key_actions", "checklist", "{{title}}", (c) => {
  c.string("title", { required: true }).m2o("owner", "directus_users", { width: "half" })
    .date("due_date", { width: "half" }).choice("status", ["open", "done"], { default: "open", width: "half" });
});
child("change_requests", "change_circle", "CR-{{number}} {{title}}", (c) => {
  c.integer("number", { required: true, readonly: true, width: "half" }).string("title", { required: true, width: "half" })
    .text("description").choice("source", ["client", "internal"], { width: "half" })
    .string("requested_by", { width: "half" }).date("requested_at", { width: "half" })
    .integer("impact_days", { default: 0, width: "half" }).text("impact_note").float("estimate_hours", { width: "half" })
    .choice("status", ["submitted", "under_review", "approved", "rejected", "implemented"], { default: "submitted", width: "half" })
    .m2o("decided_by", "directus_users", { width: "half" }).date("decided_at", { width: "half" })
    .json("linked_task_ids", { default: [] });
});
child("baselines", "timeline", "{{name}}", (c) => {
  c.string("name", { required: true }).integer("task_count", { default: 0 }).json("planned_points", { default: [] }).stamps(["created"]);
});
child("project_activity_logs", "history", "{{text}}", (c) => {
  c.m2o("actor", "directus_users", { width: "half" }).string("kind", { required: true, max: 40, width: "half" })
    .string("text", { required: true }).string("target_ref", { max: 40 }).stamps(["created"]);
});
child("project_join_requests", "person_add", "{{user.first_name}}", (c) => {
  c.m2o("user", "directus_users", { required: true, onDelete: "CASCADE" }).stamps(["created"]);
});
child("project_invite_links", "share", "{{token}}", (c) => {
  c.string("token", { required: true, unique: true, max: 64 }).timestamp("expires_at", { required: true }).stamps(["created", "user_created"]);
});

// Story di bawah epic (bukan anak langsung project).
collection("stories", { icon: "auto_stories", group: "grp_projects", display: "{{title}}" }, (c) => {
  c.m2o("epic", "epics", { required: true, onDelete: "CASCADE", reverse: "stories" }).string("title", { required: true });
});

collection("task_comments", { icon: "comment", group: "grp_projects", display: "{{body}}" }, (c) => {
  c.m2o("task", "tasks", { required: true, onDelete: "CASCADE", reverse: "comments" }).text("body", { required: true })
    .stamps(["created", "updated", "user_created"]);
});
