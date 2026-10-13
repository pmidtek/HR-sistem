import { EmptyState } from "../../ui/display";

/** Placeholder sementara untuk menu workspace yang belum dibangun. */
export function ComingSoon({ menu }: { menu: string }) {
  return <EmptyState title={`${menu} sedang disiapkan`} description="Menu ini dibangun bertahap sesuai docs/PROJECT-WORKSPACE.md." />;
}
