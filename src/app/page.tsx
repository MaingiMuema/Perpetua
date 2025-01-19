'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

const RESPONSE_DELAY = 2000; // 2 seconds between responses

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersonas, setSelectedPersonas] = useState({
    agent1: 'optimistic',
    agent2: 'analytical',
  });

  // Use refs to track timeouts, mounted state, and active generation
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const isGeneratingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup function to clear timeout and abort ongoing request
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isGeneratingRef.current = false;
  }, []);

  const generateNextMessage = useCallback(async (previousMessage?: Message) => {
    // Check all conditions that should prevent generation
    if (!isMountedRef.current || isPaused || isLoading || isGeneratingRef.current) {
      return;
    }

    try {
      // Create new abort controller for this request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      isGeneratingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      const isAgent1 = !previousMessage || previousMessage.agent === 'agent2';
      const currentAgent = isAgent1 ? 'agent1' : 'agent2';
      const currentPersona = selectedPersonas[currentAgent];

      const prompt = previousMessage
        ? previousMessage.text
        : philosophicalPrompts[Math.floor(Math.random() * philosophicalPrompts.length)];

      // Clear any existing timeout before making the request
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const response = await generateResponse(
        prompt, 
        personas[currentPersona as keyof typeof personas].name,
        abortControllerRef.current.signal
      );

      // Check if we should continue after the response
      if (!isMountedRef.current || isPaused) {
        return;
      }

      if (response.error) {
        if (response.error === 'Generation cancelled') {
          // Don't show error for cancelled requests
          return;
        }
        setError(response.error);
        return;
      }

      if (response.text) {
        const newMessage: Message = {
          text: response.text,
          agent: currentAgent,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, newMessage]);
        
        // Only schedule next message if not paused
        if (!isPaused && isMountedRef.current) {
          timeoutRef.current = setTimeout(() => {
            // Check pause state again when timeout fires
            if (!isPaused && isMountedRef.current) {
              generateNextMessage(newMessage);
            }
          }, RESPONSE_DELAY);
        }
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error('Error generating message:', error);
        setError('Failed to generate response. Please try again later.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      isGeneratingRef.current = false;
    }
  }, [isPaused, isLoading, selectedPersonas]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Start conversation when mounted
  useEffect(() => {
    if (messages.length === 0 && !isPaused && isMountedRef.current) {
      generateNextMessage();
    }
  }, [messages.length, isPaused, generateNextMessage]);

  const handlePauseToggle = useCallback(() => {
    setIsPaused((prev) => {
      const newPausedState = !prev;
      if (newPausedState) {
        // If pausing, clear any pending operations and abort current request
        cleanup();
      } else if (messages.length > 0) {
        // Only start new message after delay when unpausing
        timeoutRef.current = setTimeout(() => {
          if (isMountedRef.current && !isPaused) {
            generateNextMessage(messages[messages.length - 1]);
          }
        }, RESPONSE_DELAY);
      }
      return newPausedState;
    });
  }, [messages, generateNextMessage, cleanup, isPaused]);

  const handleReset = useCallback(() => {
    cleanup();
    setMessages([]);
    setIsPaused(false);
    setError(null);
    setIsLoading(false);
  }, [cleanup]);

  const handlePromptSubmit = useCallback((prompt: string) => {
    if (isGeneratingRef.current || isLoading) return;
    
    cleanup();
    const newMessage: Message = {
      text: prompt,
      agent: 'agent1',
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMessage]);
    generateNextMessage(newMessage);
  }, [cleanup, generateNextMessage, isLoading]);

  const handlePersonaSelect = useCallback((agent: 'agent1' | 'agent2', persona: string) => {
    setSelectedPersonas((prev) => ({
      ...prev,
      [agent]: persona,
    }));
  }, []);

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
