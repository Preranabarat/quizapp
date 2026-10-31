import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Validate and transform incoming question data
interface QuestionData {
  id?: string;
  questionText: string;
  options: string[];
  correctOption: number;
  timeLimit?: number;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    // Extract room ID from params
    const { roomId } = await params;

    // Parse request body
    const body = await req.json();
    const { questions } = body;

    // Validate input
    if (!roomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "Questions must be a non-empty array" },
        { status: 400 }
      );
    }

    // Find the room
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    // Get or create quiz category
    let category = await prisma.quizCategory.findFirst({
      where: { name: room.quizTopic || "General Knowledge" },
    });

    if (!category) {
      category = await prisma.quizCategory.create({
        data: {
          name: room.quizTopic || "General Knowledge",
          description: `Questions about ${room.quizTopic || "General Knowledge"}`,
          isActive: true,
        },
      });
    }

    // Validate and store questions
    const storedQuestions: any[] = [];
    for (const q of questions) {
      // Validate question structure
      if (!isValidQuestion(q)) {
        console.warn('Skipping invalid question:', q);
        continue;
      }

      // Check if question already exists
      let existingQuestion = await prisma.question.findFirst({
        where: {
          questionText: q.questionText,
          categoryId: category.id,
        },
      });

      // Create question if it doesn't exist
      if (!existingQuestion) {
        existingQuestion = await prisma.question.create({
          data: {
            questionText: q.questionText,
            options: q.options,
            correctOption: q.correctOption,
            difficulty: room.difficulty || 'MEDIUM',
            points: 10,
            categoryId: category.id,
          },
        });
      }

      // Create game question
      const gameQuestion = await prisma.gameQuestion.create({
        data: {
          gameSessionId: roomId,
          questionId: existingQuestion.id,
          orderIndex: storedQuestions.length,
          timeLimit: q.timeLimit || 30,
          points: 10,
        },
      });

      storedQuestions.push(gameQuestion);
    }

    // Update room with quiz category
    await prisma.room.update({
      where: { id: roomId },
      data: {
        quizCategoryId: category.id,
      },
    });

    return NextResponse.json({
      message: "Questions stored successfully",
      questionsStored: storedQuestions.length,
      questions: storedQuestions,
    });
  } catch (error) {
    // Comprehensive error logging
    console.error("Error storing questions:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null,
      // Prisma-specific error details
      ...(error instanceof Error && 'code' in error ? {
        prismaCode: (error as any).code,
        prismaMetadata: (error as any).meta
      } : {})
    });

    // Return a detailed error response
    return NextResponse.json(
      {
        error: "Failed to store questions",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Helper function to validate question data
function isValidQuestion(question: any): question is QuestionData {
  return (
    question &&
    typeof question.questionText === 'string' &&
    Array.isArray(question.options) &&
    question.options.length > 0 &&
    typeof question.correctOption === 'number' &&
    question.correctOption >= 0 &&
    question.correctOption < question.options.length
  );
}

// Optional: Additional route handlers
export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const roomId = params.roomId;

    // Fetch questions for a specific room
    const gameQuestions = await prisma.gameQuestion.findMany({
      where: { gameSessionId: roomId },
      include: {
        question: true,
      },
      orderBy: { orderIndex: 'asc' },
    });

    return NextResponse.json({
      message: "Questions retrieved successfully",
      questions: gameQuestions,
    });
  } catch (error) {
    console.error("Error retrieving questions:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve questions",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}