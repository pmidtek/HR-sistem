/** Semua custom endpoint SIDESAH ada di bawah /sidesah (via proxy: /panel/sidesah/...). */
import { defineEndpoint } from "@directus/extensions-sdk";
import { accountRoutes } from "./account";
import { refreshUsdRate } from "./fx";
import { fxRoutes } from "./fx-history";
import { forbidden, route } from "./lib/context";
import { runMicrosoftSync } from "./ms-sync";
import { reimburseRoutes } from "./reimburse/routes";
import { userRoutes } from "./users";

export default defineEndpoint({
  id: "sidesah",
  handler: (router, ctx) => {
    accountRoutes(router, ctx);
    reimburseRoutes(router, ctx);
    userRoutes(router, ctx);
    fxRoutes(router, ctx);

    // Ambil kurs USD terbaru sekarang (tombol "Refresh now" di Settings).
    router.post("/fx/refresh", route(ctx, async (_req, actor) => {
      if (actor.role !== "finance" && actor.role !== "stakeholder") throw forbidden("Only Finance or Stakeholder can update the exchange rate.");
      return refreshUsdRate(ctx, true);
    }));

    // Jalankan sinkron Microsoft sekarang (HR / Stakeholder). Otomatis juga dijalankan terjadwal (hooks.ts).
    router.post("/sync/microsoft", route(ctx, async (_req, actor) => {
      if (actor.role !== "hr" && actor.role !== "stakeholder") throw forbidden("Only HR or Stakeholder can run the Microsoft sync.");
      return runMicrosoftSync(ctx);
    }));
  },
});
