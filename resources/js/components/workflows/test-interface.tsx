import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Loader2, ChevronRightIcon } from 'lucide-react'
import { Workflow } from '@/types/workflow'
import { cn } from '@/lib/utils'
import axios from '@/lib/http'

interface TestInterfaceProps {
  workflow: Workflow
  currentTrigger?: string
  onWorkflowUpdate?: (updates: Partial<Workflow>) => void
}

// Example implementation:
export default function TestInterface({ workflow, currentTrigger, onWorkflowUpdate }: TestInterfaceProps) {
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedResult, setSelectedResult] = useState<any>(null)
  const [showFieldsPopover, setShowFieldsPopover] = useState(false)

  // Memoize expensive computations
  const triggerStep = useMemo(() =>
    workflow.steps.find(s => s.step_type === 'trigger' && s.service === currentTrigger),
    [workflow.steps, currentTrigger]
  )

  // Remove unused actionSteps computation
  // const actionSteps = useMemo(() =>
  //   workflow.steps.filter(s => s.step_type === 'action'),
  //   [workflow.steps]
  // )

  // Remove random computation from render
  const memoizedChar = useMemo(() => {
    return String.fromCharCode(65 + Math.floor(Math.random() * 26))
  }, [testResults]) // Only regenerate when test results change

  // Memoize callback functions
  const handleShowFields = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowFieldsPopover(true)
  }, [])

  const handleTest = useCallback(async () => {
    setTesting(true)
    setError(null)
    setTestResults(null)

    try {
      const response = await axios.post('/integrations/facebook/form/leads', {
        page_id: triggerStep?.configuration?.page_id,
        form_id: triggerStep?.configuration?.form_id,
        limit: 1,
      })

      if (response.data.success && response.data.leads) {
        setTestResults(response.data.leads)
      } else {
        setError('No leads found in the response')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Test failed')
    } finally {
      setTesting(false)
    }
  }, [triggerStep?.configuration?.page_id, triggerStep?.configuration?.form_id])

  // Memoize utility functions to prevent recreation on every render
  const renderFieldValue = useCallback((value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }, [])

  const formatFieldName = useCallback((name: string): string => {
    return name.replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\s+/g, ' ')
      .trim()
  }, [])

  // Use ref to track if we need to update workflow and prevent loops
  const previousSelectedResult = useRef<any>(null)
  const isUpdatingWorkflow = useRef(false)

  useEffect(() => {
    // Only update if selectedResult actually changed and we're not already updating
    if (selectedResult &&
        selectedResult !== previousSelectedResult.current &&
        triggerStep &&
        onWorkflowUpdate &&
        !isUpdatingWorkflow.current) {

      previousSelectedResult.current = selectedResult
      isUpdatingWorkflow.current = true

      // Use setTimeout to batch the update and prevent immediate re-renders
      const timeoutId = setTimeout(() => {
        const updatedSteps = workflow.steps.map(step => {
          if (step.id === triggerStep.id) {
            return {
              ...step,
              configuration: {
                ...step.configuration,
                selectedLead: selectedResult
              }
            }
          }
          return step
        })

        onWorkflowUpdate({ steps: updatedSteps })

        // Reset flag after update completes
        setTimeout(() => {
          isUpdatingWorkflow.current = false
        }, 100)
      }, 50)

      return () => clearTimeout(timeoutId)
    }
  }, [selectedResult])

  const handleCreateLead = useCallback(async () => {
    if (!selectedResult) {
      setError('Please select a lead first')
      return
    }

    setTesting(true)
    setError(null)

    try {
      const response = await axios.post(`/workflows/${workflow.id}/test`, {
        lead_data: selectedResult,
      })

      if (response.data.success) {
        alert(`Lead created successfully!\nID: ${response.data.lead.id}\nName: ${response.data.lead.name}`)
      } else {
        setError('Failed to create lead')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create lead')
    } finally {
      setTesting(false)
    }
  }, [selectedResult, workflow.id])

  // Memoize lead selection handler
  const handleSelectLead = useCallback((lead: any) => {
    setSelectedResult(lead)
  }, [])

  // Memoize card className
  const cardClassName = useMemo(() =>
    cn('hover:border-primary cursor-pointer py-2 transition-colors duration-200',
      selectedResult ? 'border-primary' : ''),
    [selectedResult]
  )

  // Memoize formatted date
  const formattedCreatedTime = useMemo(() =>
    selectedResult?.created_time
      ? new Date(selectedResult.created_time).toLocaleString()
      : '',
    [selectedResult?.created_time]
  )

  return (
    <div className="space-y-4">

      {/* Workflow Summary */}
      <div className="border border-dashed border-border rounded-lg p-4">
        <h5 className="font-medium mb-2">Test Configuration</h5>
        <div className="space-y-2 text-sm">
          We found records in your Facebook Lead Ads account. We will load 1 most recent record.
        </div>
      </div>

      <div className="flex w-full my-3 gap-2">
        <Button
          onClick={handleTest}
          variant="outline"
          className="flex-1 cursor-pointer border-dashed"
          disabled={testing}
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            'Find new records'
          )}
        </Button>

        {selectedResult && (
          <Button
            onClick={handleCreateLead}
            className="flex-1 bg-primary hover:bg-primary/90"
            disabled={testing}
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Lead'
            )}
          </Button>
        )}
      </div>

      {/* Test Results */}
      {testResults && Array.isArray(testResults) && testResults.length > 0 && (
        <Card className={cardClassName}>
          <CardContent>
            <div className="text-sm">
              {testResults.map((lead: any, index: number) => (
                <div key={index} className="flex items-center justify-between space-x-2 " onClick={() => handleSelectLead(lead)}>
                  <div>
                    <p className="">Lead {memoizedChar}</p>
                  </div>

                  <Popover open={showFieldsPopover} onOpenChange={setShowFieldsPopover}>
                    <PopoverTrigger asChild>
                      <Button
                        title="Show fields"
                        size={'icon'}
                        variant="ghost"
                        onClick={handleShowFields}
                      >
                        <ChevronRightIcon className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 max-h-96 overflow-y-auto">
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm border-b border-border pb-2">Lead Data</h4>
                        {selectedResult && (
                          <div className="space-y-3">
                            {/* Basic Lead Info */}
                            <div className="space-y-2">
                              <h5 className="font-medium text-xs text-gray-700 uppercase tracking-wide">Basic Info</h5>
                              <div className="grid grid-cols-1 gap-2">
                                <div className="text-xs">
                                  <div className="font-medium text-gray-700">ID:</div>
                                  <div className="text-gray-600 bg-gray-50 p-2 rounded border font-mono text-xs">
                                    {selectedResult.id}
                                  </div>
                                </div>
                                <div className="text-xs">
                                  <div className="font-medium text-gray-700">Created Time:</div>
                                  <div className="text-gray-600 bg-gray-50 p-2 rounded border">
                                    {formattedCreatedTime}
                                  </div>
                                </div>
                                <div className="text-xs">
                                  <div className="font-medium text-gray-700">Ad ID:</div>
                                  <div className="text-gray-600 bg-gray-50 p-2 rounded border font-mono text-xs">
                                    {selectedResult.ad_id}
                                  </div>
                                </div>
                                <div className="text-xs">
                                  <div className="font-medium text-gray-700">Form ID:</div>
                                  <div className="text-gray-600 bg-gray-50 p-2 rounded border font-mono text-xs">
                                    {selectedResult.form_id}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Form Fields */}
                            {selectedResult.field_data && (
                              <div className="space-y-2">
                                <div className="space-y-2">
                                  {selectedResult.field_data.map((field: any, index: number) => (
                                    <div key={index} className="text-xs">
                                      <div className="font-medium text-gray-700">
                                        {formatFieldName(field.name)}:
                                      </div>
                                      <div className="text-gray-600 bg-blue-50 p-2 rounded border">
                                        {renderFieldValue(field.values)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {!selectedResult && (
                          <p className="text-sm text-gray-500">No lead selected</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results Message */}
      {testResults && Array.isArray(testResults) && testResults.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="font-medium text-blue-800 mb-2">ℹ️ No Results</h5>
          <p className="text-sm text-blue-700">No leads found for the selected form.</p>
        </div>
      )}

      {/* Error Results */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h5 className="font-medium text-red-800 mb-2">❌ Test Failed</h5>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
