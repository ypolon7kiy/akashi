import { useState } from 'react';

interface CreateGroupFormProps {
  readonly onSubmit: (name: string) => void;
  readonly disabled?: boolean;
}

export function CreateGroupForm({ onSubmit, disabled }: CreateGroupFormProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onSubmit(trimmed);
      setName('');
    }
  };

  return (
    <form className="akashi-tasks-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="New group name..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={disabled}
      />
      <button type="submit" disabled={!!disabled || !name.trim()}>
        Add Group
      </button>
    </form>
  );
}
