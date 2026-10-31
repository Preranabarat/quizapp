"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSocketStore } from "@/store/socketStore";
import axios from "axios";
import WaitingCard from "@/app/components/ui/WaitingCard";
import QuizSession from "@/app/components/ui/QuizSession";
import { useSession } from "next-auth/react";

interface RoomDetails {
  id: string;
  topic: string;
  time: number;
  currentParticipants: number;
  maxParticipants: number;
  participants: Array<{
    id: string;
    username: string;
  }>;
  status: string;
}

const Page = () => {
  const params = useParams();
  const roomId = params?.roomId as string;
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useSocketStore();
  const [gameStarted, setGameStarted] = useState(false);
  const { data: session } = useSession();

  const fetchRoomDetails = async () => {
    if (!roomId) {
      setError("No room ID found");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.get(`/api/room/${roomId}`);
      setRoomDetails(response.data);
      
      // Check if game has already started
      if (response.data.status === "ACTIVE") {
        console.log("Room is already active, setting game started");
        setGameStarted(true);
      }
      
      console.log("Room details:", response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomDetails();

    if (!socket) {
      console.error("Socket not initialized");
      return;
    }

    // Listen for room updates
    socket.on("updatePlayers", (updatedRoom: RoomDetails) => {
      console.log("Received room update:", updatedRoom);
      setRoomDetails(updatedRoom);
      
      // If room status is ACTIVE, set game started
      if (updatedRoom.status === "ACTIVE") {
        console.log("Room status is now ACTIVE, setting game started");
        setGameStarted(true);
      }
    });

    // Listen for game start
    socket.on("gameStart", () => {
      console.log("Game started event received!");
      setGameStarted(true);
    });

    // Listen for room errors
    socket.on("roomError", (errorMessage: string) => {
      setError(errorMessage);
    });

    return () => {
      socket.off("updatePlayers");
      socket.off("gameStart");
      socket.off("roomError");
    };
  }, [roomId, socket]);

  // If room is full and we're not in game yet, check status
  useEffect(() => {
    if (roomDetails && 
        roomDetails.currentParticipants === roomDetails.maxParticipants && 
        !gameStarted) {
      console.log("Room is full but game not started, setting game started");
      setGameStarted(true);
    }
  }, [roomDetails, gameStarted]);

  if (isLoading) {
    return (
      <div className="h-screen bg-main text-white flex items-center justify-center">
        Loading room details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-main text-white flex items-center justify-center">
        {error}
      </div>
    );
  }

  if (!roomDetails) {
    return (
      <div className="h-screen bg-main text-white flex items-center justify-center">
        No room details available
      </div>
    );
  }

  return (
    <div className="h-screen bg-main text-white flex items-center justify-center">
      {gameStarted ? (
        <QuizSession roomId={roomDetails.id} />
      ) : (
        <WaitingCard
          roomId={roomDetails.id}
          currentPlayers={roomDetails.currentParticipants}
          maxPlayers={roomDetails.maxParticipants}
          participants={roomDetails.participants}
        />
      )}
    </div>
  );
};

export default Page;
