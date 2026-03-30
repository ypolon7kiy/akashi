import { useState } from 'react';

interface CreateTaskFormProps {
  readonly groupId: string;
  readonly onSubmit: (groupId: string, name: string, description: string) => void;
  readonly onCancel: () => void;
  readonly disabled?: boolean;
}

export function CreateTaskForm({ groupId, onSubmit, onCancel, disabled }: CreateTaskFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onSubmit(groupId, trimmed, description.trim());
      setName('');
      setDescription('');
    }
  };

  return (
    <form className="akashi-tasks-form" onSubmit={handleSubmit} style={{ flexWrap: 'wrap' }}>
      <input
        type="text"
        placeholder="Task name..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={disabled}
        style={{ minWidth: '120px' }}
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={disabled}
        style={{ minWidth: '120px' }}
      />
      <button type="submit" disabled={!!disabled || !name.trim()}>
        Add
      </button>
      <button
        type="button"
        onClick={onCancel}
        style={{ background: 'transparent', color: 'var(--vscode-foreground)' }}
      >
        Cancel
      </button>
    </form>
  );
}
