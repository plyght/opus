import { z } from "zod";
import { t } from "./trpc.js";
import {
  UserSchema,
  CreateUserSchema,
  UpdateUserSchema,
  UserSearchQuerySchema,
  PaginatedResponseSchema,
} from "../types/index.js";

export const userRouter = t.router({
  list: t.procedure
    .input(UserSearchQuerySchema)
    .output(PaginatedResponseSchema(UserSchema))
    .query(async ({ input: _input }) => {
      throw new Error("Not implemented");
    }),

  getById: t.procedure
    .input(z.object({ id: z.string().uuid() }))
    .output(UserSchema.nullable())
    .query(async ({ input: _input }) => {
      throw new Error("Not implemented");
    }),

  getByEmail: t.procedure
    .input(z.object({ email: z.string().email() }))
    .output(UserSchema.nullable())
    .query(async ({ input: _input }) => {
      throw new Error("Not implemented");
    }),

  create: t.procedure
    .input(CreateUserSchema)
    .output(UserSchema)
    .mutation(async ({ input: _input }) => {
      throw new Error("Not implemented");
    }),

  update: t.procedure
    .input(z.object({
      id: z.string().uuid(),
      data: UpdateUserSchema,
    }))
    .output(UserSchema)
    .mutation(async ({ input: _input }) => {
      throw new Error("Not implemented");
    }),

  delete: t.procedure
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input: _input }) => {
      throw new Error("Not implemented");
    }),

  getCurrentUser: t.procedure
    .output(UserSchema.nullable())
    .query(async () => {
      throw new Error("Not implemented");
    }),
});