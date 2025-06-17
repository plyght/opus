import { z } from "zod";
import { t } from "./trpc.js";
import {
  BookSchema,
  CreateBookSchema,
  UpdateBookSchema,
  BookSearchQuerySchema,
  PaginatedResponseSchema,
} from "../types/index.js";

export const bookRouter = t.router({
  list: t.procedure
    .input(BookSearchQuerySchema)
    .output(PaginatedResponseSchema(BookSchema))
    .query(async ({ input: _input }) => {
      throw new Error("Not implemented");
    }),

  getById: t.procedure
    .input(z.object({ id: z.string().uuid() }))
    .output(BookSchema.nullable())
    .query(async ({ input: _input }) => {
      throw new Error("Not implemented");
    }),

  getByIsbn: t.procedure
    .input(z.object({ isbn: z.string().min(10).max(13) }))
    .output(BookSchema.nullable())
    .query(async ({ input: _input }) => {
      throw new Error("Not implemented");
    }),

  create: t.procedure
    .input(CreateBookSchema)
    .output(BookSchema)
    .mutation(async ({ input: _input }) => {
      throw new Error("Not implemented");
    }),

  update: t.procedure
    .input(z.object({
      id: z.string().uuid(),
      data: UpdateBookSchema,
    }))
    .output(BookSchema)
    .mutation(async ({ input: _input }) => {
      throw new Error("Not implemented");
    }),

  delete: t.procedure
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input: _input }) => {
      throw new Error("Not implemented");
    }),

  addOrUpdateByIsbn: t.procedure
    .input(z.object({
      isbn: z.string().min(10).max(13),
      data: CreateBookSchema.partial(),
    }))
    .output(BookSchema)
    .mutation(async ({ input: _input }) => {
      throw new Error("Not implemented");
    }),

  getTotalCount: t.procedure
    .input(z.void())
    .output(z.number())
    .query(async () => {
      throw new Error("Not implemented");
    }),
});