import { useState, useCallback } from 'react'
import { WorkflowService } from '@/lib/api/workflow-service'
import { Workflow } from '@/types/workflow'
import { WorkflowHelpers } from '@/lib/workflow-helpers'

export const useWorkflowEdit = (workflowId: number) => {
  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const loadWorkflow = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await WorkflowService.getWorkflow(workflowId)

      if (response.success) {
        setWorkflow(response.data)
        setHasUnsavedChanges(false)
      } else {
        setError('Failed to load workflow')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load workflow')
    } finally {
      setLoading(false)
    }
  }, [workflowId])

// Add dependency array to prevent unnecessary re-creation
const updateWorkflow = useCallback((updates: Partial<Workflow>) => {
  setWorkflow(prev => {
    if (!prev) return null
    const newWorkflow = { ...prev, ...updates }
    
    // Only update if there are actual changes
    if (JSON.stringify(newWorkflow) !== JSON.stringify(prev)) {
      setHasUnsavedChanges(true)
      return newWorkflow
    }
    return prev
  })
}, []) // Remove workflow dependency to prevent recreation

// Optimize validation calls
const saveWorkflow = useCallback(async () => {
  if (!workflow) return false

  try {
    setSaving(true)

    // Validate before saving
    const validation = WorkflowHelpers.validateWorkflow(workflow)
    if (!validation.isValid) {
      setError(validation.errors.join(', '))
      return false
    }

    const updateData = WorkflowHelpers.transformForAPI(workflow)
    const response = await WorkflowService.updateWorkflow(workflowId, updateData)

    if (response.success) {
      setWorkflow(response.data)
      setHasUnsavedChanges(false)
      setError(null)
      return true
    } else {
      setError('Failed to save workflow')
      return false
    }
  } catch (err: any) {
    setError(err.message || 'Failed to save workflow')
    return false
  } finally {
    setSaving(false)
  }
}, [workflow, workflowId]) // Keep necessary dependencies

  const publishWorkflow = useCallback(async () => {
    if (!workflow) return false

    try {
      // Save first if there are unsaved changes
      if (hasUnsavedChanges) {
        const saved = await saveWorkflow()
        if (!saved) return false
      }

      const response = await WorkflowService.activateWorkflow(workflowId)

      if (response.success) {
        setWorkflow(prev => prev ? { ...prev, status: 'active' } : null)
        return true
      } else {
        setError('Failed to publish workflow')
        return false
      }
    } catch (err: any) {
      setError(err.message || 'Failed to publish workflow')
      return false
    }
  }, [workflow, workflowId, hasUnsavedChanges, saveWorkflow])

  return {
    workflow,
    loading,
    saving,
    error,
    hasUnsavedChanges,
    loadWorkflow,
    updateWorkflow,
    saveWorkflow,
    publishWorkflow,
    setError
  }
}