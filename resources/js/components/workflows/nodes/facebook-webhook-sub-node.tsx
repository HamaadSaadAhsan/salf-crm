import { type NodeProps } from '@xyflow/react';
import WorkflowNode from './workflow-node';
import { Webhook } from 'lucide-react';

export default function FacebookWebhookSubNode(props: NodeProps) {
    return (
        <WorkflowNode
            {...props}
            data={{
                ...props.data,
                label: (props.data.label as string) || 'Webhook Subscription',
                sublabel: (props.data.sublabel as string) || 'Subscribe to webhooks',
                icon: <Webhook className="w-4.5 h-4.5 text-white" />,
                iconBg: 'bg-[#1877F2]',
                stepType: 'action',
                service: 'facebook_webhook_sub',
            }}
        />
    );
}
