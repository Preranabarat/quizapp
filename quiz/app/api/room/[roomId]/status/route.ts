import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = await params;
    const body = await req.json();
    const { status } = body;
    console.log(status,roomId);
    
    if (!roomId || !status) {
      return NextResponse.json(
        { error: "Room ID and status are required" },
        { status: 400 }
      );
    }

    // Update room status
    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: {
        status: status as "WAITING" | "FULL" | "IN_GAME" | "FINISHED",
        ...(status === "IN_GAME" ? { startTime: new Date() } : {}),
        ...(status === "FINISHED" ? { 
          endTime: new Date(),
          duration: Math.floor((new Date().getTime() - (await prisma.room.findUnique({ where: { id: roomId } }))!.startTime.getTime()) / 1000)
        } : {})
      },
    });

    return NextResponse.json({ message: "Room status updated", room: updatedRoom });
  } catch (error) {
    console.error("Error updating room status:", error);
    return NextResponse.json(
      { error: "Failed to update room status" },
      { status: 500 }
    );
  }
} 