import { t } from "./trpc.js";
import { bookRouter } from "./book.js";
import { userRouter } from "./user.js";
import { checkoutRouter } from "./checkout.js";

export const appRouter = t.router({
  book: bookRouter,
  user: userRouter,
  checkout: checkoutRouter,
});

export type AppRouter = typeof appRouter;

export * from "./trpc.js";
export * from "./book.js";
export * from "./user.js";
export * from "./checkout.js";