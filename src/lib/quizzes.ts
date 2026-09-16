import { z } from "zod";

export const quizOptionSchema = z.object({
    text: z.string().trim().min(1),
});

export const quizQuestionSchema = z.object({
    question: z.string().trim().min(1),
    options: z.array(quizOptionSchema).length(4),
    correctAnswer: z.number().int().min(0).max(3),
    explanation: z.string().trim().min(1),
    topic: z.string().trim().min(1),
    difficulty: z.enum(["easy", "medium", "hard"]),
});

export const quizResponseSchema = z.object({
    questions: z.array(quizQuestionSchema).min(1).max(20),
});

export const generateQuizRequestSchema = z.object({
    userId: z.uuid(),
    documentId: z.uuid(),
    topic: z.string().trim().max(120).optional(),
});

export const submitQuizRequestSchema = z.object({
    userId: z.uuid(),
    quizId: z.uuid(),
    answers: z.array(
        z.object({
            questionId: z.uuid(),
            selectedOptionId: z.uuid().nullable(),
        }),
    ),
});

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;