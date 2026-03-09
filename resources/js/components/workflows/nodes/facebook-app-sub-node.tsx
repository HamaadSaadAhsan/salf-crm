import { type NodeProps } from '@xyflow/react';
import WorkflowNode from './workflow-node';
import { AppWindow } from 'lucide-react';

export default function FacebookAppSubNode(props: NodeProps) {
    return (
        <WorkflowNode
            {...props}
            data={{
                ...props.data,
                label: (props.data.label as string) || 'App Subscription',
                sublabel: (props.data.sublabel as string) || 'Subscribe app to page events',
                icon: <AppWindow className="w-4.5 h-4.5 text-white" />,
                iconBg: 'bg-[#1877F2]',
                stepType: 'action',
                service: 'facebook_app_sub',
            }}
        />
    );
}
