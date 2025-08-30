// lib/workflow-helpers.ts
import { Workflow, WorkflowStep } from '@/types/workflow'

export class WorkflowHelpers {
  /**
   * Get the trigger step from a workflow
   */
  static getTriggerStep(workflow: Workflow): WorkflowStep | undefined {
    return workflow.steps.find(step => step.step_type === 'trigger')
  }

  /**
   * Get all action steps from a workflow
   */
  static getActionSteps(workflow: Workflow): WorkflowStep[] {
    return workflow.steps.filter(step => step.step_type === 'action')
  }

  /**
   * Update a specific step in the workflow
   */
  static updateStep(workflow: Workflow, stepId: number, updates: Partial<WorkflowStep>): Workflow {
    return {
      ...workflow,
      steps: workflow.steps.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
      )
    }
  }

  /**
   * Add a new step to the workflow
   */
  static addStep(workflow: Workflow, newStep: Omit<WorkflowStep, 'id'>): Workflow {
    const maxId = Math.max(...workflow.steps.map(s => s.id), 0)
    const stepWithId: WorkflowStep = {
      ...newStep,
      id: maxId + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    return {
      ...workflow,
      steps: [...workflow.steps, stepWithId]
    }
  }

  /**
   * Remove a step from the workflow
   */
  static removeStep(workflow: Workflow, stepId: number): Workflow {
    return {
      ...workflow,
      steps: workflow.steps.filter(step => step.id !== stepId)
    }
  }

  /**
   * Update Facebook Lead Ads configuration
   */
  static updateFacebookConfig(
    workflow: Workflow,
    pageId: string,
    formId: string,
    pageName?: string,
    formName?: string
  ): Workflow {
    return {
      ...workflow,
      steps: workflow.steps.map(step => {
        if (step.step_type === 'trigger' && step.service === 'facebook_lead_ads') {
          return {
            ...step,
            configuration: {
              ...step.configuration,
              page_id: pageId,
              form_id: formId,
              page_name: pageName || pageId,
              form_name: formName || formId
            }
          }
        }
        return step
      })
    }
  }

  /**
   * Update webhook configuration
   */
  static updateWebhookConfig(
    workflow: Workflow,
    url: string,
    method: string = 'POST',
    headers?: Record<string, string>
  ): Workflow {
    return {
      ...workflow,
      steps: workflow.steps.map(step => {
        if (step.service === 'webhook') {
          return {
            ...step,
            configuration: {
              ...step.configuration,
              url,
              method,
              headers: headers || step.configuration.headers
            }
          }
        }
        return step
      })
    }
  }

  /**
   * Validate workflow before saving/publishing
   */
  static validateWorkflow(workflow: Workflow): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check if workflow has a name
    if (!workflow.name || workflow.name.trim() === '') {
      errors.push('Workflow name is required')
    }

    // Check if workflow has at least one trigger
    const triggerSteps = workflow.steps.filter(step => step.step_type === 'trigger')
    if (triggerSteps.length === 0) {
      errors.push('Workflow must have at least one trigger')
    }

    // Check if workflow has at least one action
    const actionSteps = workflow.steps.filter(step => step.step_type === 'action')
    if (actionSteps.length === 0) {
      errors.push('Workflow must have at least one action')
    }

    // Validate trigger configurations
    triggerSteps.forEach((step, index) => {
      if (step.service === 'facebook_lead_ads') {
        if (!step.configuration.page_id) {
          errors.push(`Facebook trigger ${index + 1}: Page selection is required`)
        }
        if (!step.configuration.form_id) {
          errors.push(`Facebook trigger ${index + 1}: Form selection is required`)
        }
      }

      if (step.service === 'webhook') {
        if (!step.configuration.webhook_url && !step.configuration.url) {
          errors.push(`Webhook trigger ${index + 1}: URL is required`)
        }
      }
    })

    // Validate action configurations
    actionSteps.forEach((step, index) => {
      if (step.service === 'webhook') {
        if (!step.configuration.url) {
          errors.push(`Webhook action ${index + 1}: URL is required`)
        }
      }

      if (step.service === 'email') {
        if (!step.configuration.to && !step.configuration.template) {
          errors.push(`Email action ${index + 1}: Recipient or template is required`)
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get workflow status display info
   */
  static getStatusInfo(status: Workflow['status']) {
    switch (status) {
      case 'active':
        return { label: 'Active', color: 'green', description: 'Workflow is running' }
      case 'paused':
        return { label: 'Paused', color: 'yellow', description: 'Workflow is temporarily stopped' }
      case 'draft':
        return { label: 'Draft', color: 'gray', description: 'Workflow is being configured' }
      case 'inactive':
        return { label: 'Inactive', color: 'red', description: 'Workflow is disabled' }
      default:
        return { label: 'Unknown', color: 'gray', description: 'Unknown status' }
    }
  }

  /**
   * Transform workflow for API submission
   */
  static transformForAPI(workflow: Workflow) {
    return {
      name: workflow.name,
      description: workflow.description,
      status: workflow.status,
      metadata: workflow.metadata,
      steps: workflow.steps.map((step, index) => ({
        temp_id: `step_${index + 1}`,
        step_type: step.step_type,
        service: step.service,
        operation: step.operation,
        order: step.order,
        enabled: step.enabled,
        configuration: step.configuration,
        field_mappings: step.field_mappings || []
      })),
      connections: [] // Add your connection logic here
    }
  }
}