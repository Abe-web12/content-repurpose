"use client";

import { useCallback, useRef, useState } from "react";

interface CanvasNode {
  id: string;
  type: string;
  label: string;
  config: Record<string, unknown>;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
}

interface CanvasEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string | null;
}

interface WorkflowCanvasProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  onNodesChange: (nodes: CanvasNode[]) => void;
  onEdgesChange: (edges: CanvasEdge[]) => void;
  onSelectNode: (node: CanvasNode | null) => void;
}

export function WorkflowCanvas({ nodes, edges, onNodesChange, onEdgesChange, onSelectNode }: WorkflowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setDragging(nodeId);
    setOffset({ x: e.clientX - node.positionX, y: e.clientY - node.positionY });
  }, [nodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const newX = e.clientX - offset.x;
    const newY = e.clientY - offset.y;
    onNodesChange(
      nodes.map((n) => (n.id === dragging ? { ...n, positionX: newX, positionY: newY } : n)),
    );
  }, [dragging, offset, nodes, onNodesChange]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleCanvasClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  return (
    <div
      ref={canvasRef}
      className="w-full h-full bg-gray-50 overflow-hidden relative"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {edges.map((edge) => {
          const source = nodes.find((n) => n.id === edge.sourceNodeId);
          const target = nodes.find((n) => n.id === edge.targetNodeId);
          if (!source || !target) return null;

          const sx = source.positionX + source.width / 2;
          const sy = source.positionY + source.height;
          const tx = target.positionX + target.width / 2;
          const ty = target.positionY;

          const midY = (sy + ty) / 2;
          const path = `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;

          return (
            <g key={edge.id}>
              <path d={path} fill="none" stroke="#94a3b8" strokeWidth="2" />
              {edge.label && (
                <text x={(sx + tx) / 2} y={midY - 4} textAnchor="middle" fontSize="10" fill="#64748b">
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {nodes.map((node) => (
        <div
          key={node.id}
          className="absolute bg-white rounded-lg border-2 border-gray-200 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
          style={{
            left: node.positionX,
            top: node.positionY,
            width: node.width,
            height: node.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          onMouseDown={(e) => handleMouseDown(e, node.id)}
          onClick={(e) => { e.stopPropagation(); onSelectNode(node); }}
        >
          <div className="px-3 py-2 border-b bg-gray-50 rounded-t-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs font-medium text-gray-700 truncate">{node.type}</span>
          </div>
          <div className="px-3 py-2 text-sm text-gray-600 truncate">{node.label}</div>
        </div>
      ))}

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
          <div className="text-center">
            <p className="text-lg mb-2">Drag nodes from the sidebar to start building</p>
            <p className="text-sm">Or use the Add Node buttons above</p>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={() => setScale((s) => Math.min(s + 0.1, 2))}
          className="px-2 py-1 bg-white border rounded text-sm hover:bg-gray-50"
        >
          +
        </button>
        <span className="px-2 py-1 text-xs text-gray-500">{Math.round(scale * 100)}%</span>
        <button
          onClick={() => setScale((s) => Math.max(s - 0.1, 0.5))}
          className="px-2 py-1 bg-white border rounded text-sm hover:bg-gray-50"
        >
          -
        </button>
      </div>
    </div>
  );
}
