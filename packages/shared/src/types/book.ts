import { z } from "zod";

export const BookSchema = z.object({
  id: z.string().uuid(),
  isbn: z.string().min(10).max(13),
  title: z.string().min(1).max(500),
  author: z.string().min(1).max(200),
  publisher: z.string().max(200).optional(),
  publishedYear: z
    .number()
    .int()
    .min(1000)
    .max(new Date().getFullYear())
    .optional(),
  genre: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  coverUrl: z.string().url().optional(),
  totalCopies: z.number().int().min(0).default(1),
  availableCopies: z.number().int().min(0).default(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateBookSchema = BookSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateBookSchema = CreateBookSchema.partial();

export const BookSearchQuerySchema = z.object({
  query: z.string().optional(),
  isbn: z.string().optional(),
  author: z.string().optional(),
  genre: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export type Book = z.infer<typeof BookSchema>;
export type CreateBook = z.infer<typeof CreateBookSchema>;
export type UpdateBook = z.infer<typeof UpdateBookSchema>;
export type BookSearchQuery = z.infer<typeof BookSearchQuerySchema>;
