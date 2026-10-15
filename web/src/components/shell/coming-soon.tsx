import Link from "next/link";
import { Hourglass } from "lucide-react";
import { Card } from "../ui/display";
import { Icon } from "../ui/icon";

/** Halaman untuk modul yang belum dirilis (lihat releasedFeatures di lib/access.ts). */
export function ComingSoon() {
  return (
    <Card padding="lg" className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-brand-subtle text-fg-brand">
        <Icon icon={Hourglass} size={20} />
      </span>
      <h1 className="font-display text-xl font-medium">Coming soon</h1>
      <p className="text-sm text-fg-muted">We&apos;re rolling out modules one at a time, starting with Reimbursement. This one is next in line.</p>
      <Link href="/reimbursements" className="text-sm text-fg-brand hover:underline">Go to Reimbursement</Link>
    </Card>
  );
}
