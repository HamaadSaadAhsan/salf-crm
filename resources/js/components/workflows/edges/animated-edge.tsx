import { type EdgeProps, getBezierPath, getStraightPath, BaseEdge } from '@xyflow/react';

interface AnimatedEdgeData {
    isExecuting?: boolean;
    executionStatus?: 'idle' | 'running' | 'success' | 'error';
}

export default function AnimatedEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    data,
}: EdgeProps) {
    const edgeData = data as AnimatedEdgeData | undefined;
    const isExecuting = edgeData?.isExecuting ?? false;
    const status = edgeData?.executionStatus ?? 'idle';

    // Use straight path by default, bezier only during execution
    const [edgePath] = isExecuting
        ? getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })
        : getStraightPath({ sourceX, sourceY, targetX, targetY });

    const statusColors: Record<string, string> = {
        idle: 'var(--border)',
        running: '#3b82f6',
        success: '#22c55e',
        error: '#ef4444',
    };

    const edgeColor = statusColors[status] || statusColors.idle;

    return (
        <>
            {/* Base edge */}
            <BaseEdge
                id={id}
                path={edgePath}
                style={{
                    ...style,
                    stroke: edgeColor,
                    strokeWidth: isExecuting ? 2.5 : 1.5,
                    transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
                }}
            />

            {/* Animated particles when executing */}
            {isExecuting && (
                <>
                    <circle r="3" fill={edgeColor} filter="url(#glow)">
                        <animateMotion dur="1s" repeatCount="indefinite" path={edgePath} />
                    </circle>
                    <circle r="3" fill={edgeColor} filter="url(#glow)" opacity="0.6">
                        <animateMotion dur="1s" repeatCount="indefinite" path={edgePath} begin="0.33s" />
                    </circle>
                    <circle r="3" fill={edgeColor} filter="url(#glow)" opacity="0.3">
                        <animateMotion dur="1s" repeatCount="indefinite" path={edgePath} begin="0.66s" />
                    </circle>
                </>
            )}

            {/* SVG filter for glow effect */}
            <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
        </>
    );
}