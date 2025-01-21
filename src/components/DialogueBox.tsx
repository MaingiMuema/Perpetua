/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface Message {
  text: string;
  agent: "agent1" | "agent2";
  timestamp: number;
}

interface DialogueBoxProps {
  messages: Message[];
  isLoading: boolean;
}

export const DialogueBox: React.FC<DialogueBoxProps> = ({
  messages,
  isLoading,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="w-full h-[600px] bg-gray-900 rounded-lg p-6 overflow-y-auto">
      <div className="space-y-4">
        {messages.map((message, index) => (
          <motion.div
            key={message.timestamp}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`flex ${
              message.agent === "agent1" ? "justify-start" : "justify-end"
            }`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-lg ${
                message.agent === "agent1"
                  ? "bg-blue-600 text-white"
                  : "bg-purple-600 text-white"
              }`}
            >
              <p className="text-sm font-medium mb-1">
                {message.agent === "agent1" ? "Agent 1" : "Agent 2"}
              </p>
              <p className="text-base">{message.text}</p>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-center">
            <div className="animate-pulse text-gray-400">Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
