import { z } from "zod";
import { t } from "./trpc.js";
import {
  CheckoutWithDetailsSchema,
  CheckoutBookSchema,
  ReturnBookSchema,
  RenewCheckoutSchema,
  CheckoutSearchQuerySchema,
  PaginatedResponseSchema,
} from "../types/index.js";

export const checkoutRouter = t.router({
  list: t.procedure
    .input(CheckoutSearchQuerySchema)
    .output(PaginatedResponseSchema(CheckoutWithDetailsSchema))
    .query(async ({ input: _input }) => {
      throw new Error("Not implemented");
    }),

  getById: t.procedure
    .input(z.object({ id: z.string().uuid() }))
    .output(CheckoutWithDetailsSchema.nullable())
    .query(async ({ input: _input }) => {
      throw new Error("Not implemented");
    }),

  getUserCheckouts: t.procedure
    .input(z.object({
      userId: z.string().uuid().optional(),
      status: z.enum(["ACTIVE", "RETURNED", "OVERDUE"]).optional(),
    }))
    .output(z.array(CheckoutWithDetailsSchema))
    .query(async ({ input: _input }) => {
      throw new Error("Not implemented");
    }),

  checkoutBook: t.procedure
    .input(CheckoutBookSchema)
    .output(CheckoutWithDetailsSchema)
    .mutation(async ({ input: _input }) => {
      throw new Error("Not implemented");
    }),

  returnBook: t.procedure
    .input(ReturnBookSchema)
    .output(CheckoutWithDetailsSchema)
    .mutation(async ({ input: _input }) => {
      throw new Error("Not implemented");
    }),

  renewCheckout: t.procedure
    .input(RenewCheckoutSchema)
    .output(CheckoutWithDetailsSchema)
    .mutation(async ({ input: _input }) => {
      throw new Error("Not implemented");
    }),

  getOverdueCheckouts: t.procedure
    .output(z.array(CheckoutWithDetailsSchema))
    .query(async () => {
      throw new Error("Not implemented");
    }),

  markOverdueEmailSent: t.procedure
    .input(z.object({ checkoutId: z.string().uuid() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input: _input }) => {
      throw new Error("Not implemented");
    }),

  getActiveCount: t.procedure
    .input(z.void())
    .output(z.number())
    .query(async () => {
      throw new Error("Not implemented");
    }),
});