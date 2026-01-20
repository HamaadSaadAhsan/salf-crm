import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, X, Loader2, RefreshCw, AlertCircle, CheckCircle } from "lucide-react"
import { IconBrandFacebook as Facebook } from "@tabler/icons-react"
import { Workflow } from "@/types/workflow"
import axios from "@/lib/axios"

interface FacebookPage {
  id: string
  name: string
  access_token?: string
  category?: string
  tasks?: string[]
  is_published?: boolean
}

interface PageSelectionModalProps {
  open: boolean
  onClose: () => void
  selectedPage: string  // This will be the page ID
  onSelectPage: (pageId: string, pageName?: string) => void  // Enhanced callback
  workflow?: Workflow   // Optional workflow context
}

export default function PageSelectionModal({
 open,
 onClose,
 selectedPage,
 onSelectPage,
 workflow
}: PageSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [tempSelected, setTempSelected] = useState(selectedPage)
  const [pages, setPages] = useState<FacebookPage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const filteredPages = pages.filter((page) =>
    page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    page.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Reset temp selection when modal opens
  useEffect(() => {
    if (open) {
      setTempSelected(selectedPage)
      setError(null)
      setSearchTerm("")

      // Fetch pages if we don't have any or if we need to refresh
      if (pages.length === 0) {
        fetchPages()
      }
    }
  }, [open, pages.length, selectedPage])

  const fetchPages = async (offset: number = 0) => {
    setLoading(true)
    setError(null)

    try {
      const params = {
        offset: offset.toString(),
        search: searchTerm,
        limit: '50' // Fetch more pages at once
      }

      const response = await axios.post(`/integrations/facebook/pages`, params, {})
      const data = await response.data

      if (data.success) {
        if (offset === 0) {
          setPages(data.pages || [])
        } else {
          setPages(prev => [...prev, ...(data.pages || [])])
        }
        setHasMore(data.meta.has_more || false)

        // If no pages found, show a helpful message
        if ((data.pages || []).length === 0 && offset === 0) {
          setError("No Facebook pages found. Make sure your Facebook account is connected and you have access to pages.")
        }
      } else {
        setError(data.message || "Failed to fetch Facebook pages")
      }
    } catch (err: any) {
      console.error("Failed to fetch pages:", err)
      setError("Failed to connect to Facebook. Please check your internet connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (loading || !hasMore) return
    await fetchPages(pages.length)
  }

  const handleSelect = () => {
    if (!tempSelected) return
    // Find the selected page to get both ID and name
    const selectedPageData = pages.find(page => {
      return page.id == tempSelected
    })

    if (selectedPageData) {
      onSelectPage(selectedPageData.id, selectedPageData.name)
    } else {

      onSelectPage(tempSelected)
    }

    onClose()
  }

  const refreshResults = async () => {
    setRefreshing(true)
    setPages([])
    setHasMore(true)
    await fetchPages(0)
    setRefreshing(false)
  }

  const clearSelection = () => {
    setTempSelected("")
  }

  const getSelectedPageName = () => {
    if (!tempSelected) return ""
    const page = pages.find(p => p.id === tempSelected)
    return page?.name
  }

  const renderPageItem = (page: FacebookPage) => {
    const isSelected = tempSelected === page.id
    const hasRequiredPermissions = page.tasks?.includes('MANAGE') || page.tasks?.includes('ADVERTISE')

    return (
      <div
        key={page.id}
        className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
          isSelected
            ? ''
            : 'hover:bg-primary-foreground border-transparent'
        }`}
      >
        <RadioGroupItem
          className={`[data-state=checked]: ${isSelected ? 'ring-2 ring-blue-600 text-blue-600' : ''}`}
          value={page.id}
          id={page.id}
        />
        <div className="flex items-center gap-2 flex-1">
          <Facebook className="w-5 h-5 text-blue-600" />
          <Label htmlFor={page.id} className="flex-1 cursor-pointer text-blue-200">
            <div>
              <div className="font-medium">{page.name}</div>
              <div className="text-sm text-gray-500">
                ID: {page.id}
                {page.category && ` • ${page.category}`}
              </div>
            </div>
          </Label>

          {/* Permission indicators */}
          <div className="flex items-center gap-1">
            {hasRequiredPermissions ? (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs">Accessible</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs">Limited access</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] [&>button]:hidden pt-2">
        <DialogDescription></DialogDescription>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Facebook className="w-5 h-5 text-blue-600" />
              <DialogTitle>Select Facebook Page</DialogTitle>
              <Badge variant="secondary">
                {workflow?.status === 'active' ? 'Live' : 'Configuration'}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Selection Info */}
          {tempSelected && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-800">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Selected: {getSelectedPageName()}
                </span>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search pages by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Page List */}
          {loading && pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
              <p className="text-sm text-gray-600">Loading your Facebook pages...</p>
            </div>
          ) : (
            <>
              {filteredPages.length > 0 ? (
                <RadioGroup value={tempSelected} onValueChange={setTempSelected}>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredPages.map(renderPageItem)}
                  </div>
                </RadioGroup>
              ) : (
                <div className="text-center py-12">
                  <Facebook className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">
                    {searchTerm
                      ? `No pages found matching "${searchTerm}"`
                      : "No Facebook pages available"
                    }
                  </p>
                  {!searchTerm && (
                    <p className="text-sm text-gray-400">
                      Make sure your Facebook account is connected and you have page access.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-gray-600 border-t pt-3">
            <span>
              {searchTerm
                ? `${filteredPages.length} of ${pages.length} pages shown`
                : `${pages.length} pages loaded`
              }
            </span>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {hasMore && !searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Load more
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={refreshResults}
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
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

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex gap-2">
              <Facebook className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Page Requirements:</p>
                <ul className="text-xs space-y-1">
                  <li>• You must be an admin or have advertiser access</li>
                  <li>• Page must be published and active</li>
                  <li>• Lead ads must be enabled for the page</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            {tempSelected ? (
              `${getSelectedPageName()} selected`
            ) : (
              "Select a page to continue"
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSelect}
              disabled={!tempSelected}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Select Page
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}