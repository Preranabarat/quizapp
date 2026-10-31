import { RoomType } from "../types/types";
import axios from "axios";
const BASE_URL = process.env.BASE_URL;
export async function createRoomData(roomId: string, roomData: RoomType) {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/room/create-room`,
      {
        roomId,
        roomData,
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.details || error.message);
    }
    throw error;
  }
}

export async function joinRoom(roomId: string, user: string) {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/room/join-room`,
      {
        roomId,
        user,
      }
    );
    console.log(response.data);
    return response.data;
  } catch (error) {
    // Forward credit-related errors properly
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data;

      // Check for credit error specifically
      if (errorData?.error === "Insufficient credits") {
        throw new Error("Insufficient credits: You need at least 1 credit to join a room");
      }

      // Pass through other error details
      throw new Error(errorData?.details || errorData?.error || error.message);
    }

    // For non-axios errors, re-throw as is
    throw error;
  }
}

export async function storeQuizResults(roomId: string, results: any) {
  try {
    console.log(`Storing quiz results for room ${roomId}`);

    // Map results to the format expected by the API
    const formattedResults = {
      results: {
        participants: results.participants.map((p: any) => ({
          id: p.id,
          username: p.username,
          score: p.score,
          totalQuestions: p.totalQuestions || results.participants[0]?.totalQuestions || 0
        })),
        winners: results.winners?.map((w: any) => ({
          id: w.id,
          username: w.username,
          score: w.score
        })) || []
      }
    };

    const response = await axios.post(
      `${BASE_URL}/api/room/${roomId}/results`,
      formattedResults,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`Quiz results stored successfully for room ${roomId}`);
    return response.data;
  } catch (error) {
    console.error("Error storing quiz results:", error);
    if (axios.isAxiosError(error)) {
      console.error('Axios Error Details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    }
    throw error;
  }
}
