import { type NodeProps } from '@xyflow/react';
import WorkflowNode from './workflow-node';
import { KeyRound } from 'lucide-react';

export default function FacebookOAuthNode(props: NodeProps) {
    return (
        <WorkflowNode
            {...props}
            data={{
                ...props.data,
                label: (props.data.label as string) || 'Facebook OAuth',
                sublabel: (props.data.sublabel as string) || 'Authenticate & authorize',
                icon: <KeyRound className="w-4.5 h-4.5 text-white" />,
                iconBg: 'bg-[#1877F2]',
                stepType: 'trigger',
                service: 'facebook_oauth',
            }}
        />
    );
}
