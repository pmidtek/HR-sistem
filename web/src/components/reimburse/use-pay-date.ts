"use client";

import { useMemo } from "react";
import { estimatedPayDate } from "@/lib/calc/reimburse";
import { useApp } from "@/store/app-provider";

/** Perkiraan tanggal bayar dari tanggal pengajuan, sesuai jadwal di Settings → Reimbursement payment. */
export function usePayDate(): (submittedAt: string) => string {
  const { state } = useApp();
  const holidays = useMemo(() => new Set(state.holidays.map((h) => h.date)), [state.holidays]);
  const rule = state.settings.reimburse;
  return (submittedAt: string) => estimatedPayDate(submittedAt, rule, holidays);
}
