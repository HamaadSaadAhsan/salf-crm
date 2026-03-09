import dagre from '@dagrejs/dagre';
import { type Node, type Edge } from '@xyflow/react';

const NODE_WIDTH = 260;
const NODE_HEIGHT = 64;

export function getAutoLayout(
    nodes: Node[],
    edges: Edge[],
    direction: 'TB' | 'LR' = 'TB',
): { nodes: Node[]; edges: Edge[] } {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));

    g.setGraph({
        rankdir: direction,
        nodesep: 60,
        ranksep: 80,
        marginx: 40,
        marginy: 40,
    });

    nodes.forEach((node) => {
        g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    edges.forEach((edge) => {
        g.setEdge(edge.source, edge.target);
    });

    dagre.layout(g);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = g.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - NODE_WIDTH / 2,
                y: nodeWithPosition.y - NODE_HEIGHT / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
}
