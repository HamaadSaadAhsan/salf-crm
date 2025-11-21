import React from 'react'

import { useState, forwardRef, useRef, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  Info,
  HelpCircle,
  Settings,
} from 'lucide-react'
import { IconBrandFacebook as Facebook } from '@tabler/icons-react'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import PageSelectionModal from './page-selection-modal'
import FormSelectionModal from './form-selection-modal'
import TestInterface from './test-interface'
import FieldMappingInterface from './field-mapping-interface'
import { Workflow, WorkflowFieldMapping } from '@/types/workflow'
import { WorkflowHelpers } from '@/lib/workflow-helpers'
import SidebarHeader from '@/components/floating-sidebar/SidebarHeader'

interface FloatingSidebarProps {
  currentStep: 'setup' | 'configure' | 'test'
  setCurrentStep: (step: 'setup' | 'configure' | 'test') => void
  selectedPage: string
  currentTrigger?: string
  setSelectedPage: (page: string) => void
  selectedForm: string
  setSelectedForm: (form: string) => void
  workflow: Workflow
  onClose: () => void
  className?: string
  resizable?: boolean
  onWorkflowUpdate: (updates: Partial<Workflow>) => void
  onPageFormUpdate: (page: string, form: string) => void
  onConfigureWebhookAction: () => void
}

const FloatingSidebar = React.memo(forwardRef<HTMLDivElement, FloatingSidebarProps>(
  (
    {
      className,
      currentStep,
      currentTrigger,
      setCurrentStep,
      selectedPage,
      setSelectedPage,
      selectedForm,
      setSelectedForm,
      onClose,
      resizable = false,
      workflow,
      onWorkflowUpdate,
      onPageFormUpdate,
      onConfigureWebhookAction
    },
    ref,
  ) => {
    const [showPageModal, setShowPageModal] = useState(false)
    const [showFormModal, setShowFormModal] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editedName, setEditedName] = useState(workflow.name)
    const [sidebarWidth, setSidebarWidth] = useState(450) // Default width in pixels
    const [isResizing, setIsResizing] = useState(false)
    const [loading, setLoading] = useState(false)
    const resizeRef = useRef<HTMLDivElement>(null)

    // Get current step configuration from workflow
    const currentStepData = useMemo(() =>
      workflow.steps.find(s => s.service === currentTrigger),
      [workflow.steps, currentTrigger]
    )

    const currentStepConfig = useMemo(() =>
      currentStepData?.configuration || {},
      [currentStepData?.configuration]
    )

    // Update edited name when the workflow changes
    useEffect(() => {
      setEditedName(workflow.name)
    }, [workflow.name])

    // Replace inline functions with useCallback
    const handleFormSelect = useCallback((form: string) => {
      setSelectedForm(form)
      onPageFormUpdate(selectedPage, form)
      setShowFormModal(false)
    }, [selectedPage, onPageFormUpdate])

    const handleEditSave = useCallback(() => {
      if (editedName.trim() !== workflow.name) {
        onWorkflowUpdate({ name: editedName.trim() })
      }
      setIsEditing(false)
    }, [editedName, workflow.name, onWorkflowUpdate])

    const handleEditCancel = useCallback(() => {
      setEditedName(workflow.name)
      setIsEditing(false)
    }, [workflow.name])

    const toggleFullscreen = useCallback(() => {
      setIsFullscreen(!isFullscreen)
    }, [isFullscreen])

    const handlePageSelect = useCallback((page: string, pageName?: string) => {
      setSelectedPage(pageName ?? page)
      onPageFormUpdate(page, selectedForm)
      setShowPageModal(false)
    }, [selectedForm, onPageFormUpdate])

    // Handle field mapping updates - stable callback using ref pattern with debounce
    const workflowRef = useRef(workflow)
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    workflowRef.current = workflow

    const handleFieldMappingUpdate = useCallback((mappings: WorkflowFieldMapping[]) => {
      // Clear any pending update
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }

      // Debounce the workflow update to prevent rapid re-renders
      updateTimeoutRef.current = setTimeout(() => {
        const currentWorkflow = workflowRef.current
        const stepToUpdate = currentWorkflow.steps.find(s => s.service === currentTrigger)
        if (!stepToUpdate) return

        console.log('Current Step Data:', stepToUpdate)
        console.log('Field mappings updated:', mappings)

        const updatedWorkflow = WorkflowHelpers.updateStep(currentWorkflow, stepToUpdate.id, {
          ...stepToUpdate,
          field_mappings: mappings,
        })
        onWorkflowUpdate(updatedWorkflow)
      }, 300) // 300ms debounce
    }, [currentTrigger, onWorkflowUpdate])

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current)
        }
      }
    }, [])


    // Handle webhook URL update
    const handleWebhookConfigUpdate = useCallback((url: string, method: string = 'POST', headers?: Record<string, string>) => {
      if (!currentStepData) return

      const updatedWorkflow = WorkflowHelpers.updateStep(workflow, currentStepData.id, {
        configuration: {
          ...currentStepData.configuration,
          url,
          method,
          headers: headers || currentStepData.configuration.headers,
        },
      })
      onWorkflowUpdate(updatedWorkflow)

      if(currentStepData?.configuration.selectedLead) {
        onConfigureWebhookAction()
      }
    }, [currentStepData, workflow, onWorkflowUpdate])

    // Refresh fields (could fetch the latest form fields from Facebook API)
    const handleRefreshFields = async () => {
      setLoading(true)
      try {
        // Implement refresh logic here
        console.log('Refreshing fields...')
        // You can call an API to get the latest form fields
        await new Promise(resolve => setTimeout(resolve, 1000)) // Mock delay
      } catch (error) {
        console.error('Failed to refresh fields:', error)
      } finally {
        setLoading(false)
      }
    }

    const stepNumber = useMemo(() => {
      switch (currentStep) {
        case 'setup': return 1
        case 'configure': return 2
        case 'test': return 3
        default: return 1
      }
    }, [currentStep])

    const stepTitle = useMemo(() => {
      const stepNum = stepNumber

      if (currentTrigger === 'facebook_lead_ads') {
        return `${stepNum}. Facebook Lead Ads`
      } else if (currentTrigger === 'webhook') {
        return `${stepNum}. Webhook Action`
      }
      return `${stepNum}. ${workflow.name}`
    }, [stepNumber, currentTrigger, workflow.name])

    const getStepNumber = () => {
      switch (currentStep) {
        case 'setup':
          return 1
        case 'configure':
          return 2
        case 'test':
          return 3
        default:
          return 1
      }
    }

    const getStepTitle = () => {
      const stepNum = getStepNumber()

      if (currentTrigger === 'facebook_lead_ads') {
        return `${stepNum}. Facebook Lead Ads`
      } else if (currentTrigger === 'webhook') {
        return `${stepNum}. Webhook Action`
      }
      return `${stepNum}. ${workflow.name}`
    }

    // Handle resize functionality
    useEffect(() => {
      document.body.classList.add('overflow-hidden')

      if (!resizable) return

      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing) return

        const newWidth = window.innerWidth - e.clientX - 16 // 16px for right margin
        const minWidth = 450
        const maxWidth = Math.min(800, window.innerWidth * 0.6)

        setSidebarWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)))
      }

      const handleMouseUp = () => {
        setIsResizing(false)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      if (isResizing) {
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = 'ew-resize'
        document.body.style.userSelect = 'none'
      }

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }, [isResizing, resizable])

    const handleResizeStart = (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)
    }

    // Memoize fieldMappings with deep comparison to prevent unnecessary updates
    const previousFieldMappingsRef = useRef<WorkflowFieldMapping[]>([])
    const fieldMappings = useMemo(() => {
      const newMappings = currentStepData?.field_mappings || []

      // Deep comparison - only update if content actually changed
      const hasChanged = newMappings.length !== previousFieldMappingsRef.current.length ||
        newMappings.some((mapping, index) => {
          const prev = previousFieldMappingsRef.current[index]
          return !prev ||
            mapping.source_field !== prev.source_field ||
            mapping.target_field !== prev.target_field ||
            mapping.field_type !== prev.field_type ||
            mapping.required !== prev.required
        })

      if (hasChanged) {
        previousFieldMappingsRef.current = newMappings
        return newMappings
      }

      // Return the previous reference to maintain referential equality
      return previousFieldMappingsRef.current
    }, [currentStepData?.field_mappings])

    // Memoize trigger icon to prevent recreation
    const triggerIcon = useMemo(() => {
      const triggerStep = WorkflowHelpers.getTriggerStep(workflow)
      switch (triggerStep?.service) {
        case 'facebook_lead_ads':
          return <Facebook className="w-4 h-4 text-white" />
        default:
          return <div className="w-4 h-4 bg-gray-400 rounded" />
      }
    }, [workflow])

    // Memoize step change handler
    const handleStepChange = useCallback(() => {
      if(currentTrigger === 'facebook_lead_ads' && currentStep === 'test' && currentStepData?.configuration.selectedLead){
        // Close current sidebar and open webhook configuration
        onClose()
        onConfigureWebhookAction()
      }else{
        const nextStep = currentStep === 'setup' ? 'configure' : 'test'
        setCurrentStep(nextStep)
      }
    }, [currentTrigger, currentStep, currentStepData?.configuration.selectedLead, onClose, onConfigureWebhookAction, setCurrentStep])

    // Render sidebar content - React memo and key will prevent unnecessary re-renders
    const sidebarContent = (
      <div
        className="bg-primary-foreground border border-primary-foreground rounded-lg shadow-2xl overflow-hidden h-full flex flex-col"
        style={isFullscreen ? { width: 'calc(100% + 200px)' } : {}}>
        {/* Header */}
        <SidebarHeader
          workflow={workflow}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          onClose={onClose}
          loading={loading}
          handleRefreshFields={handleRefreshFields}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          editedName={editedName}
          setEditedName={setEditedName}
          handleEditSave={handleEditSave}
          handleEditCancel={handleEditCancel}
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <Tabs value={currentStep} onValueChange={(value) => setCurrentStep(value as any)}>
            <TabsContent value="configure" className="space-y-6 mt-0">
              {currentTrigger === 'facebook_lead_ads' && (
                <>
                  {/* Info Alert */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex gap-2">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-800">
                        When you update a form, Facebook assigns a new form ID. You must reselect it from the dropdown
                        menu.
                      </p>
                    </div>
                  </div>

                  {/* Page Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="page">Page</Label>
                      <span className="text-red-500">*</span>
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                    </div>
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-transparent"
                      onClick={() => setShowPageModal(true)}
                    >
                      {selectedPage || currentStepConfig.page_name || 'Select a page'}
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Form Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="form">Form</Label>
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                    </div>
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-transparent"
                      onClick={() => setShowFormModal(true)}
                      disabled={!selectedPage && !currentStepConfig.page_id}
                    >
                      {selectedForm || currentStepConfig.form_name || 'Select a form'}
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Recommendation */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex gap-2">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">Recommended next step:</p>
                        <p>
                          See the full impact of your Facebook Lead Ads with one more Zap.{' '}
                          <a href="#" className="underline">
                            Send CRM conversion events to Facebook
                          </a>{' '}
                          to track true ROI—online or offline.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {currentTrigger === 'webhook' && (
                <>
                  {/* Webhook Configuration Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex gap-2">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Automatic Lead Creation</p>
                        <p>
                          Data from Facebook forms will be automatically mapped to lead fields.
                          Any additional information will be stored in custom_fields.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-sm text-gray-700">
                      <p className="font-medium mb-2">Configuration:</p>
                      <ul className="space-y-1 text-xs">
                        <li>• <span className="font-medium">Method:</span> POST</li>
                        <li>• <span className="font-medium">Format:</span> JSON</li>
                        <li>• <span className="font-medium">Auto-mapping:</span> Enabled</li>
                      </ul>
                    </div>
                  </div>
                </>
              )}

              {/* Field Mapping Interface - Show for webhook configuration */}
              {currentTrigger === 'webhook' && (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex gap-2">
                      <Info className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium mb-1">Field Mapping Configuration</p>
                        <p>
                          Map Facebook form fields to lead database fields. Unmapped fields will be stored in custom_fields.
                        </p>
                      </div>
                    </div>
                  </div>
                  <FieldMappingInterface
                    key={currentTrigger}
                    fieldMappings={fieldMappings}
                    onFieldMappingUpdate={handleFieldMappingUpdate}
                    workflow={workflow}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="test" className="mt-0">
              <TestInterface
                workflow={workflow}
                currentTrigger={currentTrigger}
                onWorkflowUpdate={onWorkflowUpdate}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Continue Button */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <Button onClick={handleStepChange} className="w-full bg-blue-600 hover:bg-blue-700">
            {currentTrigger === 'facebook_lead_ads' && currentStep === 'test' && currentStepData?.configuration.selectedLead
              ? 'Proceed with selected lead'
              : 'Continue'}
          </Button>
        </div>
      </div>
    )

    if (isFullscreen) {
      return (
        <>
          <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
            <DialogTitle></DialogTitle>
            <DialogContent className="h-[90vh] p-0  [&>button]:hidden" style={{ width: 'calc(100% - 6px)' }}>
              {sidebarContent}
            </DialogContent>
          </Dialog>

          {/* Modals */}
          <PageSelectionModal
            open={showPageModal}
            onClose={() => setShowPageModal(false)}
            selectedPage={selectedPage}
            onSelectPage={handlePageSelect}
          />

          <FormSelectionModal
            open={showFormModal}
            onClose={() => setShowFormModal(false)}
            selectedForm={selectedForm}
            onSelectForm={handleFormSelect}
            selectedPage={selectedPage}
          />
        </>
      )
    }

    // Resizable version with custom resize handle
    if (resizable) {
      return (
        <>
          <div className="fixed top-32 right-4 h-[calc(100vh-160px)] z-40 flex" style={{ width: sidebarWidth }}>
            {/* Custom resize handle */}
            <div
              ref={resizeRef}
              className="w-1 cursor-col-resize transition-colors flex-shrink-0 rounded-l"
              onMouseDown={handleResizeStart}
            />

            {/* Sidebar content */}
            <div ref={ref} className="flex-1 ml-1">
              {sidebarContent}
            </div>
          </div>

          {/* Modals */}
          <PageSelectionModal
            open={showPageModal}
            onClose={() => setShowPageModal(false)}
            selectedPage={selectedPage}
            onSelectPage={handlePageSelect}
          />

          <FormSelectionModal
            open={showFormModal}
            onClose={() => setShowFormModal(false)}
            selectedForm={selectedForm}
            onSelectForm={handleFormSelect}
            selectedPage={selectedPage}
          />
        </>
      )
    }

    // Simple positioning without resizing
    return (
      <>
        <div ref={ref} className={className}>
          {sidebarContent}
        </div>

        {/* Modals */}
        <PageSelectionModal
          open={showPageModal}
          onClose={() => setShowPageModal(false)}
          selectedPage={selectedPage}
          onSelectPage={handlePageSelect}
        />

        <FormSelectionModal
          open={showFormModal}
          onClose={() => setShowFormModal(false)}
          selectedForm={selectedForm}
          onSelectForm={handleFormSelect}
          selectedPage={selectedPage}
        />
      </>
    )
  },
))

FloatingSidebar.displayName = 'FloatingSidebar'

export default FloatingSidebar
