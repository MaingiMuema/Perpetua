"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DialogueBox } from "@/components/DialogueBox";
import { Controls } from "@/components/Controls";
import { PersonaSelector, personas } from "@/components/PersonaSelector";
import { generateResponse } from "@/lib/api";

interface Message {
  text: string;
  agent: "agent1" | "agent2";
  timestamp: number;
}

const RESPONSE_DELAY = 2000; // 2 seconds between responses

const generatePhilosophicalPrompt = async (
  signal: AbortSignal
): Promise<string> => {
  const promptRequest = await generateResponse(
    "Generate a deep philosophical question or topic for discussion. Respond with just the question or topic, nothing else.",
    "philosopher",
    signal
  );

  if (promptRequest.error) {
    throw new Error(promptRequest.error);
  }

  return promptRequest.text || "What is the nature of reality?"; // fallback prompt
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [selectedPersonas, setSelectedPersonas] = useState({
    agent1: "optimistic",
    agent2: "analytical",
  });

  // Use refs to track timeouts, mounted state, and active generation
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const isGeneratingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pausedRef = useRef(false);

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

  const generateNextMessage = useCallback(
    async (previousMessage?: Message) => {
      if (
        !isMountedRef.current ||
        isGeneratingRef.current ||
        pausedRef.current
      ) {
        return;
      }

      try {
        isGeneratingRef.current = true;
        setIsLoading(true);
        setError(null);

        // Create new abort controller for this request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        const isAgent1 = !previousMessage || previousMessage.agent === "agent2";
        const currentAgent = isAgent1 ? "agent1" : "agent2";
        const currentPersona = selectedPersonas[currentAgent];

        const prompt = previousMessage
          ? previousMessage.text
          : await generatePhilosophicalPrompt(
              abortControllerRef.current.signal
            );

        // Store the topic when starting a new conversation
        if (!previousMessage) {
          setCurrentTopic(prompt);
        }

        const response = await generateResponse(
          prompt,
          personas[currentPersona as keyof typeof personas].name,
          abortControllerRef.current.signal
        );

        if (!isMountedRef.current || pausedRef.current) return;

        if (response.error) {
          if (response.error === "Generation cancelled") return;
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

          // Schedule next message if not paused
          if (isMountedRef.current && !pausedRef.current) {
            timeoutRef.current = setTimeout(() => {
              generateNextMessage(newMessage);
            }, RESPONSE_DELAY);
          }
        }
      } catch (error) {
        if (isMountedRef.current) {
          console.error("Error generating message:", error);
          setError("Failed to generate response. Please try again later.");
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
        isGeneratingRef.current = false;
      }
    },
    [selectedPersonas]
  );

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
    setIsPaused((prevPaused) => {
      const newPausedState = !prevPaused;
      pausedRef.current = newPausedState;

      if (newPausedState) {
        cleanup();
      } else {
        // When resuming, start the generation loop
        if (messages.length > 0) {
          generateNextMessage(messages[messages.length - 1]);
        } else {
          generateNextMessage();
        }
      }

      return newPausedState;
    });
  }, [messages, generateNextMessage, cleanup]);

  const handleReset = useCallback(() => {
    cleanup();
    setMessages([]);
    setCurrentTopic(null);
    setIsPaused(false);
    setError(null);
    setIsLoading(false);
  }, [cleanup]);

  const handlePromptSubmit = useCallback(
    async (prompt: string) => {
      if (isGeneratingRef.current || isLoading) return;

      // Temporarily pause generation while processing the new prompt
      cleanup();

      try {
        setIsLoading(true);
        setError(null);

        // Create the user's message
        const userMessage: Message = {
          text: prompt,
          agent: "agent1",
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, userMessage]);

        // Create new abort controller for AI response
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        const response = await generateResponse(
          prompt,
          personas[selectedPersonas.agent2 as keyof typeof personas].name,
          abortControllerRef.current.signal
        );

        if (!isMountedRef.current) return;

        if (response.error) {
          if (response.error === "Generation cancelled") return;
          setError(response.error);
          return;
        }

        if (response.text) {
          const aiMessage: Message = {
            text: response.text,
            agent: "agent2",
            timestamp: Date.now(),
          };

          setMessages((prev) => [...prev, aiMessage]);

          // Ensure we're not paused and start the conversation loop
          pausedRef.current = false;
          setIsPaused(false);

          // Start the infinite loop with the AI's response
          timeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && !pausedRef.current) {
              generateNextMessage(aiMessage);
            }
          }, RESPONSE_DELAY);
        }
      } catch (error) {
        if (isMountedRef.current) {
          console.error("Error processing prompt:", error);
          setError("Failed to process your prompt. Please try again.");
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
        isGeneratingRef.current = false;
      }
    },
    [cleanup, generateNextMessage, selectedPersonas, isLoading]
  );

  const handlePersonaSelect = useCallback(
    (agent: "agent1" | "agent2", persona: string) => {
      setSelectedPersonas((prev) => ({
        ...prev,
        [agent]: persona,
      }));
    },
    []
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-4xl font-bold mb-2">Perpetua</h1>
          <p className="text-gray-400">
            An infinite philosophical dialogue between 2 AI agents using Gemini.
          </p>
        </header>

        {currentTopic && (
          <div className="text-center text-xl text-gray-300 font-semibold">
            Current Topic: {currentTopic}
          </div>
        )}

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
          isLoading={isLoading}
          onPauseToggle={handlePauseToggle}
          onReset={handleReset}
          onPromptSubmit={handlePromptSubmit}
        />
      </div>
    </div>
  );
}
