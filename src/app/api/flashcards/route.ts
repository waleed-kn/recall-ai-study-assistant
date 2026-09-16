import OpenAI from "openai";
import { NextResponse } from "next/server";
import { zodTextFormat } from "openai/helpers/zod";
import {
    flashcardsResponseSchema,
    generateFlashcardsRequestSchema,
} from "@/lib/flashcards";
import { getPrisma } from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const input = generateFlashcardsRequestSchema.safeParse(body);

        if (!input.success) {
            return NextResponse.json(
                { error: "Please enter at least 20 characters of study notes." },
                { status: 400 },
            );
        }

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: "The OpenAI API key is not configured." },
                { status: 500 },
            );
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.responses.parse({
            model: "gpt-4o-mini",
            input: [
                {
                    role: "system",
                    content:
                        "Create concise, accurate study flashcards from the provided notes. Cover the most important concepts. Return between 3 and 10 cards when the notes support it. Use easy, medium, or hard difficulty.",
                },
                { role: "user", content: input.data.notes },
            ],
            text: {
                format: zodTextFormat(flashcardsResponseSchema, "flashcards"),
            },
        });

        const parsed = flashcardsResponseSchema.safeParse(response.output_parsed);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "The AI returned an invalid flashcard response." },
                { status: 502 },
            );
        }

        const savedSet = await getPrisma().$transaction(async (transaction) => {
            const document = await transaction.studyDocument.findFirst({
                where: {
                    id: input.data.documentId,
                    userId: input.data.userId,
                },
                select: { id: true },
            });

            if (!document) {
                throw new Error("The document does not belong to the current user.");
            }

            const flashcardSet = await transaction.flashcardSet.create({
                data: {
                    userId: input.data.userId,
                    documentId: document.id,
                    title: "AI-generated flashcards",
                    flashcards: {
                        create: parsed.data.flashcards.map((flashcard, position) => ({
                            question: flashcard.question,
                            answer: flashcard.answer,
                            difficulty: flashcard.difficulty,
                            position,
                            topics: {
                                create: {
                                    topic: {
                                        connectOrCreate: {
                                            where: { name: flashcard.topic },
                                            create: { name: flashcard.topic },
                                        },
                                    },
                                },
                            },
                        })),
                    },
                },
                include: {
                    flashcards: {
                        include: { topics: { include: { topic: true } } },
                        orderBy: { position: "asc" },
                    },
                },
            });

            return flashcardSet;
        });

        return NextResponse.json({
            flashcards: savedSet.flashcards.map((flashcard) => ({
                id: flashcard.id,
                question: flashcard.question,
                answer: flashcard.answer,
                difficulty: flashcard.difficulty,
                topic: flashcard.topics[0]?.topic.name ?? "General",
            })),
            setId: savedSet.id,
        });
    } catch (error) {
        console.error("Flashcard generation failed", error);
        return NextResponse.json(
            { error: "Unable to generate flashcards right now. Please try again." },
            { status: 500 },
        );
    }
}