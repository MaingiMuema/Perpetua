import axios from 'axios';

interface DialogueResponse {
  text: string;
  error?: string;
}

export const generateResponse = async (
  prompt: string,
  persona: string
): Promise<DialogueResponse> => {
  try {
    const response = await axios.post(
      'https://api.hyperbolic.xyz/v1/chat/completions',
      {
        model: 'deepseek-ai/DeepSeek-V3',
        messages: [
          {
            role: 'system',
            content: `You are an AI with a ${persona} personality engaging in a philosophical dialogue.`
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
          'Authorization': `Bearer ${process.env.HYPERBOLIC_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      text: response.data.choices[0].message.content
    };
  } catch (error) {
    console.error('Error generating response:', error);
    return {
      text: '',
      error: 'Failed to generate response. Please try again.'
    };
  }
};
