/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerateContentResponse,
} from "@google/generative-ai";

interface DialogueResponse {
  text: string;
  error?: string;
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Keep track of requests in a rolling window
const requestTimes: number[] = [];
const RATE_LIMIT = 60; // requests per minute
const WINDOW_MS = 60 * 1000; // 1 minute in milliseconds
const BUFFER_FACTOR = 0.8; // Only use 80% of our rate limit
const EFFECTIVE_RATE_LIMIT = Math.floor(RATE_LIMIT * BUFFER_FACTOR);
const MIN_REQUEST_INTERVAL = Math.ceil(WINDOW_MS / EFFECTIVE_RATE_LIMIT);

// Simple delay function
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Clean old requests from the window
const cleanRequestWindow = () => {
  const now = Date.now();
  while (requestTimes.length > 0 && requestTimes[0] < now - WINDOW_MS) {
    requestTimes.shift();
  }
};

// Check if we can make a request
const canMakeRequest = () => {
  cleanRequestWindow();
  return requestTimes.length < EFFECTIVE_RATE_LIMIT;
};

// Calculate wait time if we're rate limited
const getWaitTime = () => {
  const now = Date.now();
  cleanRequestWindow();

  if (requestTimes.length === 0) return 0;

  // If we've hit the effective rate limit, calculate when we can make the next request
  if (requestTimes.length >= EFFECTIVE_RATE_LIMIT) {
    const oldestRequest = requestTimes[0];
    return oldestRequest + WINDOW_MS - now + 1000; // Add 1 second buffer
  }

  // Ensure minimum interval between requests
  const lastRequest = requestTimes[requestTimes.length - 1];
  const timeSinceLastRequest = now - lastRequest;
  return Math.max(0, MIN_REQUEST_INTERVAL - timeSinceLastRequest + 100); // Add 100ms buffer
};

// Exponential backoff for retries
const getRetryDelay = (retryCount: number) => {
  return Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 second delay
};

export const generateResponse = async (
  prompt: string,
  persona: string,
  signal?: AbortSignal,
  retryCount = 0
): Promise<DialogueResponse> => {
  try {
    // Check if already aborted
    if (signal?.aborted) {
      return {
        text: "",
        error: "Generation cancelled",
      };
    }

    // Check rate limit
    if (!canMakeRequest()) {
      const waitTime = getWaitTime();
      await delay(waitTime);
    }

    // Check if aborted during wait
    if (signal?.aborted) {
      return {
        text: "",
        error: "Generation cancelled",
      };
    }

    // Record this request
    const now = Date.now();
    requestTimes.push(now);

    try {
      // Configure the chat
      const systemPrompt = `You are a highly professional AI with a ${persona} perspective, known for critical thinking and innovative problem-solving. Engage in philosophical dialogue with analytical depth while maintaining intellectual rigor. Your responses should be concise (maximum 3-4 sentences), demonstrate clear logical reasoning, and offer unique insights that challenge conventional thinking. Draw from your ${persona} viewpoint to provide novel perspectives on complex issues.`;

      // Configure generation config with safety settings
      const generationConfig = {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      };

      // Configure safety settings
      const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ];

      // Send messages in proper format
      const result = await model.generateContent({
        contents: [
          { role: "user", parts: [{ text: systemPrompt }, { text: prompt }] },
        ],
        generationConfig,
        safetySettings,
      });

      const response = await result.response;
      const text = response.text();

      // Check if aborted after response
      if (signal?.aborted) {
        return {
          text: "",
          error: "Generation cancelled",
        };
      }

      if (!text) {
        throw new Error("Empty response from Gemini");
      }

      return { text };
    } catch (error) {
      // Remove the failed request from our window
      const index = requestTimes.indexOf(now);
      if (index > -1) {
        requestTimes.splice(index, 1);
      }
      throw error;
    }
  } catch (error) {
    // Handle abort error first
    if (signal?.aborted) {
      return {
        text: "",
        error: "Generation cancelled",
      };
    }

    // Handle retryable errors
    const isRetryableError =
      error instanceof Error &&
      (error.message.includes("rate") || // Rate limit errors
        error.message.includes("timeout") || // Timeouts
        error.message.includes("network") || // Network errors
        error.message.includes("internal")); // Internal server errors

    if (isRetryableError && retryCount < 5) {
      const backoffDelay = getRetryDelay(retryCount);
      await delay(backoffDelay);
      return generateResponse(prompt, persona, signal, retryCount + 1);
    }

    // Only log non-retryable errors
    if (!isRetryableError) {
      console.error("Error generating response:", error);
    }

    // Return appropriate error message
    let errorMessage = "Failed to generate response. Please try again.";
    if (error instanceof Error) {
      if (error.message.includes("rate")) {
        errorMessage =
          "Too many requests. Please wait a moment before trying again.";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Request timed out. Retrying...";
      }
    }

    return {
      text: "",
      error: errorMessage,
    };
  }
};
