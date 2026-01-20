import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, X, ChevronDown, Search, Loader2 } from 'lucide-react'
import {IconBrandFacebook as Facebook} from "@tabler/icons-react"
import { WorkflowFieldMapping } from '@/types/workflow'
import axios from '@/lib/axios'


interface FieldMappingInterfaceProps {
  fieldMappings: WorkflowFieldMapping[]
  onFieldMappingUpdate: (mappings: WorkflowFieldMapping[]) => void
  workflow?: any
}

interface LeadField {
  id: string
  label: string
  type: string
  description: string
  required: boolean
}

const FieldMappingInterfaceComponent = ({
                                 fieldMappings,
                                 onFieldMappingUpdate,
                                 workflow
                               }: FieldMappingInterfaceProps) => {
  const [mappings, setMappings] = useState<WorkflowFieldMapping[]>(fieldMappings)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedMappingIndex, setSelectedMappingIndex] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    'form_data': true
  })
  const [leadFields, setLeadFields] = useState<LeadField[]>([])
  const [loadingLeadFields, setLoadingLeadFields] = useState(false)
  const [dialogMode, setDialogMode] = useState<'source' | 'target'>('target')

  // Track if we're updating from props to prevent loops
  const isUpdatingFromProps = useRef(false)

  // Fetch lead schema fields
  useEffect(() => {
    const fetchLeadFields = async () => {
      setLoadingLeadFields(true)
      try {
        const response = await axios.get('/workflows/schema/leads')
        if (response.data.success) {
          setLeadFields(response.data.fields)
        }
      } catch (error) {
        console.error('Failed to fetch lead fields:', error)
      } finally {
        setLoadingLeadFields(false)
      }
    }

    fetchLeadFields()
  }, [])

  // Sync with props only when they change externally (without expensive JSON.stringify)
  const previousFieldMappings = useRef<WorkflowFieldMapping[]>(fieldMappings)

  useEffect(() => {
    if (!isUpdatingFromProps.current && fieldMappings !== previousFieldMappings.current) {
      // Simple shallow comparison - much faster than JSON.stringify
      if (fieldMappings.length !== mappings.length ||
          fieldMappings.some((fm, i) => fm !== mappings[i])) {
        setMappings(fieldMappings)
        previousFieldMappings.current = fieldMappings
      }
    }
    isUpdatingFromProps.current = false
  }, [fieldMappings, mappings])

  // Update parent immediately without setTimeout
  const updateParent = useCallback((updatedMappings: WorkflowFieldMapping[]) => {
    isUpdatingFromProps.current = true
    onFieldMappingUpdate(updatedMappings)
  }, [onFieldMappingUpdate])

  // Use functional setState to avoid dependency on mappings
  const handleMappingChange = useCallback((index: number, updates: Partial<WorkflowFieldMapping>) => {
    setMappings(prev => {
      const updatedMappings = prev.map((mapping, i) =>
        i === index ? { ...mapping, ...updates } : mapping
      )
      updateParent(updatedMappings)
      return updatedMappings
    })
  }, [updateParent])

  const addMapping = useCallback((e: React.MouseEvent) => {
    // Prevent event propagation
    e.preventDefault()
    e.stopPropagation()

    setMappings(prev => {
      const newMapping: WorkflowFieldMapping = {
        id: Date.now(),
        source_field: '',
        target_field: '',
        field_type: 'text',
        transformation_rules: {},
        required: false
      }
      const updatedMappings = [...prev, newMapping]
      updateParent(updatedMappings)
      return updatedMappings
    })
  }, [updateParent])

  const removeMapping = useCallback((index: number, e: React.MouseEvent) => {
    // Prevent event propagation
    e.preventDefault()
    e.stopPropagation()

    setMappings(prev => {
      const updatedMappings = prev.filter((_, i) => i !== index)
      updateParent(updatedMappings)
      return updatedMappings
    })
  }, [updateParent])

  const openFieldSelector = useCallback((index: number, mode: 'source' | 'target', e: React.MouseEvent) => {
    // Prevent event propagation
    e.preventDefault()
    e.stopPropagation()

    setSelectedMappingIndex(index)
    setDialogMode(mode)
    setIsDialogOpen(true)
  }, [])

  const selectField = useCallback((fieldId: string, _fieldLabel: string) => {
    if (selectedMappingIndex !== null) {
      if (dialogMode === 'source') {
        handleMappingChange(selectedMappingIndex, { source_field: fieldId })
      } else {
        handleMappingChange(selectedMappingIndex, { target_field: fieldId })
      }
    }
    setIsDialogOpen(false)
    setSelectedMappingIndex(null)
    setSearchTerm('')
  }, [selectedMappingIndex, dialogMode, handleMappingChange])

  // Memoize filtered arrays to prevent recalculation on every render
  const filteredLeadFields = useMemo(() =>
    leadFields.filter(field =>
      field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      field.id.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [leadFields, searchTerm]
  )

  // Selected lead from test-interface (stored on the trigger step configuration)
  const selectedLead = useMemo(() => {
    const steps = (workflow && Array.isArray(workflow.steps)) ? workflow.steps : []
    const triggerWithLead = steps.find((s: any) => s.step_type === 'trigger' && s.configuration && s.configuration.selectedLead)
    return triggerWithLead?.configuration?.selectedLead
  }, [workflow?.steps])

  const formatFieldName = useCallback((name: string): string => {
    return name.replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\s+/g, ' ')
      .trim()
  }, [])

  const renderFieldValue = useCallback((value: unknown): string => {
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    if (typeof value === 'object' && value !== null) {
      try {
        return JSON.stringify(value)
      } catch {
        return String(value)
      }
    }
    return String(value ?? '')
  }, [])

  type SelectedField = { id: string; label: string; value: string; type: string; icon: any }

  const selectedLeadFields: SelectedField[] = useMemo(() => {
    if (!selectedLead) {
      return []
    }

    const fields: SelectedField[] = []

    // Basic fields if present
    if (selectedLead.id) {
      fields.push({ id: 'id', label: 'ID', value: String(selectedLead.id), type: 'text', icon: Facebook })
    }
    if (selectedLead.created_time) {
      fields.push({ id: 'created_time', label: 'Created Time', value: String(selectedLead.created_time), type: 'datetime', icon: Facebook })
    }
    if (selectedLead.ad_id) {
      fields.push({ id: 'ad_id', label: 'Ad Id', value: String(selectedLead.ad_id), type: 'text', icon: Facebook })
    }
    if (selectedLead.form_id) {
      fields.push({ id: 'form_id', label: 'Form Id', value: String(selectedLead.form_id), type: 'text', icon: Facebook })
    }

    // Facebook field_data array
    if (Array.isArray(selectedLead.field_data)) {
      selectedLead.field_data.forEach((f: any) => {
        const id = String(f.name)
        fields.push({
          id,
          label: formatFieldName(id),
          value: renderFieldValue(f.values),
          type: 'text',
          icon: Facebook
        })
      })
    }

    return fields
  }, [selectedLead, formatFieldName, renderFieldValue])

  const filteredFields = useMemo(() =>
    selectedLeadFields.filter(field =>
      field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      field.value.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [selectedLeadFields, searchTerm]
  )

  // Memoize field display to prevent recreating on every render
  const getSelectedFieldDisplay = useCallback((targetField: string) => {
    const field = selectedLeadFields.find(f => f.id === targetField)
    if (!field) return null

    return (
      <div className="flex items-center gap-2 p-3 bg-accent border border-border rounded-lg">
        <Facebook className="w-4 h-4 text-primary" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-foreground">
            {field.label}: <span className="text-muted-foreground font-normal">{field.value}</span>
          </div>
        </div>
      </div>
    )
  }, [selectedLeadFields])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Data</h3>
          <p className="text-sm text-muted-foreground">Map form fields to your target fields</p>
        </div>
      </div>

      {/* Field Mappings */}
      <div className="space-y-3">
        {mappings.map((mapping, index) => (
          <div key={mapping.id || index}
               className="grid grid-cols-2 gap-4 p-4 border border-border rounded-lg">
            {/* Source Field - Lead Database Field */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Lead Field (Database)</Label>
              {mapping.source_field ? (
                <div className="relative">
                  <div className="flex items-center gap-2 p-3 bg-muted border border-border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground">
                        {leadFields.find(f => f.id === mapping.source_field)?.label || mapping.source_field}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {leadFields.find(f => f.id === mapping.source_field)?.description}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => openFieldSelector(index, 'source', e)}
                    className="absolute top-1 right-1 h-6 w-6 p-0"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => openFieldSelector(index, 'source', e)}
                  className="w-full h-12 border-dashed border-2 border-border hover:bg-accent hover:text-foreground"
                  disabled={loadingLeadFields}
                >
                  {loadingLeadFields ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Select lead field
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Target Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Form Data</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => removeMapping(index, e)}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {mapping.target_field ? (
                <div className="relative">
                  {getSelectedFieldDisplay(mapping.target_field)}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => openFieldSelector(index, 'target', e)}
                    className="absolute top-1 right-1 h-6 w-6 p-0"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => openFieldSelector(index, 'target', e)}
                  className="w-full h-12 border-dashed border-2 border-border hover:bg-accent hover:text-foreground"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Select Facebook form field
                </Button>
              )}
            </div>
          </div>
        ))}

        {/* Add New Mapping Button */}
        <Button
          type="button"
          variant="outline"
          onClick={addMapping}
          className="w-full h-12 border-dashed border-2 border-gray-300 hover:border-blue-400 hover:text-blue-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add field mapping
        </Button>
      </div>

      {/* Field Selection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}
        modal={true}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Insert data for Data</DialogTitle>
            <Badge variant="secondary" className="w-fit">Dynamic</Badge>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            <Button variant="ghost" className="border-b-2 border-primary text-primary rounded-none">
              Previous Steps
            </Button>
            <Button variant="ghost" className="text-muted-foreground rounded-none">
              In-use Data
            </Button>
            <Button variant="ghost" className="text-muted-foreground rounded-none">
              Variables
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {dialogMode === 'source' ? (
              /* Lead Fields Section */
              <div className="border rounded-lg">
                <div className="p-3 border-b border-border bg-muted">
                  <span className="font-medium text-foreground">Lead Database Fields</span>
                </div>
                <div>
                  {loadingLeadFields ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredLeadFields.length > 0 ? (
                    filteredLeadFields.map((field) => (
                      <button
                        key={field.id}
                        onClick={() => selectField(field.id, field.label)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-accent text-left border-b last:border-b-0"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">
                            {field.label}
                            {field.required && <span className="text-destructive ml-1">*</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {field.description || field.id}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {field.type}
                        </Badge>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No fields found
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Form Data Section */
              <div className="border rounded-lg">
                <button
                  onClick={() => setExpandedSections(prev => ({ ...prev, form_data: !prev.form_data }))}
                  className="w-full flex items-center justify-between p-3 hover:bg-accent"
                >
                  <div className="flex items-center gap-2">
                    <Facebook className="w-5 h-5 text-primary" />
                    <span className="font-medium">Facebook Form Data</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${expandedSections.form_data ? 'rotate-180' : ''}`} />
                </button>

                {expandedSections.form_data && (
                  <div className="border-t">
                    {filteredFields.map((field) => (
                      <button
                        key={field.id}
                        onClick={() => selectField(field.id, field.label)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-primary-foreground text-left border-b last:border-b-0"
                      >
                        <field.icon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">
                            {field.label}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {field.value}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

FieldMappingInterfaceComponent.displayName = 'FieldMappingInterface'

// Memoize the component with custom comparison to prevent unnecessary re-renders
const FieldMappingInterface = React.memo(
  FieldMappingInterfaceComponent,
  (prevProps, nextProps) => {
    // Only re-render if field mappings array length changed or callback changed
    // Don't re-render if parent workflow object changed but field mappings are the same
    if (prevProps.fieldMappings.length !== nextProps.fieldMappings.length) {
      return false // Re-render
    }

    if (prevProps.onFieldMappingUpdate !== nextProps.onFieldMappingUpdate) {
      return false // Re-render
    }

    // Deep compare field mappings to detect actual changes
    for (let i = 0; i < prevProps.fieldMappings.length; i++) {
      const prev = prevProps.fieldMappings[i]
      const next = nextProps.fieldMappings[i]

      if (prev.source_field !== next.source_field ||
          prev.target_field !== next.target_field ||
          prev.field_type !== next.field_type ||
          prev.required !== next.required) {
        return false // Re-render
      }
    }

    return true // Skip re-render
  }
)

export default FieldMappingInterface
