import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, X, Loader2, RefreshCw, AlertCircle, FileText, Calendar } from "lucide-react"
import { Workflow } from '@/types/workflow'
import axios from "@/lib/axios"

interface FacebookForm {
  id: string
  name: string
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED'
  created_at: string
  leadgen_export_csv_url?: string
  leads_count?: number
  page_id: string
}

interface FormSelectionModalProps {
  open: boolean
  onClose: () => void
  selectedForm: string
  selectedPage: string
  onSelectForm: (formId: string, formName?: string) => void  // Enhanced callback
  workflow?: Workflow  // Optional workflow context
}

export default function FormSelectionModal({
                                             open,
                                             onClose,
                                             selectedForm,
                                             selectedPage,
                                             onSelectForm,
                                             workflow
                                           }: FormSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [tempSelected, setTempSelected] = useState(selectedForm)
  const [forms, setForms] = useState<FacebookForm[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalForms, setTotalForms] = useState(0)

  const filteredForms = forms.filter((form) =>
    form.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    form.id.includes(searchTerm)
  )

  // Update temp selection when selectedForm prop changes
  useEffect(() => {
    setTempSelected(selectedForm)
  }, [selectedForm])

  useEffect(() => {
    if (open && selectedPage) {
      setCurrentPage(1)
      fetchForms(1)
    } else if (open && !selectedPage) {
      setError("Please select a Facebook page first")
    } else {
      // Reset state when modal closes
      setSearchTerm("")
      setError(null)
      setForms([])
      setCurrentPage(1)
    }
  }, [open, selectedPage])

  const fetchForms = async (page: number = 1) => {
    if (!selectedPage) {
      setError("No page selected")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = {
        page_id: selectedPage,
        per_page: 10
      }

      const response = await axios.post(`/integrations/facebook/forms?page=${page}`, params)
      const data = await response.data

      if (data.success) {
        if (page === 1) {
          setForms(data.forms)
        } else {
          setForms(prev => [...prev, ...data.forms])
        }
        setHasMore(data.meta?.has_more || false)
        setTotalForms(data.meta?.total || 0)
        setCurrentPage(page)
      } else {
        throw new Error(data.message || 'Failed to fetch forms')
      }
    } catch (error: any) {
      console.error("Failed to fetch forms:", error)
      setError(error.message || 'Failed to load Facebook forms')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (!hasMore || loading) return
    await fetchForms(currentPage + 1)
  }

  const handleSelect = () => {
    if (!tempSelected) return

    const selectedFormData = forms.find(form => form.id === tempSelected)
    onSelectForm(tempSelected, selectedFormData?.name)
    onClose()
  }

  const refreshResults = () => {
    setForms([])
    setHasMore(true)
    setCurrentPage(1)
    fetchForms(1)
  }

  const clearSelection = () => {
    setTempSelected("")
  }

  // Get current form name for display
  const getCurrentFormName = () => {
    if (!selectedForm) return null
    const currentForm = forms.find(form => form.id === selectedForm)
    return currentForm?.name || selectedForm
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'primary'
      case 'ARCHIVED': return 'secondary'
      case 'DELETED': return 'destructive'
      default: return 'outline'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl [&>button]:hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle>Select Lead Form</DialogTitle>
              <Badge variant="secondary">Facebook Lead Ads</Badge>
              {workflow && (
                <Badge variant="outline" className="text-xs">
                  {workflow.name}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Selection Info */}
          {selectedForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm">
                <span className="font-medium">Currently selected:</span> {getCurrentFormName()}
              </div>
            </div>
          )}

          {/* No Page Selected Warning */}
          {!selectedPage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select a Facebook page first before choosing a form.
              </AlertDescription>
            </Alert>
          )}

          {/* Error State */}
          {error && selectedPage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshResults}
                  disabled={loading}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* No Forms State */}
          {!loading && !error && selectedPage && forms.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <div className="text-gray-500 mb-2">
                No lead forms found for this page
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Create lead forms in Facebook Ads Manager to capture leads
              </p>
              <Button
                variant="outline"
                onClick={() => window.open('https://www.facebook.com/ads/manager', '_blank')}
              >
                Open Ads Manager
              </Button>
            </div>
          )}

          {/* Search */}
          {forms.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search forms by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {/* Form List */}
          {loading && forms.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600">Loading lead forms...</p>
              </div>
            </div>
          ) : forms.length > 0 ? (
            <div className="space-y-4">
              <RadioGroup value={tempSelected} onValueChange={setTempSelected}>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredForms.map((form) => (
                    <div
                      key={form.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-primary-foreground ${
                        tempSelected === form.id
                          ? 'border-blue-200 bg-blue-800'
                          : 'border-gray-200'
                      }`}
                      onClick={() => setTempSelected(form.id)}
                    >
                      <RadioGroupItem value={form.id} id={form.id} />
                      <div className="flex-1">
                        <Label htmlFor={form.id} className="cursor-pointer">
                          <div>
                            <div className="font-medium">{form.name}</div>
                            <div className="text-sm text-gray-500">ID: {form.id}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Calendar className="w-3 h-3" />
                                Created {formatDate(form.created_at)}
                              </div>
                              {form.leads_count !== undefined && (
                                <div className="text-xs text-gray-400">
                                  {form.leads_count} leads
                                </div>
                              )}
                            </div>
                          </div>
                        </Label>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={getStatusVariant(form.status)} className="text-xs">
                          {form.status}
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {searchTerm && filteredForms.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      No forms found matching {`"${searchTerm}"`}
                    </div>
                  )}
                </div>
              </RadioGroup>

              {/* Load More & Actions */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-sm text-gray-600">
                  {searchTerm
                    ? `Showing ${filteredForms.length} of ${forms.length} forms (filtered from ${totalForms} total)`
                    : `Showing ${forms.length} of ${totalForms} forms`
                  }
                </div>

                <div className="flex gap-2">
                  {hasMore && !searchTerm && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadMore}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Loading...
                        </>
                      ) : (
                        'Load more'
                      )}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshResults}
                    disabled={loading}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh
                  </Button>

                  {tempSelected && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Help Text */}
          {selectedPage && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">About lead forms:</p>
                <ul className="text-xs space-y-1">
                  <li>• Only active forms can capture new leads</li>
                  <li>• Forms must be published and running ads to generate leads</li>
                  <li>• You can create new forms in Facebook Ads Manager</li>
                  <li>• Form fields will be available for mapping after selection</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!tempSelected || !selectedPage}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Select Form
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
