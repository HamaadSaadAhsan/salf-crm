import { memo, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { Plus, Webhook, Mail, Database, MessageSquare, Zap, Settings } from 'lucide-react'
import { IconBrandFacebook as Facebook } from "@tabler/icons-react"

interface AddStepNodeData {
  onAddStep?: (stepType: string) => void
}

function AddStepNode({ data }: { data: AddStepNodeData }) {
  const { onAddStep } = data

  const triggerTypes = [
    {
      id: 'facebook_trigger',
      name: 'Facebook Lead Ads',
      description: 'New lead received',
      icon: Facebook,
      color: 'bg-blue-600'
    }
  ]

  const actionTypes = [
    {
      id: 'webhook',
      name: 'Webhook',
      description: 'Send HTTP request',
      icon: Webhook,
      color: 'bg-orange-500'
    },
    {
      id: 'email',
      name: 'Email',
      description: 'Send email',
      icon: Mail,
      color: 'bg-blue-500'
    },
    {
      id: 'database',
      name: 'Database',
      description: 'Store data',
      icon: Database,
      color: 'bg-green-500'
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Send message',
      icon: MessageSquare,
      color: 'bg-purple-500'
    }
  ]

  return (
    <div className="bg-primary-foreground rounded-lg border-2 border-dashed border-gray-300 p-4 min-w-[200px] hover:border-gray-400 transition-colors">
      <div className="text-center">
        <div className="text-gray-500 mb-3">
          <Plus className="w-8 h-8 mx-auto mb-2" />
          <div className="font-medium">Add Step</div>
          <div className="text-xs">Choose a trigger or action</div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Step
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Triggers
            </DropdownMenuLabel>
            {triggerTypes.map((triggerType) => {
              const Icon = triggerType.icon
              return (
                <DropdownMenuItem
                  key={triggerType.id}
                  onClick={() => onAddStep?.(triggerType.id)}
                  className="flex items-center gap-3 p-3"
                >
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${triggerType.color}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium">{triggerType.name}</div>
                    <div className="text-xs text-gray-500">{triggerType.description}</div>
                  </div>
                </DropdownMenuItem>
              )
            })}

            <DropdownMenuSeparator />

            <DropdownMenuLabel className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Actions
            </DropdownMenuLabel>
            {actionTypes.map((actionType) => {
              const Icon = actionType.icon
              return (
                <DropdownMenuItem
                  key={actionType.id}
                  onClick={() => onAddStep?.(actionType.id)}
                  className="flex items-center gap-3 p-3"
                >
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${actionType.color}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium">{actionType.name}</div>
                    <div className="text-xs text-gray-500">{actionType.description}</div>
                  </div>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* React Flow Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
    </div>
  )
}

export default memo(AddStepNode)