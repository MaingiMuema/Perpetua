import axios, { AxiosError } from 'axios';

interface DialogueResponse {
  text: string;
  error?: string;
}

// Keep track of requests in a rolling window
const requestTimes: number[] = [];
const RATE_LIMIT = 60; // requests per minute
const WINDOW_MS = 60 * 1000; // 1 minute in milliseconds
// Be more conservative with request timing to prevent rate limit issues
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
      console.log(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
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
      const response = await axios.post(
        'https://api.hyperbolic.xyz/v1/chat/completions',
        {
          model: 'deepseek-ai/DeepSeek-V3',
          messages: [
            {
              role: 'system',
              content: `You are an AI with a ${persona} personality engaging in a philosophical dialogue. Keep responses concise and thought-provoking.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 512,
          temperature: 0.1,
          top_p: 0.9
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_HYPERBOLIC_API_KEY}`,
            'Content-Type': 'application/json'
          },
          signal,
          timeout: 30000 // 30 second timeout
        }
      );

      // Check if aborted after response
      if (signal?.aborted) {
        return {
          text: '',
          error: 'Generation cancelled'
        };
      }

      return {
        text: response.data.choices[0].message.content
      };
    } catch (error) {
      // Remove the failed request from our window
      const index = requestTimes.indexOf(now);
      if (index > -1) {
        requestTimes.splice(index, 1);
      }
      throw error;
    }
  } catch (error) {
    // Handle abort error
    if (axios.isCancel(error)) {
      return {
        text: '',
        error: 'Generation cancelled'
      };
    }

    console.error('Error generating response:', error);

    // Handle rate limiting
    if (error instanceof AxiosError && error.response?.status === 429) {
      // Get retry delay from headers or use exponential backoff
      const retryAfter = parseInt(error.response.headers['retry-after'] || '0') * 1000;
      const backoffDelay = getRetryDelay(retryCount);
      const waitTime = Math.max(retryAfter, backoffDelay);

      if (retryCount < 3) {
        console.log(`Rate limited by server. Retrying after ${Math.ceil(waitTime / 1000)} seconds...`);
        await delay(waitTime);
        return generateResponse(prompt, persona, signal, retryCount + 1);
      }
    }

    return {
      text: '',
      error: error instanceof AxiosError && error.response?.status === 429
        ? 'Too many requests. Please wait a moment before trying again.'
        : 'Failed to generate response. Please try again.'
    };
  }
};
