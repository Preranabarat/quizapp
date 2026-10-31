import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log(body);
    
    if (!body || !body.roomId || !body.roomData) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { roomId, roomData } = body;
    const { playerCount, user, topic, roomTimeLimit, questionCount, difficulty } = roomData;

    // Check if the user exists
    const hostUser = await prisma.user.findUnique({
      where: { id: user },
    });
    
    if (!hostUser) {
      return NextResponse.json(
        { error: "Host user not found" },
        { status: 404 }
      );
    }
    
    // Check if user has enough credits
    if (hostUser.credits < 1) {
      return NextResponse.json(
        { error: "Insufficient credits", 
          details: "You need at least 1 credit to create a room" 
        },
        { status: 403 }
      );
    }
    
    // Create the room in the database
    const room = await prisma.$transaction(async (prisma) => {
      // Deduct 1 credit from user
      const updatedUser = await prisma.user.update({
        where: { id: user },
        data: { 
          credits: { decrement: 1 } 
        },
      });
      
      // Record credit transaction
      await prisma.creditTransaction.create({
        data: {
          userId: user,
          amount: -1,
          type: "GAME_HOST",
          roomId: roomId,
          description: `Created room ${roomId} for topic ${topic}`
        }
      });
      
      // Create the room
      return await prisma.room.create({
        data: {
          id: roomId,
          status: "WAITING",
          maxParticipants: Number(playerCount),
          roomTimeLimit: Number(roomTimeLimit),
          questionCount: Number(questionCount),
          difficulty: difficulty.toUpperCase() as "EASY" | "MEDIUM" | "HARD" | "EXPERT",
          quizTopic: topic,
          duration: 0,
          hostId: user,
          participants: {
            create: [{
              userId: user,
            }]
          }
        },
      });
    });

    return NextResponse.json({ 
      message: "Room created successfully", 
      room,
      creditsRemaining: hostUser.credits - 1
    });
  } catch (error: unknown) {
    console.error("Error creating room:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Error creating room", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
