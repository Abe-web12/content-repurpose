"use client";

import { useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  X,
  UserPlus,
  Play,
  Loader2,
  ChevronDown,
  ChevronRight,
  Brain,
  Star,
  FileText,
  GitBranch,
  UserCheck,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CollaboratorAgent {
  id: string;
  name: string;
  model: string;
}

export interface Collaborator {
  agentId: string;
  role: "supervisor" | "reviewer" | "researcher" | "writer" | "delegate";
  instructions: string;
}

export interface CollaborationResult {
  agentId: string;
  agentName: string;
  output: string;
  duration: number;
}

interface MultiAgentPanelProps {
  readonly agents: CollaboratorAgent[];
  readonly onCollaborate: (config: {
    mainAgentId: string;
    collaborators: Collaborator[];
    task: string;
  }) => void;
}

const roleConfig: Record<Collaborator["role"], { icon: typeof Star; color: string; label: string }> = {
  supervisor: { icon: Star, color: "#7c3aed", label: "Supervisor" },
  reviewer: { icon: UserCheck, color: "#2563eb", label: "Reviewer" },
  researcher: { icon: Search, color: "#16a34a", label: "Researcher" },
  writer: { icon: FileText, color: "#ca8a04", label: "Writer" },
  delegate: { icon: GitBranch, color: "#ea580c", label: "Delegate" },
};

const roleIconMap: Record<Collaborator["role"], typeof Star> = {
  supervisor: Star,
  reviewer: UserCheck,
  researcher: Brain,
  writer: FileText,
  delegate: GitBranch,
};

const RoleBadge = memo(function RoleBadge({ role }: { readonly role: Collaborator["role"] }) {
  const config = roleConfig[role];
  const Icon = roleIconMap[role];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${config.color}15`, color: config.color }}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
});

interface CollaboratorRowProps {
  readonly agentName: string;
  readonly collaborator: Collaborator;
  readonly onRemove: () => void;
}

const CollaboratorRow = memo(function CollaboratorRow({
  agentName,
  collaborator,
  onRemove,
}: CollaboratorRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, height: 0 }}
      className="flex items-center justify-between rounded-lg border border-surface-3 bg-white px-3 py-2"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 shrink-0">
          {agentName.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-text-primary truncate">{agentName}</span>
          <div className="flex items-center gap-1.5">
            <RoleBadge role={collaborator.role} />
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="rounded p-1 text-text-muted hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
        title="Remove collaborator"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
});

const roles: Collaborator["role"][] = ["supervisor", "reviewer", "researcher", "writer", "delegate"];

const AgentResultCard = memo(function AgentResultCard({
  agentName,
  result,
}: {
  readonly agentName: string;
  readonly result: CollaborationResult;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-surface-3 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2.5 hover:bg-surface-1 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
            {agentName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-text-primary">{agentName}</span>
          <span className="text-xs text-text-muted">({result.duration}ms)</span>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-text-muted" /> : <ChevronRight className="h-4 w-4 text-text-muted" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <pre className="border-t border-surface-3 px-3 py-2.5 text-xs font-mono text-text-secondary whitespace-pre-wrap overflow-x-auto max-h-48">
              {result.output}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export function MultiAgentPanel({ agents, onCollaborate }: MultiAgentPanelProps) {
  const [mainAgentId, setMainAgentId] = useState(agents[0]?.id ?? "");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedRole, setSelectedRole] = useState<Collaborator["role"]>("researcher");
  const [instructions, setInstructions] = useState("");
  const [task, setTask] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CollaborationResult[]>([]);

  const addCollaborator = useCallback(() => {
    if (!selectedAgentId || selectedAgentId === mainAgentId) return;
    if (collaborators.some((c) => c.agentId === selectedAgentId)) return;
    setCollaborators((prev) => [
      ...prev,
      { agentId: selectedAgentId, role: selectedRole, instructions },
    ]);
    setSelectedAgentId("");
    setInstructions("");
  }, [selectedAgentId, selectedRole, instructions, collaborators, mainAgentId]);

  const removeCollaborator = useCallback((agentId: string) => {
    setCollaborators((prev) => prev.filter((c) => c.agentId !== agentId));
  }, []);

  const handleRun = useCallback(() => {
    if (!mainAgentId || !task.trim()) return;
    setLoading(true);
    setResults([]);
    onCollaborate({
      mainAgentId,
      collaborators,
      task,
    });
    setTimeout(() => {
      setResults([
        {
          agentId: mainAgentId,
          agentName: agents.find((a) => a.id === mainAgentId)?.name ?? "Main Agent",
          output: `Processed task with ${collaborators.length} collaborator(s)\n\nInput: ${task}\n\nResult: Successfully completed collaboration pipeline.`,
          duration: 2450,
        },
        ...collaborators.map((c, i) => ({
          agentId: c.agentId,
          agentName: agents.find((a) => a.id === c.agentId)?.name ?? `Agent ${i}`,
          output: `Role: ${c.role}\nInstructions: ${c.instructions || "none"}\n\nOutput: Task contribution complete.`,
          duration: Math.floor(Math.random() * 1000) + 500,
        })),
      ]);
      setLoading(false);
    }, 2000);
  }, [mainAgentId, task, collaborators, onCollaborate, agents]);

  const availableCollaborators = agents.filter(
    (a) => a.id !== mainAgentId && !collaborators.some((c) => c.agentId === a.id)
  );

  return (
    <div className="rounded-lg border border-surface-3 p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-brand-500" />
        <h3 className="font-semibold text-lg text-text-primary">Multi-Agent Collaboration</h3>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-text-secondary">Main Agent</label>
        <select
          value={mainAgentId}
          onChange={(e) => setMainAgentId(e.target.value)}
          className="w-full rounded-lg border border-surface-3 bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
        >
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name} ({agent.model})
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-surface-3 bg-surface-1 p-3 flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <UserPlus className="h-4 w-4 text-text-muted" />
          <h4 className="text-sm font-medium text-text-primary">Add Collaborator</h4>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Agent</label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full rounded-lg border border-surface-3 bg-white px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="">Select agent...</option>
              {availableCollaborators.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as Collaborator["role"])}
              className="w-full rounded-lg border border-surface-3 bg-white px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleConfig[role].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">Instructions (optional)</label>
          <input
            type="text"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Specific instructions for this collaborator..."
            className="w-full rounded-lg border border-surface-3 bg-white px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        <button
          type="button"
          onClick={addCollaborator}
          disabled={!selectedAgentId || selectedAgentId === mainAgentId}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Collaborator
        </button>
      </div>

      {collaborators.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium text-text-secondary">
            Collaborators ({collaborators.length})
          </h4>
          <AnimatePresence>
            {collaborators.map((collab) => (
              <CollaboratorRow
                key={collab.agentId}
                agentName={agents.find((a) => a.id === collab.agentId)?.name ?? collab.agentId}
                collaborator={collab}
                onRemove={() => removeCollaborator(collab.agentId)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-text-secondary">Task Description</label>
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Describe the task for the agent team..."
          rows={3}
          className="w-full rounded-lg border border-surface-3 bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
        />
      </div>

      <button
        type="button"
        onClick={handleRun}
        disabled={loading || !mainAgentId || !task.trim()}
        className="flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Collaborating...
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Run Collaboration
          </>
        )}
      </button>

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium text-text-secondary">Results</h4>
          <AnimatePresence>
            {results.map((result) => (
              <motion.div
                key={result.agentId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <AgentResultCard
                  agentName={result.agentName}
                  result={result}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
