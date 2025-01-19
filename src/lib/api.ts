import axios, { AxiosError } from 'axios';

interface DialogueResponse {
  text: string;
  error?: string;
}

// Simple delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Keep track of last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // Minimum 2 seconds between requests

export const generateResponse = async (
  prompt: string,
  persona: string,
  retryCount = 0
): Promise<DialogueResponse> => {
  try {
    // Ensure minimum time between requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await delay(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
    }

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
        }
      }
    );

    lastRequestTime = Date.now();
    return {
      text: response.data.choices[0].message.content
    };
  } catch (error) {
    console.error('Error generating response:', error);

    // Handle rate limiting
    if (error instanceof AxiosError && error.response?.status === 429) {
      if (retryCount < 3) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '5');
        console.log(`Rate limited. Retrying after ${retryAfter} seconds...`);
        await delay(retryAfter * 1000);
        return generateResponse(prompt, persona, retryCount + 1);
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
