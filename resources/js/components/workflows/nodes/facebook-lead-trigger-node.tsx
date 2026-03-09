import { type NodeProps } from '@xyflow/react';
import WorkflowNode from './workflow-node';
import { Zap } from 'lucide-react';

export default function FacebookLeadTriggerNode(props: NodeProps) {
    return (
        <WorkflowNode
            {...props}
            data={{
                ...props.data,
                label: (props.data.label as string) || 'New Lead',
                sublabel: (props.data.sublabel as string) || 'Facebook Lead Ads trigger',
                icon: <Zap className="w-4.5 h-4.5 text-white" />,
                iconBg: 'bg-[#1877F2]',
                stepType: 'trigger',
                service: 'facebook_lead_ads',
            }}
        />
    );
}
