'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Search, Info, ChevronRight, Loader2, ArrowRightIcon, ChevronRightIcon } from 'lucide-react'
import { Workflow } from '@/types/workflow'
import axios from '@/lib/axios'
import { cn } from '@/lib/utils'

interface TestInterfaceProps {
  workflow: Workflow
  currentTrigger?: string
}

// Example implementation:
export default function TestInterface({ workflow, currentTrigger }: TestInterfaceProps) {
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

  const actionSteps = useMemo(() => 
    workflow.steps.filter(s => s.step_type === 'action'),
    [workflow.steps]
  )

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
      const response = await axios.post('/api/integrations/facebook/form/leads', {
        page_id: triggerStep?.configuration?.page_id,
        form_id: triggerStep?.configuration?.form_id,
        limit: 1,
      })
      
      if (response.data && response.data.leads) {
        setTestResults(response.data.leads)
      } else {
        setError('No leads found in the response')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Test failed')
    } finally {
      setTesting(false)
    }
  }, [triggerStep?.configuration?.page_id, triggerStep?.configuration?.form_id])

  const renderFieldValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  const formatFieldName = (name: string): string => {
    return name.replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\s+/g, ' ')
      .trim()
  }

  useEffect(() => {
    const updateStepConf = () => {
      if (triggerStep?.configuration) {
        triggerStep.configuration.selectedLead = selectedResult
      }
    }

    updateStepConf()
  }, [selectedResult])

  return (
    <div className="space-y-4">

      {/* Workflow Summary */}
      <div className="border border-dashed border-gray-500 rounded-lg p-4">
        <h5 className="font-medium mb-2">Test Configuration</h5>
        <div className="space-y-2 text-sm">
          We found records in your Facebook Lead Ads account. We will load 1 most recent record.
        </div>
      </div>

      <div className="flex w-full my-3">
        <Button 
          onClick={handleTest} 
          variant="outline" 
          className="w-full cursor-pointer border-dashed"
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
      </div>

      {/* Test Results */}
      {testResults && Array.isArray(testResults) && testResults.length > 0 && (
        <Card
          className={cn('hover:border-blue-600 cursor-pointer py-2 transition-colors duration-200', selectedResult ? 'border-blue-600' : '')}>
          <CardContent>
            <div className="text-sm">
              {testResults.map((lead: any, index: number) => (
                <div key={index} className="flex items-center justify-between space-x-2 " onClick={() => setSelectedResult(lead)}>
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
                        <h4 className="font-medium text-sm border-b pb-2">Lead Data</h4>
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
                                    {new Date(selectedResult.created_time).toLocaleString()}
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