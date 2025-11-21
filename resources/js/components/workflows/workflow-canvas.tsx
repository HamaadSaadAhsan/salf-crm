import { useCallback, useEffect } from 'react'
import {
  ReactFlow,
  type Node,
  type Edge,
  addEdge,
  type OnConnect,
  useNodesState,
  useEdgesState,
  Background,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import FacebookTriggerNode from './nodes/facebook-trigger-node'
import WebhookActionNode from './nodes/webook-action-node'
import AddStepNode from './nodes/add-step-node'
import { Workflow, WorkflowStep } from '@/types/workflow'
import { WorkflowHelpers } from '@/lib/workflow-helpers'

interface WorkflowCanvasProps {
  selectedPage: string
  selectedForm: string
  currentTrigger?: string
  workflow: Workflow
  onConfigureFacebookAction: () => void
  onConfigureWebhookAction: () => void
  onWorkflowUpdate: (updates: Partial<Workflow>) => void
}

const nodeTypes = {
  facebookTrigger: FacebookTriggerNode,
  webhookAction: WebhookActionNode,
  addStep: AddStepNode,
}

// Node spacing configuration
const NODE_SPACING = {
  vertical: 200,
  horizontal: 0,
  startY: 100,
}

export default function WorkflowCanvas({
                                         selectedPage,
                                         selectedForm,
                                         workflow,
                                         onConfigureFacebookAction,
                                         onConfigureWebhookAction,
                                         currentTrigger,
                                         onWorkflowUpdate
                                       }: WorkflowCanvasProps) {

  // Generate nodes and edges from workflow data
  const generateNodesAndEdges = useCallback(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []

    // Sort steps by order
    const sortedSteps = [...workflow.steps].sort((a, b) => a.order - b.order)

    // Generate nodes for each step
    sortedSteps.forEach((step, index) => {
      const yPosition = NODE_SPACING.startY + (index * NODE_SPACING.vertical)

      // Determine node type based on step - Fixed to handle unknown step types better
      let nodeType = 'webhookAction' // Default fallback for unknown action types
      if (step.step_type === 'trigger' && step.service === 'facebook_lead_ads') {
        nodeType = 'facebookTrigger'
      } else if (step.step_type === 'action' && step.service === 'webhook') {
        nodeType = 'webhookAction'
      } else if (step.step_type === 'action') {
        // Handle other action types with webhook node as fallback
        nodeType = 'webhookAction'
      }

      // Check if step is configured
      const isConfigured = isStepConfigured(step)

      const node: Node = {
        id: `step-${step.id}`,
        type: nodeType,
        position: { x: NODE_SPACING.horizontal, y: yPosition },
        data: {
          stepId: step.id,
          step: step,
          isConfigured,
          selectedPage: step.configuration?.page_name || step.configuration?.page_id || '',
          selectedForm: step.configuration?.form_name || step.configuration?.form_id || '',
          webhookUrl: step.configuration?.url || '',
          currentTrigger: step.service,
          onConfigure: getConfigureHandler(step),
          onDelete: () => handleDeleteStep(step.id),
          onDuplicate: () => handleDuplicateStep(step),
        },
      }

      nodes.push(node)

      // Create edge to next step if exists
      if (index < sortedSteps.length - 1) {
        const nextStep = sortedSteps[index + 1]
        const edge: Edge = {
          id: `edge-${step.id}-${nextStep.id}`,
          source: `step-${step.id}`,
          target: `step-${nextStep.id}`,
          type: 'straight',
          style: { stroke: '#d1d5db', strokeWidth: 2 },
        }
        edges.push(edge)
      }
    })

    // Only add the "Add Step" node at the end if there are existing steps
    // For empty workflows, we'll show the empty state instead
    if (sortedSteps.length > 0) {
      const lastY = NODE_SPACING.startY + (sortedSteps.length * NODE_SPACING.vertical)

      nodes.push({
        id: 'add-step-final',
        type: 'addStep',
        position: { x: NODE_SPACING.horizontal, y: lastY },
        data: {
          onAddStep: handleAddStep,
        },
      })
    }

    return { nodes, edges }
  }, [workflow.steps])

  // Explicitly tell TypeScript the array types
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // Update nodes and edges when the workflow changes
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = generateNodesAndEdges()
    setNodes(newNodes)
    setEdges(newEdges)
  }, [generateNodesAndEdges, setNodes, setEdges])

  // Check if a step is properly configured
  const isStepConfigured = (step: WorkflowStep): boolean => {
    switch (step.service) {
      case 'facebook_lead_ads':
        return !!(step.configuration?.page_id && step.configuration?.form_id)
      case 'webhook':
        return !!(step.field_mappings && step.field_mappings.length > 0)
      case 'email':
        return !!(step.configuration?.to || step.configuration?.template)
      default:
        return false
    }
  }

  // Get the appropriate configured handler for a step
  const getConfigureHandler = (step: WorkflowStep) => {
    switch (step.service) {
      case 'facebook_lead_ads':
        return onConfigureFacebookAction
      case 'webhook':
        return onConfigureWebhookAction
      default:
        return undefined
    }
  }

  // Updated handleAddStep to handle Facebook trigger properly
  const handleAddStep = useCallback((stepType: string = 'webhook') => {
    if (stepType === 'facebook_trigger') {
      // Check if we already have a Facebook trigger
      const existingFacebookTrigger = workflow.steps.find(
        step => step.step_type === 'trigger' && step.service === 'facebook_lead_ads'
      )

      if (existingFacebookTrigger) {
        // If we already have a Facebook trigger, just add a webhook action
        const webhookStep: Omit<WorkflowStep, 'id'> = {
          step_type: 'action',
          service: 'webhook',
          operation: 'post_data',
          order: workflow.steps.length,
          configuration: {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          },
          enabled: true,
          field_mappings: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        const updatedWorkflow = WorkflowHelpers.addStep(workflow, webhookStep)
        onWorkflowUpdate(updatedWorkflow)
        return
      }

      // When adding Facebook trigger for the first time, add both trigger and webhook action
      const triggerStep: Omit<WorkflowStep, 'id'> = {
        step_type: 'trigger',
        service: 'facebook_lead_ads',
        operation: 'new_lead',
        order: 0, // Triggers should always be first
        configuration: {
          page_id: '',
          form_id: '',
          page_name: '',
          form_name: '',
        },
        enabled: true,
        field_mappings: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const webhookStep: Omit<WorkflowStep, 'id'> = {
        step_type: 'action',
        service: 'webhook',
        operation: 'post_data',
        order: 1, // Actions come after triggers
        configuration: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        enabled: true,
        field_mappings: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Add both steps
      let updatedWorkflow = WorkflowHelpers.addStep(workflow, triggerStep)
      updatedWorkflow = WorkflowHelpers.addStep(updatedWorkflow, webhookStep)
      onWorkflowUpdate(updatedWorkflow)
      return
    }

    let newStep: Omit<WorkflowStep, 'id'>

    switch (stepType) {
      case 'email':
        newStep = {
          step_type: 'action',
          service: 'email',
          operation: 'send_email',
          order: workflow.steps.length,
          configuration: {
            to: '',
            subject: '',
            template: '',
            from: '',
          },
          enabled: true,
          field_mappings: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        break

      case 'webhook':
      default:
        newStep = {
          step_type: 'action',
          service: 'webhook',
          operation: 'post_data',
          order: workflow.steps.length,
          configuration: {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          },
          enabled: true,
          field_mappings: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        break
    }

    const updatedWorkflow = WorkflowHelpers.addStep(workflow, newStep)
    onWorkflowUpdate(updatedWorkflow)
  }, [workflow, onWorkflowUpdate])

  // Handle deleting a step
  const handleDeleteStep = useCallback((stepId: number) => {
    if (confirm('Are you sure you want to delete this step?')) {
      const updatedWorkflow = WorkflowHelpers.removeStep(workflow, stepId)
      onWorkflowUpdate(updatedWorkflow)
    }
  }, [workflow, onWorkflowUpdate])

  // Handle duplicating a step
  const handleDuplicateStep = useCallback((step: WorkflowStep) => {
    const duplicatedStep: Omit<WorkflowStep, 'id'> = {
      ...step,
      order: workflow.steps.length,
      // Clear some configuration that shouldn't be duplicated
      field_mappings: step.field_mappings?.map(mapping => ({
        ...mapping,
        id: Date.now() + Math.random(), // Temporary ID
      })) || [],
    }

    const updatedWorkflow = WorkflowHelpers.addStep(workflow, duplicatedStep)
    onWorkflowUpdate(updatedWorkflow)
  }, [workflow, onWorkflowUpdate])

  // Handle step configuration updates
  const handleStepUpdate = useCallback((stepId: number, updates: Partial<WorkflowStep>) => {
    const updatedWorkflow = WorkflowHelpers.updateStep(workflow, stepId, updates)
    onWorkflowUpdate(updatedWorkflow)
  }, [workflow, onWorkflowUpdate])

  // Handle connecting nodes (for future use)
  const onConnect: OnConnect = useCallback(
    (connection) => {
      // For now, just add the edge visually
      setEdges((edges) => addEdge(connection, edges))

      // In the future, you could update workflow connections here
      // const updatedWorkflow = WorkflowHelpers.addConnection(workflow, connection)
      // onWorkflowUpdate(updatedWorkflow)
    },
    [setEdges]
  )

  // Get workflow statistics for display
  const workflowStats = {
    totalSteps: workflow.steps.length,
    configuredSteps: workflow.steps.filter(isStepConfigured).length,
    triggerSteps: workflow.steps.filter(s => s.step_type === 'trigger').length,
    actionSteps: workflow.steps.filter(s => s.step_type === 'action').length,
  }

  return (
    <div className="relative w-full h-full bg-primary-foreground overflow-hidden">
      {/* Workflow Stats Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-sm border p-3">
        <div className="text-sm font-medium text-gray-900 mb-1">
          {workflow.name}
        </div>
        <div className="text-xs text-gray-500 space-y-1">
          <div>Steps: {workflowStats.configuredSteps}/{workflowStats.totalSteps} configured</div>
          <div>Status: <span className="capitalize">{workflow.status}</span></div>
        </div>
      </div>

      {/* Main ReactFlow Canvas */}
      <ReactFlow
        nodes={nodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            workflow,
            onStepUpdate: node.data.stepId ? (updates: Partial<WorkflowStep>) =>
              handleStepUpdate(node.data.stepId as number, updates) : undefined,
          },
        }))}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodesConnectable={false}
        nodesDraggable={true}
        edgesFocusable={false}
        nodeTypes={nodeTypes}
        fitView
        minZoom={1}
        maxZoom={1}
      >
        <Background />
      </ReactFlow>

      {/* Empty State */}
      {workflow.steps.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center">
            <div className="text-gray-500 mb-4">
              <div className="text-lg font-medium">Your workflow is empty</div>
              <div className="text-sm">Add steps to get started</div>
            </div>
            <div className="pointer-events-auto flex gap-3">
              <button
                onClick={() => handleAddStep('facebook_trigger')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Facebook Trigger
              </button>
              <button
                onClick={() => handleAddStep('webhook')}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Add Webhook Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
