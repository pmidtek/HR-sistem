"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/** Baca/tulis satu query param (mis. ?task=, ?tab=) tanpa scroll ke atas. null = hapus. */
export function useQueryParam(key: string): [string | null, (value: string | null) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const value = params.get(key);
  const set = useCallback(
    (next: string | null) => {
      const p = new URLSearchParams(window.location.search);
      if (next === null || next === "") p.delete(key);
      else p.set(key, next);
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [key, pathname, router],
  );
  return [value, set];
}

/** Ubah beberapa query param sekaligus (null = hapus). */
export function useQueryUpdater(): (patch: Record<string, string | null>) => void {
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(
    (patch: Record<string, string | null>) => {
      const p = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") p.delete(k);
        else p.set(k, v);
      }
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );
}
