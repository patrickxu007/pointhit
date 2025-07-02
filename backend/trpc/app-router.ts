import { router } from "./create-context";
import { hiProcedure } from "./routes/example/hi/route";
import { generateInsightsProcedure } from "./routes/insights/generate/route";

export const appRouter = router({
  example: router({
    hi: hiProcedure,
  }),
  insights: router({
    generate: generateInsightsProcedure,
  }),
});

export type AppRouter = typeof appRouter;