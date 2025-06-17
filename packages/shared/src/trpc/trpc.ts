import { initTRPC } from "@trpc/server";

export const t = initTRPC.create({
  errorFormatter({ shape }) {
    return shape;
  },
});

export const publicProcedure = t.procedure;