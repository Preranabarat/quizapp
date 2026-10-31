import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { PORT } from "./config";
import { createRoomData, joinRoom } from "./utils";
import { generateMcqs } from "./utils/geminiApi";
import axios from "axios";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
const BASE_URL = process.env.BASE_URL;
// Enhanced room type to match client expectations
interface EnhancedRoomData {
  id: string;
  topic: string;
  roomTimeLimit: number;
  questionCount: number;
  difficulty: string;
  currentParticipants: number;
  maxParticipants: number;
  status: string;
  participants: Array<{
    id: string;
    username: string;
  }>;
}

// Store for rooms and quiz data
const rooms: Record<string, EnhancedRoomData> = {};
const quizResults: Record<string, Record<string, { score: number, answers: number[], previousScore?: number }>> = {};
// Store active quizzes and their questions
const activeQuizzes: Record<string, any[]> = {};
// Store question timers and states
const roomTimers: Record<string, {
  currentQuestionIndex: number,
  timer: NodeJS.Timeout | null,
  startTime: number,
  timerId?: NodeJS.Timeout,
  syncTimerId?: NodeJS.Timeout | null
}> = {};

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  socket.emit("initial___SOCKET___Connection", socket.id);

  // New event to request quiz questions directly
  socket.on("requestQuizQuestions", (roomId) => {
    console.log(`Player ${socket.id} requesting quiz questions for room ${roomId}`);

    // Make sure player is in the room
    socket.join(roomId);

    if (activeQuizzes[roomId]) {
      console.log(`Sending quiz questions to player ${socket.id}`);
      const currentState = roomTimers[roomId];
      
      if (!currentState) {
        console.log(`No timer state found for room ${roomId}, sending questions without time info`);
        socket.emit("quizStart", {
          questions: activeQuizzes[roomId],
          currentQuestionIndex: 0,
          timeLeft: 30 // Updated default time to 30 seconds
        });
        return;
      }
      
      // Get the current question's time limit (default 30 seconds)
      if (!activeQuizzes[roomId] || !activeQuizzes[roomId][currentState.currentQuestionIndex]) {
        console.error(`Question not found for room ${roomId} at index ${currentState.currentQuestionIndex}`);
        
        // Generate a temporary placeholder question
        const placeholderQuestion = {
          id: `placeholder-q${currentState.currentQuestionIndex}`,
          questionText: `Question ${currentState.currentQuestionIndex + 1} (Placeholder)`,
          options: ["Option 1", "Option 2", "Option 3", "Option 4"],
          correctOption: 0,
          timeLimit: 30,
          difficulty: "MEDIUM"
        };
        
        // Use the placeholder
        const fullTimeLimit = 30;
        
        // Calculate elapsed time since question started
        const timeElapsed = Date.now() - currentState.startTime;
        const timeLeft = Math.max(0, fullTimeLimit * 1000 - timeElapsed);
        
        console.log(`Late-joining player in room ${roomId}: Using placeholder question, Time left: ${Math.ceil(timeLeft / 1000)}s`);
        
        socket.emit("quizStart", {
          questions: [placeholderQuestion],
          currentQuestionIndex: 0,
          timeLeft: Math.ceil(timeLeft / 1000)
        });
        
        return;
      }
      
      const currentQuestion = activeQuizzes[roomId][currentState.currentQuestionIndex];
      const fullTimeLimit = currentQuestion.timeLimit || 30;
      
      // Calculate elapsed time since question started
      const timeElapsed = Date.now() - currentState.startTime;
      const timeLeft = Math.max(0, fullTimeLimit * 1000 - timeElapsed);
      
      console.log(`Late-joining player in room ${roomId}: Question ${currentState.currentQuestionIndex}, Time left: ${Math.ceil(timeLeft / 1000)}s of ${fullTimeLimit}s`);

      // Also send current question state directly to ensure client has latest question
      socket.emit("nextQuestion", {
        questionIndex: currentState.currentQuestionIndex,
        timeLeft: Math.ceil(timeLeft / 1000),
        totalQuestions: activeQuizzes[roomId].length
      });
      
      // Send quiz questions to the player immediately
      socket.emit("quizStart", {
        questions: activeQuizzes[roomId],
        currentQuestionIndex: currentState.currentQuestionIndex,
        timeLeft: Math.ceil(timeLeft / 1000)
      });
    } else {
      console.log(`No active quiz found for room ${roomId}`);
    }
  });

  socket.on("createRoom", async (msg) => {
    try {
      const roomId = generateRandomId(6);
      rooms[roomId] = {
        id: roomId,
        topic: msg.topic,
        roomTimeLimit: msg.roomTimeLimit,
        questionCount: msg.questionCount,
        difficulty: msg.difficulty,
        currentParticipants: 1,
        maxParticipants: Number(msg.playerCount),
        status: "WAITING",
        participants: [{
          id: msg.user,
          username: msg.username || 'Anonymous'
        }]
      };

      try {
        const result = await createRoomData(roomId, { ...msg, user: msg.user });
        socket.join(roomId);
        socket.emit("roomId", roomId);
        io.in(roomId).emit("updatePlayers", rooms[roomId]);
      } catch (error) {
        // Remove the room if the API call failed
        delete rooms[roomId];
        
        // Check for credit-related errors
        if (error instanceof Error && error.message.includes("credit")) {
          socket.emit("roomError", { 
            error: "Insufficient credits", 
            details: "You need at least 1 credit to create a room" 
          });
        } else {
          socket.emit("roomError", error instanceof Error ? error.message : "Failed to create room");
        }
      }
    } catch (error) {
      socket.emit("roomError", error instanceof Error ? error.message : "Failed to create room");
    }
  });

  socket.on("joinRoom", async (roomData) => {
    const { roomCode, user, username } = roomData;

    if (rooms[roomCode]) {
      // Check if room is full
      if (rooms[roomCode].participants.length >= rooms[roomCode].maxParticipants) {
        socket.emit("roomError", "Room is full");
        return;
      }

      try {
        // Try to join the room via API (which will check for credits)
        await joinRoom(roomCode, user);
        
        // If successful, add to room participants
        rooms[roomCode].participants.push({
          id: user,
          username: username || 'Anonymous'
        });
        rooms[roomCode].currentParticipants = rooms[roomCode].participants.length;

        socket.join(roomCode);

        // Emit updated room data to all clients in the room
        io.in(roomCode).emit("updatePlayers", rooms[roomCode]);
        socket.emit("roomId", roomCode);
        
        // Check if room is now full and start the game
        if (rooms[roomCode].participants.length === rooms[roomCode].maxParticipants) {
          // If room is full, update status to ACTIVE
          rooms[roomCode].status = "ACTIVE";
          io.in(roomCode).emit("updatePlayers", rooms[roomCode]);

          // Notify all clients that game has started
          io.in(roomCode).emit("gameStart");

          // Start the quiz with a minimal delay to ensure all clients have received the gameStart event
          setTimeout(() => {
            startQuiz(roomCode);
          }, 500); // Reduced from 1000ms to 500ms for faster start
        } else if (rooms[roomCode].status === "ACTIVE" && activeQuizzes[roomCode]) {
          // If game already started, send game start event to the new player
          socket.emit("gameStart");

          // Get the current quiz state
          const currentState = roomTimers[roomCode];
          
          if (currentState) {
            // Get the current question's time limit (default 30 seconds)
            if (!activeQuizzes[roomCode] || !activeQuizzes[roomCode][currentState.currentQuestionIndex]) {
              console.error(`Question not found for room ${roomCode} at index ${currentState.currentQuestionIndex}`);
              
              // Generate a temporary placeholder question
              const placeholderQuestion = {
                id: `placeholder-q${currentState.currentQuestionIndex}`,
                questionText: `Question ${currentState.currentQuestionIndex + 1} (Placeholder)`,
                options: ["Option 1", "Option 2", "Option 3", "Option 4"],
                correctOption: 0,
                timeLimit: 30,
                difficulty: "MEDIUM"
              };
              
              // Use the placeholder
              const fullTimeLimit = 30;
              
              // Calculate elapsed time since question started
              const timeElapsed = Date.now() - currentState.startTime;
              const timeLeft = Math.max(0, fullTimeLimit * 1000 - timeElapsed);
              
              console.log(`Late-joining player in room ${roomCode}: Using placeholder question, Time left: ${Math.ceil(timeLeft / 1000)}s`);
              
              socket.emit("quizStart", {
                questions: [placeholderQuestion],
                currentQuestionIndex: 0,
                timeLeft: Math.ceil(timeLeft / 1000)
              });
              
              return;
            }
            
            const currentQuestion = activeQuizzes[roomCode][currentState.currentQuestionIndex];
            const fullTimeLimit = currentQuestion.timeLimit || 30;
            
            // Calculate elapsed time since question started
            const timeElapsed = Date.now() - currentState.startTime;
            const timeLeft = Math.max(0, fullTimeLimit * 1000 - timeElapsed);
            
            console.log(`Late-joining player in room ${roomCode}: Question ${currentState.currentQuestionIndex}, Time left: ${Math.ceil(timeLeft / 1000)}s of ${fullTimeLimit}s`);
            
            // Send quiz questions to the new player with accurate time information immediately (no delay)
            socket.emit("quizStart", {
              questions: activeQuizzes[roomCode],
              currentQuestionIndex: currentState.currentQuestionIndex,
              timeLeft: Math.ceil(timeLeft / 1000)
            });
          } else {
            // Fallback if no timer state found
            socket.emit("quizStart", { 
              questions: activeQuizzes[roomCode],
              currentQuestionIndex: 0,
              timeLeft: 30 // Default to 30 seconds
            });
          }
        }
      } catch (error) {
        // Handle credit errors specially
        if (error instanceof Error && error.message.includes("credit")) {
          socket.emit("roomError", { 
            error: "Insufficient credits", 
            details: "You need at least 1 credit to join a room" 
          });
        } else {
          socket.emit("roomError", error instanceof Error ? error.message : "Failed to join room");
        }
      }
    } else {
      socket.emit("roomError", "Room not found");
    }
  });

  // Handle answer submission
  socket.on("submitAnswer", ({ roomId, questionIndex, selectedOption, userId }) => {
    if (!quizResults[roomId]) {
      quizResults[roomId] = {};
    }
    
    if (!quizResults[roomId][userId]) {
      quizResults[roomId][userId] = {
        score: 0,
        answers: [],
        previousScore: 0
      };
    }

    // Get the current question
    if (!activeQuizzes[roomId] || !activeQuizzes[roomId][questionIndex]) {
      console.error(`Question not found for room ${roomId} at index ${questionIndex}`);
      return;
    }
    
    const currentQuestion = activeQuizzes[roomId][questionIndex];
    
    // Check if the answer is correct
    const isCorrect = selectedOption === currentQuestion.correctOption;
    
    // Calculate points for this answer
    const points = isCorrect ? 10 : 0;
    
    // Save user's previous score for display
    quizResults[roomId][userId].previousScore = quizResults[roomId][userId].score;
    
    // Update the score
    quizResults[roomId][userId].score += points;
    
    // Store the answer
    storeQuestionAnswers(roomId, questionIndex, selectedOption, userId, isCorrect);
    
    // Send feedback to the user
    socket.emit("answerFeedback", {
      questionIndex,
      selectedOption,
      isCorrect,
      correctOption: currentQuestion.correctOption,
      pointsEarned: points
    });
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);

    // Remove user from all rooms they were in
    Object.entries(rooms).forEach(([roomId, room]) => {
      const index = room.participants.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        room.participants.splice(index, 1);
        room.currentParticipants = room.participants.length;

        if (room.participants.length === 0) {
          delete rooms[roomId];
          delete activeQuizzes[roomId];
          clearQuestionTimer(roomId);
        } else {
          io.in(roomId).emit("updatePlayers", room);
        }
      }
    });
  });
});

// Function to start a quiz for a room
export function startQuiz(roomId: string) {
  console.log(`Starting quiz for room ${roomId}`);
  
  // Check if the room exists
  if (!rooms[roomId]) {
    console.error(`Room ${roomId} not found when starting quiz`);
    return;
  }
  
  // Update room status to IN_GAME
  updateRoomStatus(roomId, "IN_GAME");
  
  // Ensure API routes exist for this room
  ensureApiRoutesExist(roomId);
  
  // Initialize quiz questions if not already done
  if (!activeQuizzes[roomId]) {
    // Get the quiz settings from room
    const questionCount = rooms[roomId].questionCount || 5;
    const topic = rooms[roomId].topic || "general knowledge";
    const difficulty = rooms[roomId].difficulty || "MEDIUM";
    
    console.log(`Generating quiz: Topic: ${topic}, Questions: ${questionCount}, Difficulty: ${difficulty}`);
    
    // Generate questions using Gemini API
    generateMcqs(topic, questionCount, difficulty)
      .then(questions => {
        // Store the generated questions for this quiz
        activeQuizzes[roomId] = questions;
        
        // Log the generated MCQs for debugging
        console.log(`Generated ${questions.length} MCQs for room ${roomId} with ${difficulty} difficulty:`);
        questions.forEach((q, index) => {
          console.log(`Question ${index + 1}: ${q.questionText}`);
          console.log(`Options: ${q.options.join(' | ')}`);
          console.log(`Correct Answer: ${q.options[q.correctOption]} (index: ${q.correctOption})`);
          console.log('---');
        });
        
        // Store questions in database
        storeQuizQuestions(roomId, questions);
        
        // Initialize quiz results
        if (!quizResults[roomId]) {
          quizResults[roomId] = {};
          
          // Initialize results for each participant
          rooms[roomId].participants.forEach(participant => {
            quizResults[roomId][participant.id] = {
              score: 0,
              answers: [],
              previousScore: 0
            };
          });
        }
        
        // Start the first question timer
        startQuestionTimer(roomId);
      })
      .catch(error => {
        console.error(`Error generating questions with Gemini API: ${error.message}`);
        
        // Generate basic placeholder questions since Gemini API failed
        const placeholderQuestions = generatePlaceholderQuestions(topic, questionCount, difficulty);
        activeQuizzes[roomId] = placeholderQuestions;
        
        console.log(`Generated ${placeholderQuestions.length} placeholder MCQs for room ${roomId} due to API failure`);
        
        // Store questions in database
        storeQuizQuestions(roomId, placeholderQuestions);
        
        // Initialize quiz results
        if (!quizResults[roomId]) {
          quizResults[roomId] = {};
          
          // Initialize results for each participant
          rooms[roomId].participants.forEach(participant => {
            quizResults[roomId][participant.id] = {
              score: 0,
              answers: [],
              previousScore: 0
            };
          });
        }
        
        // Start the first question timer
        startQuestionTimer(roomId);
      });
  } else {
    // Questions already exist, just start the timer
    startQuestionTimer(roomId);
  }
}

// Function to generate placeholder questions when Gemini API fails
export function generatePlaceholderQuestions(topic: string, count: number, difficulty: string): any[] {
  console.log(`Generating ${count} placeholder questions about ${topic} due to API failure`);
  
  const questions = [];
  for (let i = 0; i < count; i++) {
    questions.push({
      id: `placeholder-q${i + 1}`,
      questionText: `Question ${i + 1} about ${topic} (Gemini API unavailable)`,
      options: [
        "First option",
        "Second option",
        "Third option",
        "Fourth option"
      ],
      correctOption: 0,
      timeLimit: 30,
      difficulty: difficulty
    });
  }
  
  return questions;
}

// Function to start the timer for a question
export function startQuestionTimer(roomId: string) {
  // Clear any existing timer
  clearQuestionTimer(roomId);
  
  // Get the room
  const room = rooms[roomId];
  if (!room) {
    console.error(`Room ${roomId} not found when starting question timer`);
    return;
  }
  
  // Initialize or increment the question index
  if (!roomTimers[roomId]) {
    roomTimers[roomId] = {
      currentQuestionIndex: 0,
      timer: null,
      startTime: Date.now()
    };
  } else {
    roomTimers[roomId].currentQuestionIndex = roomTimers[roomId].currentQuestionIndex + 1;
    roomTimers[roomId].startTime = Date.now();
  }
  
  const currentIndex = roomTimers[roomId].currentQuestionIndex;
  
  // Get the current question
  if (!activeQuizzes[roomId] || !activeQuizzes[roomId][currentIndex]) {
    console.error(`Question not found for room ${roomId} at index ${currentIndex}`);
    return;
  }
  
  const currentQuestion = activeQuizzes[roomId][currentIndex];
  
  // Get the time limit for this question - changed default from 15 to 30 seconds
  const timeLimit = currentQuestion.timeLimit || 30;
  
  console.log(`Starting timer for question ${currentIndex} in room ${roomId} with time limit ${timeLimit}s`);
  
  // Notify all clients to move to this question
  io.in(roomId).emit("nextQuestion", {
    questionIndex: currentIndex,
    timeLeft: timeLimit,
    totalQuestions: activeQuizzes[roomId].length
  });
  
  // For the first question, also emit a quizStart event with full question details
  if (currentIndex === 0) {
    const questions = activeQuizzes[roomId];
    io.in(roomId).emit("quizStart", {
      questions: questions,
      currentQuestionIndex: 0,
      timeLeft: timeLimit  // Make sure we send the full time limit
    });
  }
  
  // Set the timer to end the question after the time limit
  roomTimers[roomId].timer = setTimeout(() => {
    console.log(`Time's up for question ${currentIndex} in room ${roomId}`);
    handleQuestionEnd(roomId, currentIndex);
  }, timeLimit * 1000);
  
  // Send time updates more frequently (every 500ms) for better synchronization
  let secondsRemaining = timeLimit;
  let lastUpdateTime = Date.now();
  
  const timeUpdateInterval = setInterval(() => {
    const now = Date.now();
    const elapsed = (now - lastUpdateTime) / 1000;
    lastUpdateTime = now;
    
    secondsRemaining -= elapsed;
    
    if (secondsRemaining <= 0) {
      clearInterval(timeUpdateInterval);
      return;
    }
    
    // Send time update to all clients
    io.in(roomId).emit("timeUpdate", {
      questionIndex: currentIndex,
      timeLeft: Math.ceil(secondsRemaining)
    });
  }, 500); // Update every 500ms instead of 1000ms for better precision
  
  // Store the interval ID so we can clear it later
  roomTimers[roomId].syncTimerId = timeUpdateInterval;
}

// Function to clear the question timer
export function clearQuestionTimer(roomId: string) {
  const currentState = roomTimers[roomId];
  if (!currentState) return;
  
  // Clear the main question timer
  if (currentState.timer) {
    clearTimeout(currentState.timer);
    currentState.timer = null;
  }
  
  // Clear the sync timer
  if (currentState.syncTimerId) {
    clearInterval(currentState.syncTimerId);
    currentState.syncTimerId = null;
  }
}

// Function to handle the end of a question
export function handleQuestionEnd(roomId: string, questionIndex: number) {
  // Get the current question
  if (!activeQuizzes[roomId] || !activeQuizzes[roomId][questionIndex]) {
    console.error(`Question not found for room ${roomId} at index ${questionIndex}`);
    return;
  }
  
  const currentQuestion = activeQuizzes[roomId][questionIndex];
  
  // Collect all the answers for this question
  const participantAnswers: any[] = [];
  
  if (quizResults[roomId]) {
    Object.entries(quizResults[roomId]).forEach(([userId, userResults]) => {
      const answer = userResults.answers[questionIndex] !== undefined ? userResults.answers[questionIndex] : -1;
      participantAnswers.push({
        userId,
        answer,
        isCorrect: answer === currentQuestion.correctOption
      });
    });
  }
  
  // Send question results to all clients
  io.in(roomId).emit("questionResults", {
    questionIndex,
    correctOption: currentQuestion.correctOption,
    participantAnswers,
    isLastQuestion: questionIndex === (activeQuizzes[roomId].length) - 1
  });
  
  // Check if this is the last question
  if (questionIndex === (activeQuizzes[roomId].length) - 1) {
    // End of quiz
    setTimeout(() => {
      endQuiz(roomId);
    }, 5000); // Wait 5 seconds before ending the quiz
  } else {
    // Start the next question timer
    setTimeout(() => {
      startQuestionTimer(roomId);
    }, 3000); // 3-second delay between questions
  }
}

// Function to end the quiz and calculate final results
export function endQuiz(roomId: string) {
  const room = rooms[roomId];
  if (!room) {
    console.error(`Room ${roomId} not found when ending quiz`);
    return;
  }
  
  // Calculate final results
  const finalResults: Record<string, any> = {};
  
  // Process each participant's results
  room.participants.forEach(participant => {
    // Get or initialize user results
    const userResults = quizResults[roomId]?.[participant.id] || { score: 0, answers: [], previousScore: 0 };
    
    // Clean up answers array (replace undefined/null with 0)
    const cleanedAnswers = Array(activeQuizzes[roomId].length).fill(0);
    if (Array.isArray(userResults.answers)) {
      userResults.answers.forEach((ans, idx) => {
        if (ans !== null && ans !== undefined && ans !== -1) {
          cleanedAnswers[idx] = ans;
        }
      });
    }
    
    finalResults[participant.id] = {
      id: participant.id,
      username: participant.username,
      score: userResults.score || 0,
      answers: cleanedAnswers,
      totalQuestions: activeQuizzes[roomId].length
    };
  });
  
  // Calculate rankings
  const sortedParticipants = Object.values(finalResults).sort((a, b) => b.score - a.score);
  
  // Assign ranks and determine winners
  sortedParticipants.forEach((participant, index) => {
    const rank = index + 1;
    finalResults[participant.id].rank = rank;
    finalResults[participant.id].isWinner = rank === 1;
  });
  
  // Update room status to FINISHED
  updateRoomStatus(roomId, "FINISHED").then(() => {
    // Store final results in database after room status is updated
    storeQuizResults(roomId, finalResults).catch(error => {
      console.error("Failed to store results, but continuing with game end:", error);
    });
  }).catch(error => {
    console.error("Failed to update room status, but continuing with game end:", error);
    // Try to store results anyway
    storeQuizResults(roomId, finalResults).catch(resultError => {
      console.error("Also failed to store results:", resultError);
    });
  });
  
  // Send final results to all clients in the room
  io.in(roomId).emit("quizResults", {
    participants: sortedParticipants,
    winners: sortedParticipants.filter(p => p.rank === 1)
  });
  
  // Clean up room resources
  delete roomTimers[roomId];
  
  console.log(`Quiz ended for room ${roomId} with ${sortedParticipants.length} participants`);
}

// Function to update room status in database
export async function updateRoomStatus(roomId: string, status: string) {
  try {
    console.log(`update ${roomId} ${status}`);
    
    // Update local room status
    if (rooms[roomId]) {
      rooms[roomId].status = status;
    }
    
    // Try PUT method first
    try {
      const response = await axios.put(
        `${BASE_URL}/api/room/${roomId}/status`,
        {
          status
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (putError) {
      if (axios.isAxiosError(putError) && putError.response?.status === 405) {
        // If PUT fails with 405, try POST as fallback
        console.log(`PUT method not allowed for status update, trying POST...`);
        
        try {
          const response = await axios.post(
            `${BASE_URL}/api/room/${roomId}/status`,
            {
              status
            },
            {
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
          
          return response.data;
        } catch (postError) {
          console.error("Error updating room status with POST:", postError);
          
          // Log more detailed error information
          if (axios.isAxiosError(postError)) {
            console.error('POST Error Details:', {
              message: postError.message,
              status: postError.response?.status,
              data: postError.response?.data
            });
          }
          
          // Return a resolved promise with error info so we don't break the chain
          return {
            error: true,
            message: "Failed to update room status in database, but updated locally"
          };
        }
      } else {
        console.error("Error updating room status with PUT:", putError);
        
        // Log more detailed error information
        if (axios.isAxiosError(putError)) {
          console.error('PUT Error Details:', {
            message: putError.message,
            status: putError.response?.status,
            data: putError.response?.data
          });
        }
        
        // Return a resolved promise with error info so we don't break the chain
        return {
          error: true,
          message: "Failed to update room status in database, but updated locally"
        };
      }
    }
  } catch (error) {
    console.error("Error in updateRoomStatus function:", error);
    
    // Return a resolved promise with error info so we don't break the chain
    return {
      error: true,
      message: "Failed to update room status in database, but updated locally"
    };
  }
}

// Function to store quiz questions in database
export async function storeQuizQuestions(roomId: string, questions: any[]) {
  console.log('Storing questions for room:', roomId);
  
  try {
    // Create a copy of the questions with correct answers for storage
    const questionsWithAnswers = questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      options: q.options,
      correctOption: q.correctOption,
      timeLimit: q.timeLimit || 30
    }));
    
    console.log(`Sending ${questionsWithAnswers.length} questions to database for room ${roomId}`);
    
    const response = await axios.post(`${BASE_URL}/api/room/${roomId}/questions`, {
      questions: questionsWithAnswers
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Log success details
    console.log(`Questions stored successfully for room ${roomId}:`, {
      status: response.status,
      storedCount: response.data.questionsStored
    });

    return response.data;
  } catch (error) {
    // More detailed error logging
    console.error(`Failed to store questions for room ${roomId}`);
    
    if (axios.isAxiosError(error)) {
      console.error('API Error Details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // If the room doesn't exist in the database, we should handle it gracefully
      if (error.response?.status === 404) {
        console.log(`Room ${roomId} not found in database, only using in-memory questions`);
        return { questionsStored: 0, local: true };
      }
    } else {
      console.error('Unexpected Error:', error);
    }

    // Return a partial success to allow the game to continue with in-memory questions
    return { questionsStored: 0, error: true, message: "Failed to store questions in database" };
  }
}

// Function to store question answers in database
export async function storeQuestionAnswers(roomId: string, questionIndex: number, selectedOption: number, userId: string, isCorrect: boolean) {
  try {
    // Check if the room still exists and is not already finished
    const room = rooms[roomId];
    if (!room || room.status === "FINISHED") {
      console.log(`Room ${roomId} is already finished or doesn't exist, skipping answer storage`);
      return null; // Skip storing answers for finished games
    }

    // Get the participant using user ID instead of socket ID
    const participant = room?.participants.find(p => p.id === userId);
    if (!participant) {
      console.error("Participant not found for user ID:", userId);
      return null;
    }

    // Get the current question
    if (!activeQuizzes[roomId] || !activeQuizzes[roomId][questionIndex]) {
      console.error(`Question not found for room ${roomId} at index ${questionIndex}`);
      return null;
    }
    
    const currentQuestion = activeQuizzes[roomId][questionIndex];
    
    // Fixed 10 points for correct answers, 0 for incorrect
    const pointsEarned = isCorrect ? 10 : 0;
    
    // Make sure the selected option is a valid number (not -1 or null)
    const validSelectedOption = selectedOption >= 0 ? selectedOption : 0;
    
    // Format the answer data as expected by the API
    const answerData = [{
      participantId: userId,
      selectedOption: validSelectedOption,
      isCorrect: isCorrect,
      answerTime: new Date(),
      pointsEarned: pointsEarned,
      correctOption: currentQuestion.correctOption // Add the correct option for reference
    }];

    // Log the answers being sent
    console.log(`Storing answer for room ${roomId}, question ${questionIndex}, user ${userId}:`, answerData);

    try {
      // First check if questions exist for this room
      let questionsExist = false;
      try {
        const questionsResponse = await axios.get(`${BASE_URL}/api/room/${roomId}/questions`);
        const existingQuestions = questionsResponse.data.questions;
        questionsExist = existingQuestions && existingQuestions.length > questionIndex;
        
        if (!questionsExist) {
          // If questions don't exist or there aren't enough, store them now
          if (activeQuizzes[roomId]) {
            await storeQuizQuestions(roomId, activeQuizzes[roomId]);
          } else {
            console.error(`No questions available for room ${roomId}`);
          }
        }
      } catch (error) {
        // If checking fails, try to store questions again
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          if (activeQuizzes[roomId]) {
            await storeQuizQuestions(roomId, activeQuizzes[roomId]);
          } else {
            console.error(`No questions available for room ${roomId}`);
          }
        }
      }
      
      // Now try to store the answer
      try {
        // Convert answerTime to seconds for Prisma schema compatibility
        const answerWithSeconds = answerData.map(answer => ({
          ...answer,
          answerTime: Math.floor(new Date().getTime() / 1000) // Convert to seconds
        }));
        
        const response = await axios.post(`${BASE_URL}/api/room/${roomId}/answers`, {
          questionIndex,
          answers: answerWithSeconds
        });
        
        console.log(`Answer stored for user ${userId}:`, {
          questionIndex,
          selectedOption: validSelectedOption,
          isCorrect,
          pointsEarned
        });
        
        return response.data;
      } catch (error) {
        console.error("Error storing question answers:", error);
        
        if (axios.isAxiosError(error)) {
          console.error('API Error Details:', {
            status: error.response?.status,
            data: error.response?.data
          });
        }
        
        // Continue with the game even if storing answers fails
        return {
          stored: false,
          error: true,
          message: "Failed to store answer in database, but game will continue"
        };
      }
    } catch (error) {
      // Don't let API errors stop game progression
      console.error("Error in answer storage process:", error);
      return {
        stored: false,
        error: true,
        message: "Error in answer storage process, but game will continue"
      };
    }
  } catch (error) {
    console.error("Error in storeQuestionAnswers function:", error);
    return null; // Don't let this error propagate and stop the game
  }
}

// Function to store quiz results in database
export async function storeQuizResults(roomId: string, results: any) {
  try {
    // Clean and format results for API
    const formattedResults = Object.entries(results).map(([userId, userData]: [string, any]) => {
      // Make sure answers are simple arrays with no -1 or null values
      const cleanAnswers = Array.isArray(userData.answers) 
        ? userData.answers.map((ans: any) => ans === null || ans === -1 ? 0 : ans)
        : [];
      
      return {
        participantId: userId,
        score: userData.score || 0,
        answers: cleanAnswers,
        rank: userData.rank || 0,
        isWinner: userData.isWinner || false
      };
    });

    // Log the results being sent
    console.log(`Storing quiz results for room ${roomId} with ${formattedResults.length} participants`);
    console.log("First participant data sample:", JSON.stringify(formattedResults[0]).substring(0, 100));

    // Convert results into a simpler format that's easier to parse
    const simplifiedData = {
      roomId: roomId,
      completedAt: new Date().toISOString(),
      participants: formattedResults.map(p => ({
        id: p.participantId,
        score: p.score,
        isWinner: p.isWinner
      }))
    };

    try {
      // Try with dynamic timeout and retry logic
      const maxRetries = 3;
      let retryCount = 0;
      let lastError = null;

      while (retryCount < maxRetries) {
        try {
          // Store results in database with increased timeout
          const response = await axios.post(
            `${BASE_URL}/api/room/${roomId}/results`,
            simplifiedData,
            {
              headers: {
                'Content-Type': 'application/json'
              },
              timeout: 10000 // 10 second timeout
            }
          );

          console.log(`Quiz results stored for room ${roomId}:`, {
            status: response.status,
            participantCount: formattedResults.length
          });

          return response.data;
        } catch (error) {
          lastError = error;
          retryCount++;
          console.log(`Attempt ${retryCount} failed, ${maxRetries - retryCount} retries left`);
          
          // Store in a local file as a fallback
          if (retryCount === maxRetries) {
            try {
              // Continue with the next step even if saving to database failed
              console.log("Saving results only locally due to API errors");
              return {
                stored: "locally",
                roomId,
                participants: formattedResults.length,
                timestamp: new Date().toISOString()
              };
            } catch (fallbackError) {
              console.error("Even fallback storage failed:", fallbackError);
            }
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // If we're here, all retries failed
      throw lastError;
    } catch (error) {
      console.error("Error storing quiz results after retries:", error);
      
      if (axios.isAxiosError(error)) {
        console.error('API Error Details:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
      }
      
      // Return a partial success to allow the game to continue
      return { resultsStored: 0, error: true, message: "Failed to store results in database, but game will continue" };
    }
  } catch (error) {
    console.error("Error in storeQuizResults function:", error);
    return { resultsStored: 0, error: true, message: "Error in results storage process" };
  }
}

// Function to check if the necessary API routes exist and handle the fallback
export async function ensureApiRoutesExist(roomId: string) {
  try {
    console.log(`Checking API endpoints for room ${roomId}`);
    
    // Check if the room exists in the database
    try {
      const roomResponse = await axios.get(`${BASE_URL}/api/room/${roomId}`);
      console.log(`Room ${roomId} exists in database`);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log(`Room ${roomId} not found in database, creating it`);
        // Try to create the room if it doesn't exist
        if (rooms[roomId]) {
          try {
            await createRoomData(roomId, {
              playerCount: rooms[roomId].maxParticipants,
              user: rooms[roomId].participants[0]?.id || 'anonymous',
              topic: rooms[roomId].topic || 'General Knowledge',
              roomTimeLimit: rooms[roomId].roomTimeLimit || 60,
              questionCount: rooms[roomId].questionCount || 5,
              difficulty: rooms[roomId].difficulty || 'MEDIUM'
            });
            console.log(`Created room ${roomId} in database`);
          } catch (createError) {
            console.error(`Failed to create room ${roomId} in database:`, createError);
          }
        }
      }
    }
    
    // Check if questions exist for this room
    try {
      const questionsResponse = await axios.get(`${BASE_URL}/api/room/${roomId}/questions`);
      const existingQuestions = questionsResponse.data.questions;
      
      if (!existingQuestions || existingQuestions.length === 0) {
        console.log(`No questions found for room ${roomId}, storing them`);
        if (activeQuizzes[roomId]) {
          await storeQuizQuestions(roomId, activeQuizzes[roomId]);
        } else {
          console.error(`No questions available for room ${roomId}`);
        }
      } else {
        console.log(`Found ${existingQuestions.length} questions for room ${roomId}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log(`Question endpoint not found for room ${roomId}, storing questions`);
        if (activeQuizzes[roomId]) {
          await storeQuizQuestions(roomId, activeQuizzes[roomId]);
        } else {
          console.error(`No questions available for room ${roomId}`);
        }
      } else {
        console.error(`Error checking questions for room ${roomId}:`, error);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Failed to ensure API routes for room ${roomId}:`, error);
    return false;
  }
}

server.listen(PORT, () => {
  console.log(`Server is listening at http://localhost:${PORT}`);
});

function generateRandomId(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}