import { z } from "zod";

export const CheckoutStatusSchema = z.enum(["ACTIVE", "RETURNED", "OVERDUE"]);

export const CheckoutSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  bookId: z.string().uuid(),
  status: CheckoutStatusSchema.default("ACTIVE"),
  checkedOutAt: z.date(),
  dueDate: z.date(),
  returnedAt: z.date().optional(),
  renewalCount: z.number().int().min(0).default(0),
  maxRenewals: z.number().int().min(0).default(2),
  overdueEmailSent: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateCheckoutSchema = z.object({
  userId: z.string().uuid(),
  bookId: z.string().uuid(),
  dueDate: z.date().optional(),
});

export const CheckoutBookSchema = z.object({
  isbn: z.string().min(10).max(13),
});

export const ReturnBookSchema = z.object({
  checkoutId: z.string().uuid(),
});

export const RenewCheckoutSchema = z.object({
  checkoutId: z.string().uuid(),
});

export const CheckoutSearchQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  bookId: z.string().uuid().optional(),
  status: CheckoutStatusSchema.optional(),
  overdue: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export const CheckoutWithDetailsSchema = CheckoutSchema.extend({
  user: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
  }),
  book: z.object({
    id: z.string().uuid(),
    title: z.string(),
    author: z.string(),
    isbn: z.string(),
  }),
});

export type CheckoutStatus = z.infer<typeof CheckoutStatusSchema>;
export type Checkout = z.infer<typeof CheckoutSchema>;
export type CreateCheckout = z.infer<typeof CreateCheckoutSchema>;
export type CheckoutBook = z.infer<typeof CheckoutBookSchema>;
export type ReturnBook = z.infer<typeof ReturnBookSchema>;
export type RenewCheckout = z.infer<typeof RenewCheckoutSchema>;
export type CheckoutSearchQuery = z.infer<typeof CheckoutSearchQuerySchema>;
export type CheckoutWithDetails = z.infer<typeof CheckoutWithDetailsSchema>;
