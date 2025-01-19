'use client';

import { useState, useEffect, useCallback } from 'react';
import { DialogueBox } from '@/components/DialogueBox';
import { Controls } from '@/components/Controls';
import { PersonaSelector, personas } from '@/components/PersonaSelector';
import { generateResponse } from '@/lib/api';

interface Message {
  text: string;
  agent: 'agent1' | 'agent2';
  timestamp: number;
}

const philosophicalPrompts = [
  'What is the nature of consciousness?',
  'Does free will truly exist?',
  'What is the meaning of life?',
  'How do we define reality?',
  'What is the relationship between mind and matter?',
];

const RESPONSE_DELAY = 5000; // 5 seconds between responses

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersonas, setSelectedPersonas] = useState({
    agent1: 'optimistic',
    agent2: 'analytical',
  });

  const generateNextMessage = useCallback(async (previousMessage?: Message) => {
    if (isPaused || isLoading) return;

    setIsLoading(true);
    setError(null);
    
    const isAgent1 = !previousMessage || previousMessage.agent === 'agent2';
    const currentAgent = isAgent1 ? 'agent1' : 'agent2';
    const currentPersona = selectedPersonas[currentAgent];

    try {
      const prompt = previousMessage
        ? previousMessage.text
        : philosophicalPrompts[Math.floor(Math.random() * philosophicalPrompts.length)];

      const response = await generateResponse(prompt, personas[currentPersona as keyof typeof personas].name);

      if (response.error) {
        setError(response.error);
        setIsLoading(false);
        return;
      }

      if (response.text) {
        const newMessage: Message = {
          text: response.text,
          agent: currentAgent,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, newMessage]);
        
        // Continue the conversation after a longer delay
        setTimeout(() => {
          generateNextMessage(newMessage);
        }, RESPONSE_DELAY);
      }
    } catch (error) {
      console.error('Error generating message:', error);
      setError('Failed to generate response. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [isPaused, isLoading, selectedPersonas]);

  useEffect(() => {
    if (messages.length === 0 && !isPaused) {
      generateNextMessage();
    }
  }, [messages.length, isPaused, generateNextMessage]);

  const handlePauseToggle = () => {
    setIsPaused((prev) => !prev);
    if (isPaused && messages.length > 0) {
      generateNextMessage(messages[messages.length - 1]);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setIsPaused(false);
    setError(null);
  };

  const handlePromptSubmit = (prompt: string) => {
    const newMessage: Message = {
      text: prompt,
      agent: 'agent1',
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMessage]);
    generateNextMessage(newMessage);
  };

  const handlePersonaSelect = (agent: 'agent1' | 'agent2', persona: string) => {
    setSelectedPersonas((prev) => ({
      ...prev,
      [agent]: persona,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-4xl font-bold mb-2">Perpetua</h1>
          <p className="text-gray-400">An infinite philosophical dialogue between AI agents</p>
        </header>

        <PersonaSelector
          selectedPersonas={selectedPersonas}
          onPersonaSelect={handlePersonaSelect}
        />

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded-lg">
            {error}
          </div>
        )}

        <DialogueBox messages={messages} isLoading={isLoading} />

        <Controls
          isPaused={isPaused}
          onPauseToggle={handlePauseToggle}
          onReset={handleReset}
          onPromptSubmit={handlePromptSubmit}
        />
      </div>
    </div>
  );
}
