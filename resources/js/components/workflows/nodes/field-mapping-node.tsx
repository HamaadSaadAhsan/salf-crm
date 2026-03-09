import { type NodeProps } from '@xyflow/react';
import WorkflowNode from './workflow-node';
import { FileText } from 'lucide-react';

export default function FieldMappingNode(props: NodeProps) {
    return (
        <WorkflowNode
            {...props}
            data={{
                ...props.data,
                label: (props.data.label as string) || 'Field Mapping',
                sublabel: (props.data.sublabel as string) || 'Map incoming fields to lead fields',
                icon: <FileText className="w-4.5 h-4.5 text-white" />,
                iconBg: 'bg-violet-600',
                stepType: 'action',
                service: 'field_mapping',
            }}
        />
    );
}
