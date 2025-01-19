import React from 'react';

interface ControlsProps {
  isPaused: boolean;
  onPauseToggle: () => void;
  onReset: () => void;
  onPromptSubmit: (prompt: string) => void;
}

export const Controls: React.FC<ControlsProps> = ({
  isPaused,
  onPauseToggle,
  onReset,
  onPromptSubmit,
}) => {
  const [newPrompt, setNewPrompt] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPrompt.trim()) {
      onPromptSubmit(newPrompt);
      setNewPrompt('');
    }
  };

  return (
    <div className="w-full space-y-4 p-4 bg-gray-800 rounded-lg">
      <div className="flex space-x-4">
        <button
          onClick={onPauseToggle}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Reset
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="text"
          value={newPrompt}
          onChange={(e) => setNewPrompt(e.target.value)}
          placeholder="Enter a new prompt..."
          className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
};
