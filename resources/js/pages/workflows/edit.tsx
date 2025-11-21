import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Head, Link, router, usePage } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Undo, Play, Loader2, Save, AlertCircle } from "lucide-react"
import WorkflowCanvas from "@/components/workflows/workflow-canvas"
import FloatingSidebar from "@/components/workflows/floating-sidebar"
import { cn } from "@/lib/utils"
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useWorkflowEdit } from '@/hooks/useWorkflowEdit'
import { WorkflowHelpers } from '@/lib/workflow-helpers'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import AppLayout from "@/layouts/app-layout"
import { Workflow } from "@/types/workflow"
import { type BreadcrumbItem } from "@/types"

interface WorkflowEditPageProps {
  workflow: Workflow
}

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Workflows',
    href: '/workflows',
  },
  {
    title: 'Edit Workflow',
    href: '#',
  },
]

export default function WorkflowEditPage({ workflow: initialWorkflow }: WorkflowEditPageProps) {
  const { props } = usePage()
  
  // Use custom hook for workflow management
  const {
    workflow,
    loading,
    saving,
    error,
    hasUnsavedChanges,
    updateWorkflow,
    saveWorkflow,
    publishWorkflow,
    setError
  } = useWorkflowEdit(initialWorkflow.id, initialWorkflow)

  // UI state
  const [showSidebar, setShowSidebar] = useState(false)
  const [currentStep, setCurrentStep] = useState<"setup" | "configure" | "test">("configure")
  const [selectedPage, setSelectedPage] = useState("")
  const [selectedForm, setSelectedForm] = useState("")
  const sidebarRef = useRef(null)
  const [triggerSelected, setTriggerSelected] = useState<string>("")

  // Initialize UI state when workflow loads (only on mount, not on every workflow update)
  const initializedRef = useRef(false)
  useEffect(() => {
    if (workflow && !initializedRef.current) {
      const triggerStep = WorkflowHelpers.getTriggerStep(workflow)
      if (triggerStep) {
        setTriggerSelected(triggerStep.service)

        // Set a Facebook-specific state if applicable
        if (triggerStep.service === 'facebook_lead_ads') {
          setSelectedPage(triggerStep.configuration.page_id || "")
          setSelectedForm(triggerStep.configuration.form_id || "")
        }

        initializedRef.current = true
      }
    }
  }, [workflow])

  // Memoize status info computation
  const statusInfo = useMemo(() =>
      WorkflowHelpers.getStatusInfo(workflow?.status || 'draft'),
    [workflow?.status]
  )

  // Handle save with validation feedback
  const handleSave = async () => {
    if (!workflow) return

    const validation = WorkflowHelpers.validateWorkflow(workflow)
    if (!validation.isValid) {
      setError(validation.errors.join(', '))
      return
    }

    const success = await saveWorkflow()
    if (success) {
      console.log('Workflow saved successfully')
      // Add toast notification here
    }
  }

  // Handle publishes with validation
  const handlePublish = async () => {
    if (!workflow) return

    const validation = WorkflowHelpers.validateWorkflow(workflow)
    if (!validation.isValid) {
      setError(`Cannot publish: ${validation.errors.join(', ')}`)
      return
    }

    const success = await publishWorkflow()
    if (success) {
      console.log('Workflow published successfully')
      // Add toast notification here
    }
  }

  // Handle test workflow
  const handleTest = async () => {
    console.log('Testing workflow...')
    // Implement test functionality
  }

  const handleConfigureFacebook = useCallback(() => {
    setShowSidebar(true)
    setCurrentStep("configure")
    setTriggerSelected("facebook_lead_ads")
  }, [])

  const handleConfigureWebhook = useCallback(() => {
    setShowSidebar(true)
    setCurrentStep("configure")
    setTriggerSelected("webhook")
  }, [])

  const handlePageFormUpdate = useCallback((page: string, form: string) => {
    setSelectedPage(page)
    setSelectedForm(form)

    if (workflow) {
      const updatedWorkflow = WorkflowHelpers.updateFacebookConfig(
        workflow,
        page,
        form
      )
      updateWorkflow(updatedWorkflow)
    }
  }, [workflow, updateWorkflow])

  // Loading state
  if (loading) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <Head title={`Edit Workflow: ${initialWorkflow.name}`} />
        <div className="min-h-screen bg-primary-foreground flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading workflow...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Error state
  if (error && !workflow) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <Head title={`Edit Workflow: ${initialWorkflow.name}`} />
        <div className="min-h-screen bg-primary-foreground flex items-center justify-center">
          <div className="max-w-md w-full px-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <Link href="/workflows">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Workflows
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!workflow) return null

  return (
    <div className="min-h-screen bg-primary-foreground">
      <Head title={`Edit Workflow: ${workflow.name}`} />
      
      {/* Header */}
      <header className="bg-primary-foreground border-b border-primary-foreground px-4 py-3 relative z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/workflows">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-600 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">W</span>
              </div>
              <span className="font-semibold">Workflow</span>
            </div>
          </div>

          <div className="flex justify-center items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="text-center">
                    <h1 className="font-bold">{workflow.name}</h1>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {workflow.description && (
                    <p className="text-sm text-gray-600">{workflow.description}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Badge
              className={cn(
                statusInfo.color === 'green' && "bg-green-100 text-green-800",
                statusInfo.color === 'yellow' && "bg-yellow-100 text-yellow-800",
                statusInfo.color === 'red' && "bg-red-100 text-red-800",
                statusInfo.color === 'gray' && "bg-gray-100 text-gray-800"
              )}
            >
              {statusInfo.label}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save'}
              </Button>
            )}

            <Button variant="ghost" size="sm" disabled>
              <Undo className="w-4 h-4 mr-2" />
              Undo
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={workflow.status !== 'active'}
            >
              <Play className="w-4 h-4 mr-2" />
              Test run
            </Button>

            {workflow.status === 'draft' ? (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handlePublish}
              >
                Publish
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSave}
                disabled={!hasUnsavedChanges || saving}
              >
                Update
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="flex bg-red-50 border-b border-red-200 px-4 py-2">
          <Alert variant="destructive" className="flex items-center border-0 bg-transparent p-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">{error}</AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => setError(null)}
            >
              ×
            </Button>
          </Alert>
        </div>
      )}

      <div className="">
        <div className="bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">!</span>
            </div>
            <div className="text-sm">
              <div className="font-medium text-blue-800 mb-1">
                Configure your workflow steps
              </div>
              <div className="text-blue-700">
                Click on any step to configure its settings. Start with the trigger to define how your workflow starts.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-yellow-800">
              You have unsaved changes
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSave}
              disabled={saving}
            >
              Save changes
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="h-[calc(100vh-73px)] relative overflow-hidden">
        <WorkflowCanvas
          workflow={workflow}
          selectedPage={selectedPage}
          selectedForm={selectedForm}
          currentTrigger={triggerSelected}
          onConfigureFacebookAction={handleConfigureFacebook}
          onConfigureWebhookAction={handleConfigureWebhook}
          onWorkflowUpdate={updateWorkflow}
        />

        {/* Floating Sidebar */}
        {showSidebar && (
          <FloatingSidebar
            ref={sidebarRef}
            className={cn(
              "fixed top-20 right-4 w-96 h-[calc(100vh-120px)] z-40",
              "transition-all duration-300 ease-in-out",
            )}
            resizable={true}
            workflow={workflow}
            currentTrigger={triggerSelected}
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            selectedPage={selectedPage}
            setSelectedPage={setSelectedPage}
            selectedForm={selectedForm}
            setSelectedForm={setSelectedForm}
            onClose={() => setShowSidebar(false)}
            onWorkflowUpdate={updateWorkflow}
            onPageFormUpdate={handlePageFormUpdate}
            onConfigureWebhookAction={handleConfigureWebhook}
          />
        )}
      </div>
    </div>
  )
}