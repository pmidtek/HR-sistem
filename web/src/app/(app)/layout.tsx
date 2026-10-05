"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { canAccess, featureForPath } from "@/lib/access";
import { useApp } from "@/store/app-provider";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { EmptyState, Spinner } from "@/components/ui/display";

export default function AppLayout({ children }: LayoutProps<"/">) {
  const { user, team, hydrated } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size={20} />
      </div>
    );
  }

  const feature = featureForPath(pathname);
  const allowed = !feature || canAccess(user, team, feature);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-line glass lg:block">
        <Sidebar />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Tutup menu" className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-full w-64 border-r border-line bg-overlay backdrop-blur-xl">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 md:px-8">
          {allowed ? children : <EmptyState title="Akses ditolak" description="Halaman ini tidak tersedia untuk role atau tim Anda." />}
        </main>
      </div>
    </div>
  );
}
