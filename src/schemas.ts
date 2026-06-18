import { z } from "zod";

export const taskStatusSchema = z.enum(["todo", "in_progress", "done"]);

const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .transform((tag) => tag.toLowerCase());

export const createTaskSchema = z.object({
  id: z.string().trim().min(1).max(128).optional(),
  description: z.string().trim().min(1).max(50_000),
  tags: z.array(tagSchema).max(25).default([]),
  assignee: z.string().trim().max(128).default(""),
  status: taskStatusSchema.default("todo"),
});

export const updateTaskSchema = z
  .object({
    description: z.string().trim().min(1).max(50_000).optional(),
    tags: z.array(tagSchema).max(25).optional(),
    assignee: z.string().trim().max(128).optional(),
    status: taskStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

export const listTaskFiltersSchema = z.object({
  id: z.string().trim().min(1).max(128).optional(),
  status: taskStatusSchema.optional(),
  assignee: z.string().trim().max(128).optional(),
  tags: z.array(tagSchema).max(25).default([]),
  q: z.string().trim().min(1).max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const claimTaskSchema = z.object({
  assignee: z.string().trim().min(1).max(128),
  tags: z.array(tagSchema).max(25).default([]),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ClaimTaskInput = z.infer<typeof claimTaskSchema>;
