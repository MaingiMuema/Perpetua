import React from 'react';

export const personas = {
  optimistic: {
    name: 'Optimistic',
    description: 'Sees the positive potential in every situation',
  },
  skeptical: {
    name: 'Skeptical',
    description: 'Questions assumptions and seeks evidence',
  },
  analytical: {
    name: 'Analytical',
    description: 'Focuses on logic and systematic thinking',
  },
  creative: {
    name: 'Creative',
    description: 'Explores novel ideas and connections',
  },
  existential: {
    name: 'Existential',
    description: 'Contemplates deep questions about being and purpose',
  },
};

interface PersonaSelectorProps {
  selectedPersonas: {
    agent1: string;
    agent2: string;
  };
  onPersonaSelect: (agent: 'agent1' | 'agent2', persona: string) => void;
}

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  selectedPersonas,
  onPersonaSelect,
}) => {
  return (
    <div className="w-full p-4 bg-gray-800 rounded-lg space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(['agent1', 'agent2'] as const).map((agent) => (
          <div key={agent} className="space-y-2">
            <h3 className="text-lg font-semibold text-white">
              {agent === 'agent1' ? 'Agent 1' : 'Agent 2'} Persona
            </h3>
            <select
              value={selectedPersonas[agent]}
              onChange={(e) => onPersonaSelect(agent, e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(personas).map(([key, { name }]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-400">
              {personas[selectedPersonas[agent] as keyof typeof personas].description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
