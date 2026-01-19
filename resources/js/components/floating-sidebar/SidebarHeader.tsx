import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  X,
  Edit,
  Maximize2,
  Minimize2,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCcwIcon,
  Loader2,
} from "lucide-react"
import { IconBrandFacebook as Facebook } from "@tabler/icons-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Workflow } from "@/types/workflow"
import { WorkflowHelpers } from "@/lib/workflow-helpers"

interface SidebarHeaderProps {
  workflow: Workflow
  currentStep: "setup" | "configure" | "test"
  setCurrentStep: (step: "setup" | "configure" | "test") => void
  isFullscreen: boolean
  toggleFullscreen: () => void
  onClose: () => void
  loading: boolean
  handleRefreshFields: () => void
  isEditing: boolean
  setIsEditing: (editing: boolean) => void
  editedName: string
  setEditedName: (name: string) => void
  handleEditSave: () => void
  handleEditCancel: () => void
}

const SidebarHeader: React.FC<SidebarHeaderProps> = ({
                                                       workflow,
                                                       currentStep,
                                                       setCurrentStep,
                                                       isFullscreen,
                                                       toggleFullscreen,
                                                       onClose,
                                                       loading,
                                                       handleRefreshFields,
                                                       isEditing,
                                                       setIsEditing,
                                                       editedName,
                                                       setEditedName,
                                                       handleEditSave,
                                                       handleEditCancel,
                                                     }) => {
  const getTriggerIcon = () => {
    const triggerStep = WorkflowHelpers.getTriggerStep(workflow)
    switch (triggerStep?.service) {
      case "facebook_lead_ads":
        return <Facebook className="w-4 h-4 text-white" />
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded" />
    }
  }

  const getStepNumber = () => {
    switch (currentStep) {
      case "setup":
        return 1
      case "configure":
        return 2
      case "test":
        return 3
      default:
        return 1
    }
  }

  const getStepTitle = () => {
    const stepNum = getStepNumber()
    const triggerStep = WorkflowHelpers.getTriggerStep(workflow)
    if (triggerStep?.service === "facebook_lead_ads") {
      return `${stepNum}. Facebook Lead Ads`
    } else if (triggerStep?.service === "webhook") {
      return `${stepNum}. Webhook`
    }
    return `${stepNum}. ${workflow.name}`
  }

  return (
    <div className="p-4 border-b border-gray-200 flex-shrink-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">{getTriggerIcon()}</div>
          <div className="flex-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-sm font-semibold"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleEditSave()
                    if (e.key === "Escape") handleEditCancel()
                  }}
                  autoFocus
                />
                <Button variant="ghost" size="sm" className="p-1" onClick={handleEditSave}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="p-1" onClick={handleEditCancel}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <h2 className="font-semibold text-sm">{getStepTitle()}</h2>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isFullscreen && (
            <>
              <Button variant="ghost" size="sm" className="p-1">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600">Next: Step {getStepNumber() + 1}</span>
              <Button variant="ghost" size="sm" className="p-1">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" className="p-1" onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="p-1" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" className="p-1" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="flex justify-between items-center-safe">
        {/* Step Navigation */}
        <Tabs value={currentStep} onValueChange={(value) => setCurrentStep(value as 'configure' | 'test')}>
          <TabsList className="flex gap-2">
            <TabsTrigger value="configure">Configure</TabsTrigger>
            <TabsTrigger value="test">Test</TabsTrigger>
          </TabsList>
        </Tabs>
        {/* Fullscreen additional controls */}
        {isFullscreen ? (
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleRefreshFields} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh fields"}
            </Button>
            <Button variant="outline" size="sm">
              Field search
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleRefreshFields} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcwIcon className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default SidebarHeader