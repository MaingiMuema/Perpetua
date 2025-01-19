/* eslint-disable @typescript-eslint/no-unused-vars */
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerateContentResponse } from '@google/generative-ai';

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
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
        text: '',
        error: 'Generation cancelled'
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
        text: '',
        error: 'Generation cancelled'
      };
    }

    // Record this request
    const now = Date.now();
    requestTimes.push(now);

    try {
      // Create chat history with persona and prompt
      const systemPrompt = `You are an AI with a ${persona} personality engaging in a philosophical dialogue. Keep responses concise (maximum 3-4 sentences) and thought-provoking. Your response should naturally flow from the previous message or prompt while maintaining your ${persona} perspective.`;
      
      const result = await model.generateContent([
        { text: systemPrompt },
        { text: prompt }
      ]);

      const response = await result.response;
      const text = response.text();

      // Check if aborted after response
      if (signal?.aborted) {
        return {
          text: '',
          error: 'Generation cancelled'
        };
      }

      if (!text) {
        throw new Error('Empty response from Gemini');
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
        text: '',
        error: 'Generation cancelled'
      };
    }

    // Handle retryable errors
    const isRetryableError = 
      error instanceof Error && (
        error.message.includes('rate') || // Rate limit errors
        error.message.includes('timeout') || // Timeouts
        error.message.includes('network') || // Network errors
        error.message.includes('internal') // Internal server errors
      );

    if (isRetryableError && retryCount < 5) {
      const backoffDelay = getRetryDelay(retryCount);
      await delay(backoffDelay);
      return generateResponse(prompt, persona, signal, retryCount + 1);
    }

    // Only log non-retryable errors
    if (!isRetryableError) {
      console.error('Error generating response:', error);
    }

    // Return appropriate error message
    let errorMessage = 'Failed to generate response. Please try again.';
    if (error instanceof Error) {
      if (error.message.includes('rate')) {
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Retrying...';
      }
    }

    return {
      text: '',
      error: errorMessage
    };
  }
};
