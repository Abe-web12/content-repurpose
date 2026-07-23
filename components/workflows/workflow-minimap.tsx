"use client";

interface MiniMapNode {
  id: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
}

interface WorkflowMiniMapProps {
  nodes: MiniMapNode[];
  canvasWidth: number;
  canvasHeight: number;
}

export function WorkflowMiniMap({ nodes, canvasWidth, canvasHeight }: WorkflowMiniMapProps) {
  const scale = Math.min(150 / (canvasWidth || 1000), 100 / (canvasHeight || 800));
  const padding = 8;

  return (
    <div className="absolute bottom-4 left-4 bg-white border rounded-lg p-2 shadow-lg" style={{ width: 160, height: 120 }}>
      <svg width="144" height="104" viewBox={`0 0 ${canvasWidth || 1000} ${canvasHeight || 800}`}>
        <rect width={canvasWidth || 1000} height={canvasHeight || 800} fill="#f8fafc" rx="4" />
        {nodes.map((node) => (
          <rect
            key={node.id}
            x={node.positionX}
            y={node.positionY}
            width={node.width}
            height={node.height}
            fill="#3b82f6"
            rx="2"
            opacity="0.6"
          />
        ))}
      </svg>
    </div>
  );
}
