import React from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Info, HelpCircle, Settings } from 'lucide-react'

interface FacebookConfigurationProps {
  selectedPage: string
  selectedForm: string
  pageName?: string
  formName?: string
  onPageSelect: () => void
  onFormSelect: () => void
}

export const FacebookConfiguration: React.FC<FacebookConfigurationProps> = ({
                                                                              selectedPage,
                                                                              selectedForm,
                                                                              pageName,
                                                                              formName,
                                                                              onPageSelect,
                                                                              onFormSelect,
                                                                            }) => {
  return (
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
          onClick={onPageSelect}
        >
          {selectedPage || pageName || 'Select a page'}
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
          onClick={onFormSelect}
          disabled={!selectedPage && !pageName}
        >
          {selectedForm || formName || 'Select a form'}
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
  )
}