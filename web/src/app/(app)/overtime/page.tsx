"use client";

import { useState } from "react";
import { addDays, eachDay } from "@/lib/calc/dates";
import { allowedLeaveActions, leaveStatusLabel } from "@/lib/calc/approval";
import { formatDayShort, formatDuration } from "@/lib/format";
import type { OvertimeRequest } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { actOnOvertime, submitOvertime } from "@/store/actions";
import { daySummaries, useLookups, type DaySummary } from "@/components/hooks";
import { ApprovalTimeline } from "@/components/approval-timeline";
import { PageHeader, SectionTitle } from "@/components/shell/page-header";
import { ApprovalBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/display";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/form";
import { Table, Td, Th, Tr } from "@/components/ui/table";

export default function OvertimePage() {
  const { state, user, actor, today, run } = useAuthed();
  const { isHoliday } = useLookups();
  const [target, setTarget] = useState<DaySummary | null>(null);
  const [reason, setReason] = useState("");

  const days = daySummaries(state, user.id, eachDay(addDays(today, -30), today), isHoliday)
    .filter((d) => d.overtimeMinutes > 0)
    .reverse();
  const mine = state.overtimeRequests.filter((r) => r.userId === user.id);
  const requestFor = (date: string): OvertimeRequest | undefined =>
    mine.find((r) => r.date === date && r.status !== "cancelled" && r.status !== "rejected") ?? mine.find((r) => r.date === date);

  function submit() {
    if (!target) return;
    const ok = run(
      (s) => submitOvertime(s, { userId: user.id, date: target.date, isHoliday: target.isHoliday, requestedMinutes: target.overtimeMinutes, reason }),
      "Pengajuan lembur terkirim ke HR.",
    );
    if (ok) setTarget(null);
  }

  return (
    <>
      <PageHeader
        title="Lembur"
        accent="dari timesheet."
        description={`Jam di atas ${state.settings.work.normalHoursPerDay} jam/hari otomatis terdeteksi. Kerja di akhir pekan atau libur nasional seluruhnya dihitung lembur hari libur.`}
      />

      <SectionTitle>Hari dengan jam lembur (30 hari terakhir)</SectionTitle>
      {days.length === 0 ? (
        <EmptyState title="Tidak ada jam lembur" description="Jam lembur muncul otomatis saat total jam harian melewati batas normal." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Tanggal</Th>
              <Th>Jenis</Th>
              <Th className="text-right">Total kerja</Th>
              <Th className="text-right">Jam lembur</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const req = requestFor(d.date);
              const active = req && req.status !== "rejected" && req.status !== "cancelled";
              return (
                <Tr key={d.date}>
                  <Td>{formatDayShort(d.date)}</Td>
                  <Td>{d.isHoliday ? <Badge tone="danger">Hari libur</Badge> : <Badge>Hari kerja</Badge>}</Td>
                  <Td className="text-right font-mono">{formatDuration(d.workedMinutes)}</Td>
                  <Td className="text-right font-mono text-fg-brand">{formatDuration(d.overtimeMinutes)}</Td>
                  <Td>{req ? <ApprovalBadge status={req.status} /> : <span className="text-xs text-fg-subtle">Belum diajukan</span>}</Td>
                  <Td className="text-right">
                    {!active && (
                      <Button size="small" onClick={() => { setReason(""); setTarget(d); }}>
                        Ajukan
                      </Button>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}

      <div className="mt-8">
        <SectionTitle>Riwayat pengajuan</SectionTitle>
        <div className="grid gap-3 lg:grid-cols-2">
          {mine.map((r) => (
            <Card key={r.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-base font-medium">{formatDayShort(r.date)}</p>
                  <p className="font-mono text-xs text-fg-muted">
                    Diajukan {formatDuration(r.requestedMinutes)}
                    {r.approvedMinutes !== null && ` · disetujui ${formatDuration(r.approvedMinutes)}`}
                  </p>
                </div>
                <ApprovalBadge status={r.status} />
              </div>
              {r.reason && <p className="text-sm">{r.reason}</p>}
              <ApprovalTimeline logs={r.logs} labels={leaveStatusLabel} />
              {allowedLeaveActions(actor, r.userId, r.status).includes("cancel") && (
                <div>
                  <Button variant="secondary" tone="danger" size="small" onClick={() => run((s) => actOnOvertime(s, r.id, "cancel", actor), "Pengajuan dibatalkan.")}>
                    Batalkan
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      <Dialog
        open={target !== null}
        onOpenChange={(o) => !o && setTarget(null)}
        title="Ajukan lembur"
        description={target ? `${formatDayShort(target.date)} · ${formatDuration(target.overtimeMinutes)}` : undefined}
        footer={
          <>
            <Button variant="secondary" tone="neutral" onClick={() => setTarget(null)}>Batal</Button>
            <Button onClick={submit}>Ajukan</Button>
          </>
        }
      >
        <Textarea label="Alasan (opsional)" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Dialog>
    </>
  );
}
