import React from 'react';

interface ControlsProps {
  isPaused: boolean;
  isLoading: boolean;
  onPauseToggle: () => void;
  onReset: () => void;
  onPromptSubmit: (prompt: string) => void;
}

export const Controls: React.FC<ControlsProps> = ({
  isPaused,
  isLoading,
  onPauseToggle,
  onReset,
  onPromptSubmit,
}) => {
  const [newPrompt, setNewPrompt] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const validatePrompt = (prompt: string): boolean => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return false;
    }
    if (prompt.length > 500) {
      setError('Prompt is too long (maximum 500 characters)');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const prompt = newPrompt.trim();
    if (validatePrompt(prompt)) {
      onPromptSubmit(prompt);
      setNewPrompt('');
      // Focus back on input after submission
      inputRef.current?.focus();
    }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPrompt(e.target.value);
    if (error) {
      validatePrompt(e.target.value);
    }
  };

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleSubmit(e as unknown as React.FormEvent);
      }
      // Escape to clear input
      if (e.key === 'Escape') {
        setNewPrompt('');
        setError(null);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [newPrompt, isLoading]);

  return (
    <div className="w-full space-y-4 p-4 bg-gray-800 rounded-lg">
      <div className="flex space-x-4">
        <button
          onClick={onPauseToggle}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={onReset}
          disabled={isLoading}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          Reset
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={newPrompt}
            onChange={handlePromptChange}
            disabled={isLoading}
            placeholder="Enter a new prompt... (Ctrl+Enter to send, Esc to clear)"
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-800 disabled:cursor-not-allowed"
            maxLength={500}
          />
          <span className="absolute right-2 bottom-2 text-xs text-gray-400">
            {newPrompt.length}/500
          </span>
        </div>
        
        {error && (
          <div className="text-red-400 text-sm px-2">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || !newPrompt.trim()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⟳</span>
                <span>Processing...</span>
              </>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
