import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Declare context.params as a Promise that resolves to { roomId: string }
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ roomId: string }> }
) {
    const { roomId } = await context.params;

    try {
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        if (!room) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
        }

        const roomDetails = {
            id: room.id,
            currentParticipants: room.participants.length,
            maxParticipants: room.maxParticipants,
            participants: room.participants.map(p => ({
                id: p.user.id,
                username: p.user.name,
            })),
        };

        return NextResponse.json(roomDetails);
    } catch (error) {
        console.error("Error fetching room details:", error);
        return NextResponse.json(
            { error: "Error fetching room details" },
            { status: 500 }
        );
    }
}
