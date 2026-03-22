import { router, publicProcedure, protectedProcedure } from "../trpc";
import { z } from "zod";
import { scenariosRouter } from "./scenarios";

export const appRouter = router({
  hello: router({
    greeting: router({
      query: publicProcedure
        .input(z.object({ name: z.string().optional() }))
        .query(({ input }: { input: { name?: string } }) => {
          return {
            greeting: `Hello ${input?.name ?? "World"}!`,
          };
        }),
    }),
  }),
  auth: router({
    check: protectedProcedure.query(({ ctx }) => {
      return {
        success: true,
        shop: ctx.shop,
      };
    }),
  }),
  scenarios: scenariosRouter,
});

export type AppRouter = typeof appRouter;
