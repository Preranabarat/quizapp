import dotenv from 'dotenv';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in your environment variables');
}

// Initialize the Google Generative AI
const genAI = new GoogleGenerativeAI(API_KEY);

interface McqQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctOption: number;
  timeLimit: number;
  difficulty: string;
}

export async function generateMcqs(topic: string, count: number, difficulty: string = 'MEDIUM'): Promise<McqQuestion[]> {
  const difficultyLevel = difficulty.toUpperCase();
  console.log(`Generating ${count} MCQs about ${topic} with ${difficultyLevel} difficulty using Gemini API`);

  // Try newer models first, then fall back to older ones if needed
  const modelNames = ["gemini-1.5-pro", "gemini-1.0-pro", "gemini-pro"];
  
  for (const modelName of modelNames) {
    try {
      console.log(`Trying model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      // Configure safety settings - setting to low to ensure creative question generation
      const generationConfig = {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
      };
      
      const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
        }
      ];
      
      const prompt = `Generate ${count} multiple choice questions about ${topic} with ${difficultyLevel} difficulty level. 
      Each question should have exactly 4 options with one correct answer.
      The format should be a JSON array with objects having this structure:
      {
        "questionText": "The question text",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "correctOption": 0-based index of the correct option (0, 1, 2, or 3)
      }
      Important: 
      - Return ONLY the JSON array with no additional text
      - Each question should match the ${difficultyLevel} difficulty level
      - The correct answer index must be accurate (0-3)
      - Do not include any explanations or introductions outside the JSON`;
      
      console.log(`Making request to Gemini API with model: ${modelName}`);
      
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
        safetySettings
      });
      
      const response = result.response;
      const responseText = response.text();
      
      console.log('Received response from Gemini API');
      
      // Extract JSON array from the response
      let jsonText = responseText;
      // Sometimes the API adds backticks to format as code
      if (jsonText.includes('```json')) {
        jsonText = jsonText.split('```json')[1].split('```')[0].trim();
      } else if (jsonText.includes('```')) {
        jsonText = jsonText.split('```')[1].split('```')[0].trim();
      }
      
      console.log('Parsing response...');
      const questions = JSON.parse(jsonText);
      
      console.log(`Successfully parsed ${questions.length} questions`);
      
      // Validate and format questions
      return questions.map((q: any, index: number) => ({
        id: `gemini-q${index + 1}`,
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctOption,
        timeLimit: 30, // Fixed time limit of 30 seconds
        difficulty: difficultyLevel // Include the difficulty level
      }));
    } catch (error) {
      console.error(`Error with model ${modelName}:`, error);
      // Continue to the next model if this one fails
    }
  }
  
  // If we get here, all models failed
  console.error('All Gemini API models failed');
  
  // Generate placeholder questions as fallback
  console.log(`Generating ${count} placeholder questions since Gemini API failed`);
  return generatePlaceholderQuestions(topic, count, difficultyLevel);
}

// Function to generate more interesting placeholder questions when the API fails
function generatePlaceholderQuestions(topic: string, count: number, difficulty: string): McqQuestion[] {
  const questions: McqQuestion[] = [];
  
  // Topics for different subjects
  const scienceQuestions = [
    {
      questionText: "What is the closest planet to the Sun?",
      options: ["Mercury", "Venus", "Earth", "Mars"],
      correctOption: 0
    },
    {
      questionText: "Which of the following is NOT a state of matter?",
      options: ["Energy", "Solid", "Liquid", "Gas"],
      correctOption: 0
    },
    {
      questionText: "What is the chemical symbol for water?",
      options: ["H2O", "CO2", "O2", "NaCl"],
      correctOption: 0
    },
    {
      questionText: "Which of these animals is a mammal?",
      options: ["Dolphin", "Shark", "Turtle", "Snake"],
      correctOption: 0
    },
    {
      questionText: "What does DNA stand for?",
      options: ["Deoxyribonucleic Acid", "Dual Nitrogen Atom", "Digital Numeric Array", "Diverse Natural Arrangement"],
      correctOption: 0
    }
  ];
  
  const generalQuestions = [
    {
      questionText: "Which of these countries is in Europe?",
      options: ["France", "Japan", "Brazil", "Australia"],
      correctOption: 0
    },
    {
      questionText: "What is the largest ocean on Earth?",
      options: ["Pacific Ocean", "Atlantic Ocean", "Indian Ocean", "Arctic Ocean"],
      correctOption: 0
    },
    {
      questionText: "Who wrote 'Romeo and Juliet'?",
      options: ["William Shakespeare", "Charles Dickens", "Jane Austen", "Leo Tolstoy"],
      correctOption: 0
    },
    {
      questionText: "What is the capital of the United States?",
      options: ["Washington D.C.", "New York", "Los Angeles", "Chicago"],
      correctOption: 0
    },
    {
      questionText: "How many sides does a hexagon have?",
      options: ["Six", "Five", "Seven", "Eight"],
      correctOption: 0
    }
  ];
  
  const historyQuestions = [
    {
      questionText: "In which year did World War II end?",
      options: ["1945", "1939", "1918", "1941"],
      correctOption: 0
    },
    {
      questionText: "Who was the first president of the United States?",
      options: ["George Washington", "Thomas Jefferson", "Abraham Lincoln", "John Adams"],
      correctOption: 0
    },
    {
      questionText: "Which ancient civilization built the pyramids at Giza?",
      options: ["Egyptians", "Romans", "Greeks", "Mayans"],
      correctOption: 0
    },
    {
      questionText: "The Renaissance period began in which country?",
      options: ["Italy", "France", "England", "Spain"],
      correctOption: 0
    },
    {
      questionText: "What was the name of the ship that the Pilgrims sailed to America in 1620?",
      options: ["Mayflower", "Santa Maria", "Discovery", "Victoria"],
      correctOption: 0
    }
  ];
  
  // Select questions based on topic
  let sourceQuestions = generalQuestions;
  if (topic.toLowerCase().includes("science")) {
    sourceQuestions = scienceQuestions;
  } else if (topic.toLowerCase().includes("history")) {
    sourceQuestions = historyQuestions;
  }
  
  // Create the placeholder questions
  for (let i = 0; i < count; i++) {
    const index = i % sourceQuestions.length;
    questions.push({
      id: `placeholder-q${i + 1}`,
      questionText: sourceQuestions[index].questionText,
      options: sourceQuestions[index].options,
      correctOption: sourceQuestions[index].correctOption,
      timeLimit: 30,
      difficulty: difficulty
    });
  }
  
  return questions;
} 