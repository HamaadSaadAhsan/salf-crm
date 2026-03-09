import { useState } from "react"
import { Link, router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Search,
  Plus,
  MoreHorizontal,
  Play,
  Pause,
  Edit,
  Copy,
  Trash2,
  Webhook,
  ArrowRight,
  Filter,
  Loader2,
} from "lucide-react"

import { IconBrandFacebook as Facebook } from "@tabler/icons-react"
import { Workflow, WorkflowListItem } from "@/types/workflow"

interface WorkflowsListProps {
  workflows: Workflow[]
  onEditWorkflowAction: (workflowId: number) => void
}

export default function WorkflowsList({ workflows, onEditWorkflowAction }: WorkflowsListProps) {
    console.log(workflows)
  const [_loading, _setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [createLoading, setCreateLoading] = useState(false)

  // Transform API workflow data to a component format
  const transformWorkflowData = (apiWorkflow: Workflow): WorkflowListItem => {
    const triggerStep = apiWorkflow.steps.find(step => step.step_type === 'trigger')
    const actionSteps = apiWorkflow.steps.filter(step => step.step_type === 'action')

    return {
      id: apiWorkflow.id,
      name: apiWorkflow.name,
      status: apiWorkflow.status,
      trigger: {
        type: triggerStep?.service || 'unknown',
        name: getServiceDisplayName(triggerStep?.service || 'unknown'),
        service: triggerStep?.service || 'unknown'
      },
      actions: actionSteps.map(step => ({
        type: step.service,
        name: getServiceDisplayName(step.service),
        service: step.service
      })),
      lastRun: apiWorkflow.last_execution
        ? formatRelativeTime(apiWorkflow.last_execution)
        : "Never",
      totalRuns: apiWorkflow.executions_count || 0,
      successRate: 0, // You might want to calculate this from execution data
      createdAt: formatDate(apiWorkflow.created_at)
    }
  }

  const getServiceDisplayName = (service: string): string => {
    const serviceNames: Record<string, string> = {
      'facebook_lead_ads': 'Facebook Lead Ads',
      'webhook': 'Webhook',
      'email': 'Email',
      'database': 'Database',
      'sms': 'SMS',
      'slack': 'Slack',
      'unknown': 'Unknown Service'
    }
    return serviceNames[service] || service
  }

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hours ago`

    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} days ago`
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Transform workflows for display
  const transformedWorkflows: WorkflowListItem[] = (workflows || []).map(transformWorkflowData)

  const filteredWorkflows = transformedWorkflows.filter((workflow) => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || workflow.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case "facebook_lead_ads":
        return <Facebook className="w-4 h-4 text-blue-600" />
      case "webhook":
        return <Webhook className="w-4 h-4 text-orange-500" />
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded" />
    }
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case "webhook":
        return <Webhook className="w-4 h-4 text-orange-500" />
      case "email":
        return <div className="w-4 h-4 bg-blue-500 rounded" />
      case "database":
        return <div className="w-4 h-4 bg-green-500 rounded" />
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded" />
    }
  }

  // Create a new empty draft workflow
  const handleCreateNew = () => {
    setCreateLoading(true)

    router.post('/workflows', {
      name: 'Untitled Workflow',
      description: '',
      status: 'draft',
      metadata: { is_new: true },
      steps: [],
    }, {
      onSuccess: () => {
        setCreateLoading(false)
      },
      onError: () => {
        setCreateLoading(false)
      }
    })
  }

  const handleStatusChange = (workflowId: number, newStatus: 'active' | 'paused') => {
    setActionLoading(workflowId)

    router.patch(`/workflows/${workflowId}`, {
      status: newStatus
    }, {
      onSuccess: () => {
        setActionLoading(null)
      },
      onError: () => {
        setActionLoading(null)
      },
      preserveScroll: true
    })
  }

  const handleDuplicate = (workflowId: number) => {
    setActionLoading(workflowId)

    router.post(`/workflows/${workflowId}/duplicate`, {}, {
      onSuccess: () => {
        setActionLoading(null)
      },
      onError: () => {
        setActionLoading(null)
      },
      preserveScroll: true
    })
  }

  const handleDelete = (workflowId: number) => {
    if (!confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
      return
    }

    setActionLoading(workflowId)

    router.delete(`/workflows/${workflowId}`, {
      onSuccess: () => {
        setActionLoading(null)
      },
      onError: () => {
        setActionLoading(null)
      },
      preserveScroll: true
    })
  }

  const getStatusBadge = (status: Workflow["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
      case "paused":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Paused</Badge>
      case "draft":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Draft</Badge>
      case "inactive":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Inactive</Badge>
    }
  }


  const LoadingRow = () => (
    <TableRow>
      <TableCell className="pl-5 py-3"><Skeleton className="h-10 w-full" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
      <TableCell><Skeleton className="h-6 w-40" /></TableCell>
      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
      <TableCell><Skeleton className="h-6 w-8" /></TableCell>
    </TableRow>
  )

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className=" border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Workflows</h1>
            <p className="text-sm text-gray-600 mt-1">Manage your automation workflows</p>
          </div>
          <Button
            onClick={handleCreateNew}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={createLoading}
          >
            {createLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create new flow
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="px-6 py-4">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-transparent">
                  <Filter className="w-4 h-4 mr-2" />
                  Status: {statusFilter === "all" ? "All" : statusFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("active")}>Active</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("paused")}>Paused</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("draft")}>Draft</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>Inactive</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>
      </div>

      {/* Workflows Table */}
      <div className="px-6 pb-6">
        <Card className="pt-0">
          <Table className="rounded-md">
            <TableHeader className="rounded-md">
              <TableRow className="rounded-md">
                <TableHead className="rounded-tl-md py-3 pl-5">Workflow</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Total Runs</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead className="w-[50px] rounded-tr-md"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkflows.map((workflow) => (
                <TableRow key={workflow.id} className="hover:bg-background">
                  <TableCell className="py-3 pl-5">
                    <div>
                      <div className="font-medium">
                        <Link
                          href={`/workflows/${workflow.id}/edit`}
                          className="hover:underline"
                        >
                          {workflow.name}
                        </Link>
                      </div>
                      <div className="text-sm text-gray-500">Created {workflow.createdAt}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(workflow.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTriggerIcon(workflow.trigger.type)}
                      <span className="text-sm">{workflow.trigger.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {workflow.actions.map((action, index) => (
                        <div key={index} className="flex items-center gap-1">
                          {index > 0 && <ArrowRight className="w-3 h-3 text-gray-400" />}
                          <div className="flex items-center gap-1">
                            {getActionIcon(action.type)}
                            <span className="text-sm">{action.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">{workflow.lastRun}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{workflow.totalRuns.toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{workflow.successRate}%</span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1"
                          disabled={actionLoading === workflow.id}
                        >
                          {actionLoading === workflow.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="w-4 h-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditWorkflowAction(workflow.id)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(
                            workflow.id,
                            workflow.status === "active" ? "paused" : "active"
                          )}
                        >
                          {workflow.status === "active" ? (
                            <>
                              <Pause className="w-4 h-4 mr-2" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(workflow.id)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(workflow.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {_loading && (
                <LoadingRow />
              )}
            </TableBody>
          </Table>

          {filteredWorkflows.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "No workflows found matching your criteria"
                  : "No workflows found"
                }
              </div>
              <Button
                onClick={handleCreateNew}
                variant="outline"
                disabled={createLoading}
              >
                {createLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create your first workflow
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
