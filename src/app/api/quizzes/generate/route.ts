import OpenAI from "openai";
import { NextResponse } from "next/server";
import { zodTextFormat } from "openai/helpers/zod";
import {
    generateQuizRequestSchema,
    quizResponseSchema,
} from "@/lib/quizzes";
import { getPrisma } from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const input = generateQuizRequestSchema.safeParse(await request.json());

        if (!input.success) {
            return NextResponse.json(
                { error: "A valid user and document are required." },
                { status: 400 },
            );
        }

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: "The OpenAI API key is not configured." }, { status: 500 });
        }

        const documents = input.data.documentId
            ? await getPrisma().studyDocument.findMany({
                where: { id: input.data.documentId, userId: input.data.userId },
                select: { id: true, title: true, contentText: true },
            })
            : await getPrisma().studyDocument.findMany({
                where: {
                    userId: input.data.userId,
                    topics: { some: { topic: { name: input.data.topic } } },
                },
                select: { id: true, title: true, contentText: true },
                orderBy: { updatedAt: "desc" },
                take: 10,
            });

        if (documents.length === 0) {
            return NextResponse.json({ error: "No matching study material was found." }, { status: 404 });
        }

        const sourceText = documents
            .map((document) => document.contentText?.trim())
            .filter((content): content is string => Boolean(content))
            .join("\n\n");

        if (sourceText.length < 20) {
            return NextResponse.json(
                { error: "The selected study material does not contain enough study text." },
                { status: 422 },
            );
        }

        const topicInstruction = input.data.topic
            ? `Focus the quiz on this topic: ${input.data.topic}.`
            : "Cover the most important topics in the document.";
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.responses.parse({
            model: "gpt-4o-mini",
            input: [
                {
                    role: "system",
                    content: `Create a multiple-choice quiz from the study material. ${topicInstruction} Generate 5 to 10 questions. Every question must have exactly four distinct options and one correct answer represented by its zero-based option index. Use easy, medium, or hard difficulty.`,
                },
                { role: "user", content: sourceText.slice(0, 50000) },
            ],
            text: { format: zodTextFormat(quizResponseSchema, "quiz") },
        });
        const parsed = quizResponseSchema.safeParse(response.output_parsed);

        if (!parsed.success) {
            return NextResponse.json({ error: "The AI returned an invalid quiz." }, { status: 502 });
        }

        const quiz = await getPrisma().quiz.create({
            data: {
                userId: input.data.userId,
                documentId: input.data.documentId ? documents[0].id : null,
                title: input.data.topic ? `${input.data.topic} quiz` : `${documents[0].title} quiz`,
                questions: {
                    create: parsed.data.questions.map((question, position) => ({
                        prompt: question.question,
                        explanation: question.explanation,
                        topic: question.topic,
                        difficulty: question.difficulty,
                        position,
                        options: {
                            create: question.options.map((option, optionIndex) => ({
                                text: option.text,
                                isCorrect: optionIndex === question.correctAnswer,
                            })),
                        },
                    })),
                },
            },
            include: {
                questions: {
                    orderBy: { position: "asc" },
                    include: { options: { orderBy: { id: "asc" } } },
                },
            },
        });

        return NextResponse.json({
            quiz: {
                id: quiz.id,
                title: quiz.title,
                questions: quiz.questions.map((question) => ({
                    id: question.id,
                    question: question.prompt,
                    topic: question.topic,
                    difficulty: question.difficulty,
                    explanation: question.explanation,
                    options: question.options.map((option) => ({ id: option.id, text: option.text })),
                })),
            },
        });
    } catch (error) {
        console.error("Quiz generation failed", error);
        return NextResponse.json({ error: "Unable to generate a quiz right now." }, { status: 500 });
    }
}