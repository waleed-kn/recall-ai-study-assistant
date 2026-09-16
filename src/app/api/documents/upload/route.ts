import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
import { NextResponse } from "next/server";
import { zodTextFormat } from "openai/helpers/zod";
import {
    flashcardsResponseSchema,
    generateFlashcardsRequestSchema,
} from "@/lib/flashcards";
import { getPrisma } from "@/lib/prisma";

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_AI_TEXT_LENGTH = 50000;

function cleanExtractedText(text: string) {
    return text
        .replace(/\u0000/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s*\n\s*\n+/g, "\n\n")
        .trim();
}

function responseFlashcards(
    flashcards: Array<{
        id: string;
        question: string;
        answer: string;
        difficulty: string;
        topics: Array<{ topic: { name: string } }>;
    }>,
    setId: string,
) {
    return {
        flashcards: flashcards.map((flashcard) => ({
            id: flashcard.id,
            question: flashcard.question,
            answer: flashcard.answer,
            difficulty: flashcard.difficulty,
            topic: flashcard.topics[0]?.topic.name ?? "General",
        })),
        setId,
    };
}

export async function POST(request: Request) {
    let parser: PDFParse | undefined;

    try {
        const formData = await request.formData();
        const file = formData.get("file");
        const userId = formData.get("userId");

        if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".pdf")) {
            return NextResponse.json({ error: "Please upload a PDF file." }, { status: 400 });
        }

        if (file.size === 0 || file.size > MAX_PDF_BYTES) {
            return NextResponse.json(
                { error: "PDF files must be smaller than 10 MB." },
                { status: 400 },
            );
        }

        const userInput = generateFlashcardsRequestSchema.shape.userId.safeParse(userId);

        if (!userInput.success) {
            return NextResponse.json({ error: "A valid current user is required." }, { status: 400 });
        }

        const pdfBuffer = Buffer.from(await file.arrayBuffer());

        if (pdfBuffer.subarray(0, 5).toString() !== "%PDF-") {
            return NextResponse.json({ error: "The uploaded file is not a valid PDF." }, { status: 400 });
        }

        parser = new PDFParse({ data: pdfBuffer });
        const parsedPdf = await parser.getText();
        const cleanedText = cleanExtractedText(parsedPdf.text);

        if (cleanedText.length < 20) {
            return NextResponse.json(
                { error: "This PDF does not contain enough selectable text to make flashcards." },
                { status: 422 },
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
                        "Create concise, accurate study flashcards from the provided PDF text. Cover the most important concepts. Return between 3 and 10 cards when the text supports it. Use easy, medium, or hard difficulty.",
                },
                { role: "user", content: cleanedText.slice(0, MAX_AI_TEXT_LENGTH) },
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

        const saved = await getPrisma().$transaction(async (transaction) => {
            const document = await transaction.studyDocument.create({
                data: {
                    userId: userInput.data,
                    title: file.name.replace(/\.pdf$/i, ""),
                    originalFileName: file.name,
                    mimeType: "application/pdf",
                    contentText: cleanedText,
                    status: "READY",
                },
                select: { id: true },
            });

            const flashcardSet = await transaction.flashcardSet.create({
                data: {
                    userId: userInput.data,
                    documentId: document.id,
                    title: `${file.name.replace(/\.pdf$/i, "")} flashcards`,
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

        return NextResponse.json(responseFlashcards(saved.flashcards, saved.id));
    } catch (error) {
        console.error("PDF flashcard generation failed", error);
        return NextResponse.json(
            { error: "Unable to process this PDF right now. Please try again." },
            { status: 500 },
        );
    } finally {
        await parser?.destroy();
    }
}