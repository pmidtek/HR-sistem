import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type IconProps = {
  icon: LucideIcon;
  size?: number;
  className?: string;
};

/** Line icon: stroke 1.5px, grid 24px, warna via currentColor (sesuai Cartogram). */
export function Icon({ icon: Glyph, size = 16, className }: IconProps) {
  return <Glyph size={size} strokeWidth={1.5} className={cn("shrink-0", className)} aria-hidden />;
}
