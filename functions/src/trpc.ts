import { initTRPC } from "@trpc/server";
import { ZodError } from "zod";
import { getAuthStrategy } from "./auth";
import type { Request, Response } from "express";

interface Context {
  req: Request;
  res: Response;
}

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  await new Promise<void>((resolve, reject) => {
    getAuthStrategy().verifyAuth(ctx.req, ctx.res, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });

  return next({
    ctx: {
      ...ctx,
      shop: ctx.req.shop,
    },
  });
});

export type AppRouter = typeof router;
