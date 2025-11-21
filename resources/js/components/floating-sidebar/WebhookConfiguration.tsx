import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface WebhookConfigurationProps {
  url: string
  method: string
  onUrlChange: (url: string) => void
  onMethodChange: (method: string) => void
}

export const WebhookConfiguration: React.FC<WebhookConfigurationProps> = (
  {
    url,
    method,
    onUrlChange,
    onMethodChange,
  }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="webhook-url">Webhook URL</Label>
        <Input
          id="webhook-url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://your-website.com/webhook"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="method">HTTP Method</Label>
        <select
          id="method"
          className="w-full p-2 border rounded-md"
          value={method}
          onChange={(e) => onMethodChange(e.target.value)}
        >
          <option value="POST">POST</option>
          <option value="GET">GET</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
        </select>
      </div>
    </div>
  )
}