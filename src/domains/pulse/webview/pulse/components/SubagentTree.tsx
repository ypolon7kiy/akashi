import { useState } from 'react';
import type { SessionSummary, TimelineResponse } from '../../../domain/model';
import { TimelineEntry } from './TimelineEntry';

interface SubagentTreeProps {
  session: SessionSummary;
  timeline: TimelineResponse | null;
  subagentTimeline: TimelineResponse | null;
  loading: boolean;
  onBack: () => void;
  onSelectAgent: (agentId: string) => void;
}

export function SubagentTree({
  session,
  timeline,
  subagentTimeline,
  loading,
  onBack,
  onSelectAgent,
}: SubagentTreeProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

  if (loading) {
    return (
      <div className="pulse-detail">
        <button className="pulse-detail__back" onClick={onBack}>
          <span className="codicon codicon-chevron-left" aria-hidden />
          Back to session
        </button>
        <div className="pulse-loading">
          <span className="codicon codicon-loading codicon-modifier-spin" />
          <span className="pulse-loading__text">Loading subagent tree...</span>
        </div>
      </div>
    );
  }

  if (!timeline || timeline.subagents.length === 0) {
    return (
      <div className="pulse-detail">
        <button className="pulse-detail__back" onClick={onBack}>
          <span className="codicon codicon-chevron-left" aria-hidden />
          Back to session
        </button>
        <div className="pulse-empty">
          <p>No subagents found in this session.</p>
        </div>
      </div>
    );
  }

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    onSelectAgent(agentId);
  };

  const toggleBlock = (blockId: string) => {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  };

  // Find subagent blocks from the timeline for prompt previews
  const subagentBlocks = timeline.blocks.filter((b) => b.type === 'subagent');

  return (
    <div className="pulse-detail">
      <button className="pulse-detail__back" onClick={onBack}>
        <span className="codicon codicon-chevron-left" aria-hidden />
        Back to session
      </button>

      <div className="pulse-detail__title">{session.projectName} — Subagent Tree</div>
      <div className="pulse-conversation__meta">{timeline.subagents.length} subagents</div>

      <div className="pulse-subagent-layout">
        {/* Left: agent list */}
        <div className="pulse-subagent-list">
          {/* Root session node */}
          <div className="pulse-subagent-node pulse-subagent-node--root">
            <span className="codicon codicon-account" aria-hidden />
            <span className="pulse-subagent-node__name">Main Session</span>
            <span className="pulse-subagent-node__meta">{session.messageCount} messages</span>
          </div>

          {/* Subagent nodes */}
          {timeline.subagents.map((agent) => {
            const block = subagentBlocks.find((b) => b.subagentId === agent.agentId);
            const isSelected = selectedAgentId === agent.agentId;

            return (
              <div
                key={agent.agentId}
                className={`pulse-subagent-node${isSelected ? ' pulse-subagent-node--selected' : ''}`}
                onClick={() => handleSelectAgent(agent.agentId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleSelectAgent(agent.agentId);
                }}
              >
                <span className="pulse-subagent-node__indent" />
                <span className="codicon codicon-type-hierarchy" aria-hidden />
                <div className="pulse-subagent-node__info">
                  <span className="pulse-subagent-node__name">{agent.agentType}</span>
                  <span className="pulse-subagent-node__meta">{agent.messageCount} messages</span>
                  {block?.subagentPrompt && (
                    <span className="pulse-subagent-node__prompt">{block.subagentPrompt}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: selected agent conversation */}
        {selectedAgentId && (
          <div className="pulse-subagent-conversation">
            {!subagentTimeline ? (
              <div className="pulse-loading">
                <span className="codicon codicon-loading codicon-modifier-spin" />
                <span className="pulse-loading__text">Loading conversation...</span>
              </div>
            ) : subagentTimeline.blocks.length === 0 ? (
              <div className="pulse-empty">
                <p>No conversation data for this subagent.</p>
              </div>
            ) : (
              <div className="pulse-conversation">
                {subagentTimeline.blocks.map((block) => (
                  <TimelineEntry
                    key={block.id}
                    block={block}
                    expanded={expandedBlocks.has(block.id)}
                    onToggle={() => toggleBlock(block.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
