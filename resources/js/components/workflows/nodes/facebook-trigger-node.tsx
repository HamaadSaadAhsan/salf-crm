import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Settings, Check, AlertCircle } from 'lucide-react'
import {IconBrandFacebook as Facebook} from "@tabler/icons-react"
import { WorkflowStep } from '@/types/workflow'

interface FacebookTriggerNodeData {
  stepId: number
  step: WorkflowStep
  isConfigured: boolean
  selectedPage: string
  selectedForm: string
  onConfigure: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  onStepUpdate?: (updates: Partial<WorkflowStep>) => void
}

function FacebookTriggerNode({ data }: { data: FacebookTriggerNodeData }) {
  const { step, isConfigured, selectedPage, selectedForm, onConfigure } = data

  return (
    <div className={`relative bg-primary-foreground rounded-lg border-2 p-4 shadow-sm min-w-[280px] ${
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
        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
          <Facebook className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-medium">Facebook Lead Ads</div>
          <div className="text-xs text-gray-500">Trigger</div>
        </div>
        <Badge variant={isConfigured ? "primary" : "secondary"}>
          {isConfigured ? "Configured" : "Setup Required"}
        </Badge>
      </div>

      {/* Configuration Display */}
      <div className="space-y-2 mb-4">
        <div className="text-sm">
          <span className="text-gray-600">Page:</span>{" "}
          <span className="font-medium">
            {selectedPage || "Not selected"}
          </span>
        </div>
        <div className="text-sm">
          <span className="text-gray-600">Form:</span>{" "}
          <span className="font-medium">
            {selectedForm || "Not selected"}
          </span>
        </div>
        {step.field_mappings && step.field_mappings.length > 0 && (
          <div className="text-sm">
            <span className="text-gray-600">Field mappings:</span>{" "}
            <span className="font-medium">{step.field_mappings.length}</span>
          </div>
        )}
      </div>

      {/* Configure Button */}
      <Button
        onClick={onConfigure}
        variant={isConfigured ? "outline" : "primary"}
        size="sm"
        className="w-full"
      >
        <Settings className="w-4 h-4 mr-2" />
        {isConfigured ? "Reconfigure" : "Configure"}
      </Button>

      {/* React Flow Handles */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
    </div>
  )
}

export default memo(FacebookTriggerNode)