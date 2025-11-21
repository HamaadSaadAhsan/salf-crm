import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Settings, Webhook, Check, AlertCircle, ExternalLink } from 'lucide-react'
import { WorkflowStep } from '@/types/workflow'

interface WebhookActionNodeData {
  stepId: number
  step: WorkflowStep
  isConfigured: boolean
  webhookUrl: string
  onConfigure: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  onStepUpdate?: (updates: Partial<WorkflowStep>) => void
}

function WebhookActionNode({ data }: { data: WebhookActionNodeData }) {
  const { step, isConfigured, webhookUrl, onConfigure } = data

  // Get HTTP method from configuration
  const httpMethod = step.configuration?.method || 'POST'

  return (
    <div className={`relative rounded-lg border-2 p-4 shadow-sm min-w-[280px] ${
      isConfigured ? 'border-green-200' : 'border-gray-200'
    }`}>
      {/* Status Indicator */}
      <div className="absolute -top-2 -right-2">
        {isConfigured ? (
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        ) : (
          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
          <Webhook className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-medium ">Webhook</div>
          <div className="text-xs text-gray-500">Action</div>
        </div>
        <Badge variant={isConfigured ? "default" : "secondary"}>
          {isConfigured ? "Configured" : "Setup Required"}
        </Badge>
      </div>

      {/* Configuration Display */}
      <div className="space-y-2 mb-4">
        <div className="text-sm">
          <span className="">Method:</span>{" "}
          <Badge variant="outline" className="text-xs">{httpMethod}</Badge>
        </div>
        <div className="text-sm">
          <span className="">URL:</span>{" "}
          <div className="font-mono text-xs p-2 rounded mt-1 break-all">
            {webhookUrl || "Not configured"}
          </div>
        </div>
        {step.field_mappings && step.field_mappings.length > 0 && (
          <div className="text-sm">
            <span className="">Field mappings:</span>{" "}
            <span className="font-medium">{step.field_mappings.length}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button
          onClick={onConfigure}
          variant={isConfigured ? "outline" : "default"}
          size="sm"
          className="w-full"
        >
          <Settings className="w-4 h-4 mr-2" />
          {isConfigured ? "Reconfigure" : "Configure"}
        </Button>

        {webhookUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => window.open(webhookUrl, '_blank')}
          >
            <ExternalLink className="w-3 h-3 mr-2" />
            Test URL
          </Button>
        )}
      </div>

      {/* React Flow Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 border-2 border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 border-2 border-white"
      />
    </div>
  )
}

export default memo(WebhookActionNode)