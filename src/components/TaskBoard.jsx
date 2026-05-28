import { useState } from 'react';

const TYPE_LABELS = {
  simple: { text: 'SIMPLE', color: 'bg-blue-600' },
  complex: { text: 'COMPLEX', color: 'bg-purple-600' },
  tool: { text: 'TOOL', color: 'bg-amber-600' }
};

const STATUS_COLORS = {
  pending: 'border-l-amber-500',
  inProgress: 'border-l-blue-500',
  completed: 'border-l-emerald-500'
};

export default function TaskBoard({ tasks, onAddTask }) {
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState(3);
  const [type, setType] = useState('simple');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onAddTask(input.trim(), priority, type);
    setInput('');
  };

  const renderTaskCard = (task) => {
    const typeInfo = TYPE_LABELS[task.type] || TYPE_LABELS.simple;
    const statusClass = STATUS_COLORS[task.status] || STATUS_COLORS.pending;

    return (
      <div
        key={task.id}
        className={`pixel-card border-l-4 ${statusClass} text-xs`}
      >
        <div className="flex justify-between items-start mb-1">
          <span className={`px-1 py-0.5 text-[8px] ${typeInfo.color} text-white`}>
            {typeInfo.text}
          </span>
          <span className="text-gray-500 text-[8px]">
            {'★'.repeat(task.priority)}{'☆'.repeat(5 - task.priority)}
          </span>
        </div>
        <p className="text-gray-300 mb-1 leading-relaxed">{task.description}</p>
        {task.status === 'inProgress' && (
          <div className="w-full h-1.5 bg-gray-700 mt-1">
            <div
              className="h-full bg-claude transition-all"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        )}
        {task.subtasks.length > 0 && (
          <div className="mt-1 text-[8px] text-gray-500">
            Sub: {task.subtasks.filter(s => s.status === 'completed').length}/{task.subtasks.length}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xs text-white p-3 border-b border-pixel-border shrink-0">
        📋 TASK BOARD
      </h2>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-b border-pixel-border shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="New task..."
          className="pixel-input w-full mb-2"
          maxLength={40}
        />
        <div className="flex gap-2">
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="pixel-input text-[8px] flex-1"
          >
            <option value={5}>★★★★★ URGENT</option>
            <option value={4}>★★★★ HIGH</option>
            <option value={3}>★★★ MEDIUM</option>
            <option value={2}>★★ LOW</option>
            <option value={1}>★ TRIVIAL</option>
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="pixel-input text-[8px] flex-1"
          >
            <option value="simple">SIMPLE</option>
            <option value="complex">COMPLEX</option>
            <option value="tool">TOOL</option>
          </select>
        </div>
        <button type="submit" className="pixel-btn primary w-full mt-2">
          📤 ASSIGN
        </button>
      </form>

      {/* Task Lists */}
      <div className="flex-1 overflow-y-auto scrollbar-pixel p-2">
        {tasks.inProgress.length > 0 && (
          <div className="mb-3">
            <h3 className="text-[8px] text-blue-400 mb-1">🔵 IN PROGRESS ({tasks.inProgress.length})</h3>
            {tasks.inProgress.map(renderTaskCard)}
          </div>
        )}

        {tasks.pending.length > 0 && (
          <div className="mb-3">
            <h3 className="text-[8px] text-amber-400 mb-1">🟡 PENDING ({tasks.pending.length})</h3>
            {tasks.pending.map(renderTaskCard)}
          </div>
        )}

        {tasks.completed.length > 0 && (
          <div>
            <h3 className="text-[8px] text-emerald-400 mb-1">🟢 DONE ({tasks.completed.length})</h3>
            {tasks.completed.slice(0, 10).map(renderTaskCard)}
          </div>
        )}

        {tasks.pending.length === 0 && tasks.inProgress.length === 0 && tasks.completed.length === 0 && (
          <div className="text-center text-gray-600 text-xs py-8">
            No tasks yet...
          </div>
        )}
      </div>
    </div>
  );
}
