import { z } from "zod";

export const UserRoleSchema = z.enum(["USER", "ADMIN"]);

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: UserRoleSchema.default("USER"),
  isActive: z.boolean().default(true),
  maxCheckouts: z.number().int().min(1).default(5),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateUserSchema = CreateUserSchema.partial();

export const UserSearchQuerySchema = z.object({
  query: z.string().optional(),
  role: UserRoleSchema.optional(),
  isActive: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export type UserRole = z.infer<typeof UserRoleSchema>;
export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type UserSearchQuery = z.infer<typeof UserSearchQuerySchema>;