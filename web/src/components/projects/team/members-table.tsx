"use client";

import { UserMinus } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { ProjectRole } from "@/lib/project-types";
import { useAuthed } from "@/store/app-provider";
import { changeMemberRole, removeMember, roleLabel } from "@/store/actions-team";
import { stamp } from "@/store/project-core";
import { useLookups } from "../../hooks";
import { IconButton } from "../../ui/button";
import { Avatar, Badge } from "../../ui/display";
import { Icon } from "../../ui/icon";
import { Stagger, StaggerItem } from "../../ui/motion";
import { rowClass, Table, Td, Th } from "../../ui/table";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";

/** Anggota project: peran (Lead/Member/Viewer), tanggal bergabung, task terbuka. */
export function MembersTable({ data }: { data: ProjectData }) {
  const { state, actor, today, run } = useAuthed();
  const { project, canManage } = useProject();
  const { teamName } = useLookups();
  const at = () => stamp(today);

  return (
    <Table>
      <thead><tr><Th>Anggota</Th><Th>Tim</Th><Th>Peran</Th><Th>Bergabung</Th><Th className="text-right">Task terbuka</Th>{canManage && <Th />}</tr></thead>
      <Stagger as="tbody">
        {project.members.map((m, i) => {
          const u = state.users.find((x) => x.id === m.userId);
          if (!u) return null;
          const open = data.tasks.filter((t) => t.assigneeIds.includes(u.id) && !data.doneCols.has(t.columnId)).length;
          return (
            <StaggerItem as="tr" key={m.userId} index={i} className={rowClass}>
              <Td>
                <span className="flex items-center gap-2.5">
                  <Avatar name={u.name} size="small" color={m.role === "lead" ? "brand" : "neutral"} />
                  <span><span className="block text-sm">{u.name}</span><span className="text-xs text-fg-subtle">{u.position}</span></span>
                </span>
              </Td>
              <Td className="text-xs text-fg-muted">{teamName(u.teamId)}</Td>
              <Td>
                {canManage ? (
                  <select className="h-8 rounded-xxs bg-sunken px-2 text-xs text-fg shadow-[inset_0_0_0_1px_var(--border-default)]" aria-label={`Peran ${u.name}`} value={m.role}
                    onChange={(e) => run((s) => changeMemberRole(s, project.id, u.id, e.target.value as ProjectRole, actor, at()), "Peran diperbarui.")}>
                    {Object.entries(roleLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                ) : <Badge tone={m.role === "lead" ? "brand" : "neutral"}>{roleLabel[m.role]}</Badge>}
              </Td>
              <Td className="text-xs whitespace-nowrap text-fg-muted">{formatDate(m.joinedAt)}</Td>
              <Td className="text-right font-mono text-xs">{open}</Td>
              {canManage && (
                <Td className="text-right">
                  <IconButton label={`Keluarkan ${u.name}`} size="small" onClick={() => run((s) => removeMember(s, project.id, u.id, actor, at()), `${u.name} dikeluarkan.`)}>
                    <Icon icon={UserMinus} size={14} />
                  </IconButton>
                </Td>
              )}
            </StaggerItem>
          );
        })}
      </Stagger>
    </Table>
  );
}
