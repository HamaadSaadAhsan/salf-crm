import { type NodeProps } from '@xyflow/react';
import WorkflowNode from './workflow-node';
import { RefreshCw } from 'lucide-react';

export default function FacebookPageSyncNode(props: NodeProps) {
    return (
        <WorkflowNode
            {...props}
            data={{
                ...props.data,
                label: (props.data.label as string) || 'Page Sync',
                sublabel: (props.data.sublabel as string) || 'Sync Facebook pages',
                icon: <RefreshCw className="w-4.5 h-4.5 text-white" />,
                iconBg: 'bg-[#1877F2]',
                stepType: 'action',
                service: 'facebook_page_sync',
            }}
        />
    );
}
