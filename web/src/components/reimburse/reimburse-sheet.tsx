"use client";

import { ClipboardPaste, Plus } from "lucide-react";
import { useId, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import {
  isBlankRow, normalizeProjectCode, parseUsdCents, usdToIdr, validateReimburseRow, type ReimburseRowInput, type RowErrors,
} from "@/lib/calc/reimburse";
import { parsePastedRows } from "@/lib/calc/reimburse-paste";
import { formatRupiah } from "@/lib/format";
import type { Reimbursement } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { reviseReimburseClaim, submitReimburseClaim } from "@/store/actions-reimburse";
import { projectRefs } from "../hooks";
import { Button } from "../ui/button";
import { Card } from "../ui/display";
import { Input } from "../ui/form";
import { Icon } from "../ui/icon";
import { formatUsd } from "./parts";
import { SheetRowCells, type SheetRow } from "./sheet-row";

let seq = 0;
const fromInput = (r: ReimburseRowInput): SheetRow => ({
  ...r, key: ++seq, usdText: r.amountUsdCents === null ? "" : (r.amountUsdCents / 100).toFixed(2), codeText: r.projectCode ?? "", idrAuto: false,
});
const blankRow = (today: string, prev?: SheetRow): SheetRow =>
  fromInput({ date: prev?.date ?? today, description: "", categoryId: "", projectCode: prev ? normalizeProjectCode(prev.codeText) : null, amountUsdCents: null, amount: 0, files: [] });
const toInput = (r: SheetRow): ReimburseRowInput => ({
  date: r.date, description: r.description, categoryId: r.categoryId, projectCode: normalizeProjectCode(r.codeText), amountUsdCents: r.amountUsdCents, amount: r.amount, files: r.files,
});

/** Lembar input reimburse ala Excel. Satu pengajuan = beberapa baris; bisa tempel langsung dari Excel. */
export function ReimburseSheet({ onClose, editing }: { onClose: () => void; editing?: Reimbursement }) {
  const { state, user, actor, today, run } = useAuthed();
  const codeListId = useId();
  const rate = state.settings.payroll.usdRate;
  const [title, setTitle] = useState(editing?.title ?? "");
  const [rows, setRows] = useState<SheetRow[]>(() => (editing ? editing.items.map(fromInput) : [blankRow(today), blankRow(today), blankRow(today)]));
  const [errors, setErrors] = useState<Record<number, RowErrors>>({});
  const [pasted, setPasted] = useState(0);

  const update = (key: number, patch: Partial<SheetRow>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setErrors((e) => (e[key] ? { ...e, [key]: {} } : e));
  };
  const setUsd = (r: SheetRow, text: string) => {
    const cents = parseUsdCents(text);
    const auto = r.idrAuto || r.amount === 0;
    update(r.key, { usdText: text, amountUsdCents: cents, ...(auto ? { amount: cents ? usdToIdr(cents, rate) : 0, idrAuto: cents !== null } : {}) });
  };
  const addRow = () => setRows((rs) => [...rs, blankRow(today, rs[rs.length - 1])]);
  const remove = (key: number) => setRows((rs) => (rs.length === 1 ? [blankRow(today)] : rs.filter((r) => r.key !== key)));
  const duplicate = (r: SheetRow) => setRows((rs) => rs.flatMap((x) => (x.key === r.key ? [x, { ...r, key: ++seq, files: [] }] : [x])));

  function onEnter(e: KeyboardEvent<HTMLElement>, key: number) {
    if (e.key === "Enter" && rows[rows.length - 1].key === key) {
      e.preventDefault();
      addRow();
    }
  }

  /** Tempel beberapa baris dari Excel: isi mulai baris ini, tambah baris bila perlu. */
  function onPaste(e: ClipboardEvent<HTMLInputElement>, key: number) {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\t")) return;
    const parsed = parsePastedRows(text, state.reimbursementCategories, today);
    if (parsed.length === 0) return;
    e.preventDefault();
    setRows((rs) => {
      const start = rs.findIndex((r) => r.key === key);
      const after = rs.slice(start).filter((r) => !isBlankRow(toInput(r))).slice(parsed.length);
      return [...rs.slice(0, start), ...parsed.map(fromInput), ...after];
    });
    setPasted(parsed.length);
  }

  const filled = rows.filter((r) => !isBlankRow(toInput(r)));
  const total = filled.reduce((s, r) => s + r.amount, 0);
  const totalUsd = filled.reduce((s, r) => s + (r.amountUsdCents ?? 0), 0);
  const errorCount = Object.values(errors).filter((e) => Object.keys(e).length > 0).length;

  function submit() {
    const errs: Record<number, RowErrors> = {};
    for (const r of filled) {
      const e = validateReimburseRow(toInput(r), today);
      if (Object.keys(e).length > 0) errs[r.key] = e;
    }
    setErrors(errs);
    if (filled.length === 0 || Object.keys(errs).length > 0) return;
    const input = filled.map(toInput);
    const ok = editing
      ? run((s) => reviseReimburseClaim(s, editing.id, actor, title, input, today), `${editing.number} dikirim ulang ke Finance.`)
      : run((s) => submitReimburseClaim(s, user.id, title, input, today), `Reimburse ${filled.length} baris terkirim ke Finance.`);
    if (ok) onClose();
  }

  return (
    <Card padding="lg" className="mb-8 flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-medium">{editing ? `Perbaiki ${editing.number}` : "Ajukan reimburse"}</h2>
          <p className="text-sm text-fg-muted">Satu baris satu transaksi. Semua baris diajukan dan dibayar sebagai satu grup.</p>
        </div>
        <div className="w-full max-w-sm">
          <Input label="Judul pengajuan (opsional)" placeholder="Mis. Perjalanan IFT 8–11 Sep" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>

      <p className="flex items-center gap-2 rounded-xs bg-sunken px-3 py-2 text-xs text-fg-muted">
        <Icon icon={ClipboardPaste} size={14} />
        {pasted > 0 ? `${pasted} baris ditempel dari Excel. Cek kategori dan upload buktinya.` : "Punya rekap di Excel? Copy baris Date sampai Cost (IDR), lalu paste di kolom Description."}
      </p>

      <datalist id={codeListId}>
        <option value="OTHERS">Others</option>
        {projectRefs(state).map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
      </datalist>

      <div className="overflow-x-auto rounded-xs shadow-[inset_0_0_0_1px_var(--border-default)]">
        <table className="w-full min-w-[1100px] border-collapse text-sm [&_td]:border [&_td]:border-line [&_th]:border [&_th]:border-line">
          <thead className="bg-sunken text-left font-mono text-[11px] tracking-[0.06em] whitespace-nowrap text-fg-subtle uppercase">
            <tr>
              <th className="w-10 px-2 py-2 text-center font-normal">No</th>
              <th className="w-40 px-3 py-2 font-normal">Date</th>
              <th className="min-w-56 px-3 py-2 font-normal">Description</th>
              <th className="w-44 px-3 py-2 font-normal">Category</th>
              <th className="w-32 px-3 py-2 font-normal">Code</th>
              <th className="w-32 px-3 py-2 text-right font-normal">Cost (USD)</th>
              <th className="w-36 px-3 py-2 text-right font-normal">Cost (IDR)</th>
              <th className="w-44 px-3 py-2 font-normal">Bukti</th>
              <th className="w-20 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <SheetRowCells
                key={r.key} row={r} index={i} errors={errors[r.key] ?? {}} categories={state.reimbursementCategories} today={today} codeListId={codeListId}
                onChange={(p) => update(r.key, p)} onUsd={(t) => setUsd(r, t)} onEnter={(e) => onEnter(e, r.key)} onPaste={(e) => onPaste(e, r.key)}
                onDuplicate={() => duplicate(r)} onRemove={() => remove(r.key)}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-sunken">
              <td colSpan={5} className="p-0">
                <button type="button" onClick={addRow} className="flex h-10 w-full items-center gap-1.5 px-3 text-sm text-fg-brand hover:bg-hover">
                  <Icon icon={Plus} size={14} /> Tambah baris
                </button>
              </td>
              <td className="px-3 text-right font-mono text-xs text-fg-muted">{totalUsd > 0 ? formatUsd(totalUsd) : "-"}</td>
              <td className="px-3 text-right font-mono text-sm">{formatRupiah(total)}</td>
              <td colSpan={2} className="px-3 text-xs text-fg-subtle">{filled.length} baris terisi</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-fg-subtle">
          {errorCount > 0
            ? <span className="text-fg-danger">{errorCount} baris belum lengkap. Arahkan kursor ke kolom merah untuk lihat alasannya.</span>
            : `Code boleh dikosongkan atau isi OTHERS. Kolom IDR terisi otomatis dari USD (kurs ${formatRupiah(rate)}), bisa diubah sesuai tagihan.`}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" tone="neutral" onClick={onClose}>Batal</Button>
          <Button onClick={submit} disabled={filled.length === 0}>{editing ? "Kirim ulang" : "Ajukan"}{filled.length > 0 ? ` · ${formatRupiah(total)}` : ""}</Button>
        </div>
      </div>
    </Card>
  );
}
