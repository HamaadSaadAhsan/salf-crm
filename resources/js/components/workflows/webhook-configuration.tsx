import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Copy } from "lucide-react"

export default function WebhookConfiguration() {
  const [webhookUrl, setWebhookUrl] = useState("https://crm-api.saadahsan.com/api/webhooks/facebook")
  const [verifyToken, setVerifyToken] = useState("webhook_verify_token")

  const subscriptionFields = [
    { id: "messages", label: "messages", checked: true },
    { id: "reactions", label: "reactions", checked: true },
    { id: "messaging_postbacks", label: "messaging_postbacks", checked: true },
    { id: "leadgen", label: "leadgen", checked: false },
    { id: "feed", label: "feed", checked: true },
    { id: "comments", label: "comments", checked: true },
    { id: "message_deliveries", label: "message_deliveries", checked: true },
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 border-b border-gray-700">
        <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-semibold">Facebook Integration</h1>
      </div>

      {/* Navigation Tabs */}
      <Tabs defaultValue="webhooks" className="p-6">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="setup" className="data-[state=active]:bg-gray-700">
            Setup
          </TabsTrigger>
          <TabsTrigger value="permissions" className="data-[state=active]:bg-gray-700">
            Permissions
          </TabsTrigger>
          <TabsTrigger value="pages" className="data-[state=active]:bg-gray-700">
            Pages
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="data-[state=active]:bg-gray-700">
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="lead-generation" className="data-[state=active]:bg-gray-700">
            Lead Generation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="mt-8">
          <Card className="bg-gray-800 border-gray-700 p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Webhook Configuration</h2>
                <p className="text-gray-400 text-sm">Set up webhooks to receive real-time updates from Facebook.</p>
              </div>

              {/* Webhook URL */}
              <div className="space-y-2">
                <Label htmlFor="webhook-url" className="text-white">
                  Webhook URL
                </Label>
                <div className="flex">
                  <Input
                    id="webhook-url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white flex-1"
                  />
                  <Button
                    variant="outline"
                    className="ml-2 border-gray-600 text-white hover:bg-gray-700 bg-transparent"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Verify Token */}
              <div className="space-y-2">
                <Label htmlFor="verify-token" className="text-white">
                  Verify Token
                </Label>
                <div className="flex">
                  <Input
                    id="verify-token"
                    value={verifyToken}
                    onChange={(e) => setVerifyToken(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white flex-1"
                  />
                  <Button
                    variant="outline"
                    className="ml-2 border-gray-600 text-white hover:bg-gray-700 bg-transparent"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Subscription Fields */}
              <div className="space-y-4">
                <Label className="text-white">Subscription Fields</Label>
                <div className="grid grid-cols-2 gap-4">
                  {subscriptionFields.map((field) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={field.id}
                        checked={field.checked}
                        className="border-gray-600 data-[state=checked]:bg-blue-600"
                      />
                      <Label htmlFor={field.id} className="text-white text-sm">
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <Button className="w-full bg-white text-black hover:bg-gray-100">Save Webhook Settings</Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
