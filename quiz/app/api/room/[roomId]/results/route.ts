import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = await params;
    
    // Log the request information
    console.log(`Received results POST for room ${roomId}`);
    
    // Debug the raw body before parsing
    const rawBody = await req.text();
    console.log(`Raw body length: ${rawBody.length} bytes`);
    console.log(`Raw body sample: ${rawBody.substring(0, 100)}...`);
    
    let body;
    try {
      // Parse the request body
      body = JSON.parse(rawBody);
      console.log(`Body successfully parsed, found participants: ${body.participants?.length || 0}`);
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { error: "Failed to parse request body", details: String(parseError) },
        { status: 400 }
      );
    }
    
    // Destructure needed data
    const { completedAt, participants } = body;

    if (!roomId || !participants || !Array.isArray(participants)) {
      console.error("Missing required fields:", { 
        hasRoomId: !!roomId, 
        hasParticipants: !!participants, 
        isParticipantsArray: Array.isArray(participants) 
      });
      return NextResponse.json(
        { error: "Room ID and participants array are required" },
        { status: 400 }
      );
    }

    // Get or create the room
    let room;
    try {
      room = await prisma.room.findUnique({
        where: { id: roomId }
      });

      if (!room) {
        console.log(`Room ${roomId} not found, creating minimal record`);
        room = await prisma.room.create({
          data: {
            id: roomId,
            status: "FINISHED",
            maxParticipants: participants.length,
            roomTimeLimit: 300,
            questionCount: 5,
            difficulty: "MEDIUM",
            duration: 0,
            hostId: participants[0]?.id || "unknown",
            createdAt: new Date(),
            updatedAt: new Date(),
            // completedAt: completedAt ? new Date(completedAt) : new Date()
          }
        });
        console.log(`Created minimal room record for ${roomId}`);
      } else {
        // Update existing room to finished status
        await prisma.room.update({
          where: { id: roomId },
          data: {
            status: "FINISHED",
            // completedAt: completedAt ? new Date(completedAt) : new Date()
          }
        });
        console.log(`Updated room ${roomId} status to FINISHED`);
      }
    } catch (roomError) {
      console.error("Error processing room:", roomError);
      return NextResponse.json(
        { error: "Failed to process room data" },
        { status: 500 }
      );
    }

    // Process each participant's results
    const processedResults = [];
    for (const participant of participants) {
      try {
        // Validate participant data
        if (!participant.id) {
          console.warn("Skipping participant with missing ID");
          continue;
        }
        
        // Ensure the participant is properly linked to the room
        try {
          const roomParticipant = await prisma.roomParticipant.findFirst({
            where: {
              userId: participant.id,
              roomId: roomId
            }
          });
          
          if (!roomParticipant) {
            // Create the room participant record if it doesn't exist
            await prisma.roomParticipant.create({
              data: {
                userId: participant.id,
                roomId: roomId
              }
            });
            console.log(`Created room participant for user ${participant.id} in room ${roomId}`);
          }
        } catch (participantError) {
          console.error(`Error ensuring room participant for ${participant.id}:`, participantError);
          // Continue anyway
        }
        
        // Find or create the user
        let user;
        try {
          user = await prisma.user.findUnique({
            where: { id: participant.id }
          });
  
          if (!user) {
            // If user doesn't exist, try to create a minimal user record
            user = await prisma.user.create({
              data: {
                id: participant.id,
                name: participant.username || `Player-${participant.id.substring(0, 5)}`
              }
            });
            console.log(`Created minimal user record for ${participant.id}`);
          }
          
          // Find the highest score to determine winner
          const highestScore = Math.max(...participants.map((p: any) => p.score || 0));
          const isWinner = participant.isWinner || (participant.score === highestScore && participant.score > 0);
          const isDraw = participants.filter((p: any) => (p.score || 0) === highestScore && highestScore > 0).length > 1;
  
          // Update user statistics
          await prisma.user.update({
            where: { id: participant.id },
            data: {
              gamesPlayed: { increment: 1 },
              wins: isWinner && !isDraw ? { increment: 1 } : undefined,
              draws: isDraw ? { increment: 1 } : undefined,
              losses: !isWinner && !isDraw ? { increment: 1 } : undefined,
              totalPoints: { increment: participant.score || 0 },
              // Recalculate win rate
              winRate: {
                set: (user.wins + (isWinner && !isDraw ? 1 : 0)) / (user.gamesPlayed + 1)
              }
            }
          });
          
          processedResults.push({
            userId: participant.id,
            score: participant.score || 0,
            isWinner
          });
          console.log(`Updated stats for user ${participant.id}`);
        } catch (userError) {
          console.error(`Error processing user ${participant.id}:`, userError);
          // Continue with next participant
        }
      } catch (participantError) {
        console.error(`Error processing participant ${participant.id}:`, participantError);
        // Continue with next participant
      }
    }

    return NextResponse.json({
      message: "Quiz results processed successfully",
      processed: processedResults.length,
      roomId
    });
  } catch (error) {
    console.error("Error processing quiz results:", error);
    return NextResponse.json(
      { error: "Failed to process quiz results", details: String(error) },
      { status: 500 }
    );
  }
}

// Add a test endpoint to help debug the results API
export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = await params;
    
    // Check if the room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        participants: true
      }
    });
    
    if (!room) {
      return NextResponse.json(
        { error: "Room not found", roomId },
        { status: 404 }
      );
    }
    
    // Get the participants with their answers
    const roomParticipants = await prisma.roomParticipant.findMany({
      where: { roomId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            gamesPlayed: true,
            wins: true,
            totalPoints: true
          }
        }
      }
    });
    
    // Return room and participant info
    return NextResponse.json({
      message: "Room exists",
      roomId: room.id,
      status: room.status,
      participantCount: roomParticipants.length,
      // completedAt: room.completedAt,
      participants: roomParticipants.map(p => ({
        id: p.userId,
        name: p.user?.name || "Unknown",
        gamesPlayed: p.user?.gamesPlayed || 0,
        wins: p.user?.wins || 0,
        totalPoints: p.user?.totalPoints || 0
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get room info", details: String(error) },
      { status: 500 }
    );
  }
} 