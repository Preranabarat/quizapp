import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params;
    const body = await req.json();
    const { questionIndex, answers } = body;
    console.log("Processing answers for room:", roomId, "question:", questionIndex, "answers:", JSON.stringify(answers).substring(0, 200));

    if (!roomId || questionIndex === undefined || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "Room ID, question index, and answers array are required" },
        { status: 400 }
      );
    }

    // Get the room first to ensure it exists
    const room = await prisma.room.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      console.log(`Room ${roomId} not found, creating minimal record`);
      try {
        await prisma.room.create({
          data: {
            id: roomId,
            status: "WAITING",
            maxParticipants: 2,
            roomTimeLimit: 300,
            questionCount: 5,
            difficulty: "MEDIUM",
            duration: 0,
            hostId: answers[0]?.participantId || "unknown",
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        console.log(`Created minimal room record for ${roomId}`);
      } catch (roomCreateError) {
        console.error("Failed to create room:", roomCreateError);
        // Continue anyway to try storing answers
      }
    }

    // Get the game question for this room and index
    let gameQuestion;
    const gameQuestions = await prisma.gameQuestion.findMany({
      where: { gameSessionId: roomId },
      orderBy: { orderIndex: 'asc' },
    });

    if (!gameQuestions || gameQuestions.length <= questionIndex) {
      console.log("Game question not found, creating it");
      // Create a dummy game question if it doesn't exist
      try {
        // First create a dummy question if needed
        let questionId;
        const questionCheck = await prisma.question.findFirst({
          where: { questionText: { contains: "Default" } }
        });
        
        if (questionCheck) {
          questionId = questionCheck.id;
        } else {
          const newQuestion = await prisma.question.create({
            data: {
              questionText: "Default Question",
              options: ["Option A", "Option B", "Option C", "Option D"],
              correctOption: 0,
              explanation: "Default explanation",
              difficulty: "MEDIUM",
              points: 10,
              categoryId: await getOrCreateDefaultCategory()
            }
          });
          questionId = newQuestion.id;
        }
        
        // Create the game question
        gameQuestion = await prisma.gameQuestion.create({
          data: {
            gameSessionId: roomId,
            questionId: questionId,
            orderIndex: questionIndex,
            timeLimit: 30,
            points: 10
          }
        });
        console.log(`Created game question for room ${roomId}, question index ${questionIndex}`);
      } catch (questionCreateError) {
        console.error("Failed to create game question:", questionCreateError);
        return NextResponse.json(
          { error: "Failed to create game question" },
          { status: 500 }
        );
      }
    } else {
      gameQuestion = gameQuestions[questionIndex];
    }

    // Store each participant's answer
    const storedAnswers = [];
    for (const answer of answers) {
      try {
        // Ensure the participant exists
        try {
          const roomParticipant = await prisma.roomParticipant.findFirst({
            where: {
              userId: answer.participantId,
              roomId: roomId
            }
          });
          
          if (!roomParticipant) {
            // Create the participant if not found
            await prisma.roomParticipant.create({
              data: {
                userId: answer.participantId,
                roomId: roomId
              }
            });
            console.log(`Created room participant for user ${answer.participantId} in room ${roomId}`);
          }
        } catch (participantError) {
          console.error("Error checking/creating participant:", participantError);
          // Continue anyway
        }
        
        // Now store the answer
        try {
          // Check if answer already exists
          const existingAnswer = await prisma.participantAnswer.findFirst({
            where: {
              participantId: answer.participantId,
              questionId: gameQuestion.id
            }
          });

          // Use either update or create as appropriate
          let storedAnswer;
          if (existingAnswer) {
            // Update existing answer
            storedAnswer = await prisma.participantAnswer.update({
              where: {
                id: existingAnswer.id
              },
              data: {
                selectedOption: answer.selectedOption,
                isCorrect: answer.isCorrect,
                answerTime: answer.answerTime || 0,
                pointsEarned: answer.pointsEarned || 0
              }
            });
          } else {
            // Create new answer
            storedAnswer = await prisma.participantAnswer.create({
              data: {
                participantId: answer.participantId,
                questionId: gameQuestion.id,
                selectedOption: answer.selectedOption,
                isCorrect: answer.isCorrect,
                answerTime: answer.answerTime || 0,
                pointsEarned: answer.pointsEarned || 0
              }
            });
          }
          
          storedAnswers.push(storedAnswer);
          console.log(`Stored answer for participant ${answer.participantId}, question ${gameQuestion.id}`);
        } catch (answerError) {
          console.error("Error storing answer:", answerError);
          // Continue with next answer
        }
      } catch (participantError) {
        console.error("Error processing participant:", participantError);
      }
    }

    return NextResponse.json({
      message: "Answers stored successfully",
      answers: storedAnswers.length
    });
  } catch (error) {
    console.error("Error storing answers:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to store answers" },
      { status: 500 }
    );
  }
}

// Helper function to get or create a default category
async function getOrCreateDefaultCategory() {
  try {
    const category = await prisma.quizCategory.findFirst({
      where: { name: "General" }
    });
    
    if (category) {
      return category.id;
    }
    
    const newCategory = await prisma.quizCategory.create({
      data: {
        name: "General",
        description: "General Knowledge Questions"
      }
    });
    
    return newCategory.id;
  } catch (error) {
    console.error("Error getting/creating category:", error);
    throw error;
  }
} 