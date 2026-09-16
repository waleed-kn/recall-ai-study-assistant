import { z } from "zod";

export const flashcardSchema = z.object({
    question: z.string().trim().min(1),
    answer: z.string().trim().min(1),
    topic: z.string().trim().min(1),
    difficulty: z.enum(["easy", "medium", "hard"]),
});

export const flashcardsResponseSchema = z.object({
    flashcards: z.array(flashcardSchema).min(1).max(20),
});

export const generateFlashcardsRequestSchema = z.object({
    notes: z.string().trim().min(20).max(30000),
    userId: z.uuid(),
    documentId: z.uuid(),
});

export type Flashcard = z.infer<typeof flashcardSchema>;