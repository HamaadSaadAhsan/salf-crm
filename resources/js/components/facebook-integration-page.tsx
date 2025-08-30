import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, CheckCircle, AlertCircle, Clock, Zap, MessageSquare, BarChart3, Users, Target } from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import AppLayout from "@/layouts/app-layout"
import { Link } from "@inertiajs/react"
import axios from "axios"
import { ArrowLeft, Loader2, ArrowRight } from "lucide-react"
import { toast } from "sonner"

interface FacebookPage {
  id: string
  name: string
  page_id: string
  access_token: string
}

interface IntegrationHealth {
  api: boolean
  webhooks: boolean
  permissions: boolean
  lastChecked: Date
}

export default function FacebookIntegrationPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [showToken, setShowToken] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [setupProgress, setSetupProgress] = useState(0)

  const [pages, setPages] = useState<FacebookPage[]>([])
  const [selectedPageId, setSelectedPageId] = useState("")
  const [pageAccessToken, setPageAccessToken] = useState("")
  const [isFetchingPages, setIsFetchingPages] = useState(false)

  const [healthStatus, setHealthStatus] = useState<IntegrationHealth>({
    api: false,
    webhooks: false,
    permissions: false,
    lastChecked: new Date(),
  })

  const [config, setConfig] = useState({
    appId: "",
    appSecret: "",
    pageId: "",
    accessToken: "",
    enableMessaging: true,
    enablePosts: true,
    enableInsights: true,
    enableLeadGen: true,
    webhook_verify_token: "",
  })

  const [webhookUrl, setWebhookUrl] = useState("")

  const [webhookSettings, setWebhookSettings] = useState({
    subscriptions: {
      messages: true,
      feed: true,
      reactions: true,
      comments: true,
      messaging_postbacks: true,
      message_deliveries: true,
      leadgen: true,
    },
  })

  const integrationTemplates = [
    {
      name: "Lead Generation Focus",
      description: "Optimized for capturing and managing leads from Facebook",
      features: ["leadgen", "messaging", "notifications"],
      icon: Target,
      color: "bg-blue-500",
    },
    {
      name: "Social Media Management",
      description: "Perfect for managing posts, comments, and engagement",
      features: ["posts", "comments", "insights"],
      icon: MessageSquare,
      color: "bg-green-500",
    },
    {
      name: "Customer Service Hub",
      description: "Streamlined for customer support and communication",
      features: ["messaging", "comments", "reactions"],
      icon: Users,
      color: "bg-purple-500",
    },
  ]

  const checkIntegrationHealth = async () => {
    try {
      const response = await axios.get("/integrations/facebook/health")
      if (response.data.success) {
        setHealthStatus({
          ...response.data.health,
          lastChecked: new Date(),
        })
      }
    } catch (error) {
      console.error("Health check failed:", error)
    }
  }

  const selectTemplate = (template: (typeof integrationTemplates)[0]) => {
    const newConfig = { ...config }
    newConfig.enableMessaging = template.features.includes("messaging")
    newConfig.enablePosts = template.features.includes("posts")
    newConfig.enableInsights = template.features.includes("insights")
    newConfig.enableLeadGen = template.features.includes("leadgen")
    setConfig(newConfig)
    toast.success(`Applied ${template.name} template`)
  }

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
      setSetupProgress((currentStep / 4) * 100)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setSetupProgress(((currentStep - 2) / 4) * 100)
    }
  }

  const handleWebhookToggle = (field: string, value: boolean) => {
    setWebhookSettings((prev) => {
      const newState = {
        ...prev,
        subscriptions: {
          ...prev.subscriptions,
          [field]: value,
        },
      }

      return newState
    })
  }

  // Fetch pages that the user manages
  const fetchPages = async () => {
    setIsFetchingPages(true)
    try {
      const response = await axios.get("/integrations/facebook/pages")

      if (response.data.success) {
        setPages(response.data.pages)
        toast.success(`Found ${response.data.pages.length} pages`)
      } else {
        throw new Error(response.data.message || "Failed to fetch pages")
      }
    } catch (error: any) {
      console.error("Error fetching pages:", error)
      toast.error(error.response?.data?.message || "Failed to fetch Facebook pages")
    } finally {
      setIsFetchingPages(false)
    }
  }

  // Select a page and get its access token
  const handlePageSelect = (pageId: string) => {
    const selectedPage = pages.find((page) => page.id === pageId || page.page_id === pageId)
    if (selectedPage) {
      setSelectedPageId(pageId)
      setPageAccessToken(selectedPage.access_token)

      // Update your config with the selected page info
      setConfig((prev) => ({
        ...prev,
        pageId: pageId,
        accessToken: selectedPage.access_token,
      }))

      toast.success(`Selected page: ${selectedPage.name}`)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    setConfig((prev) => ({ ...prev, [name]: value }))
  }

  const handleToggleChange = (name: string, value: boolean) => {
    setConfig((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const response = await axios.post("/integrations/facebook", config)

      if (response.data.success) {
        toast.success("Facebook integration settings saved successfully")

        if (response.data.verified) {
          toast.success("Facebook credentials verified successfully")
        } else {
          toast.warning("Facebook credentials saved but could not be verified")
        }
      } else {
        throw new Error(response.data.message || "Failed to save settings")
      }
    } catch (error: any) {
      console.error("Error saving Facebook integration", error)

      // Handle validation errors
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors
          .map((err: any) => `${err.path.join(".")}: ${err.message}`)
          .join(", ")

        toast.error(`Validation error: ${errorMessages}`)
      } else {
        toast.error("Failed to save Facebook integration settings")
      }
    } finally {
      setIsLoading(false)
    }
  }
  const handleSavePages = async () => {
    setIsLoading(true)
    try {
      const response = await axios.post("/meta-pages", pages, {
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.data.success) {
        toast.success("Facebook pages saved successfully")
      } else {
        toast.error(response.data.message || "Failed to save pages")
        throw new Error(response.data.message || "Failed to save pages")
      }
    } catch (error: any) {
      console.error("Error saving Facebook pages", error)

      // Handle validation errors
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors
          .map((err: any) => `${err.path.join(".")}: ${err.message}`)
          .join(", ")

        toast.error(`Validation error: ${errorMessages}`)
      } else {
        toast.error("Failed to save Facebook pages")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const requestPermission = async () => {
    setIsLoading(true)

    try {
      const response = await axios.post("/integrations/facebook/oauth/authorize")

      if (response.data.auth_url) {
        window.location.href = response.data.auth_url
      }
    } catch (error) {
      toast.error("Failed to initiate Facebook OAuth")
    } finally {
      setIsLoading(false)
    }
  }

  const syncLeadForms = async () => {
    try {
      setIsLoading(true)
      const response = await axios.post("/integrations/facebook/sync-lead-forms")

      if (response.data.success) {
        toast.success(`Successfully synced ${response.data.count} lead forms`)
      } else {
        throw new Error(response.data.message || "Failed to sync lead forms")
      }
    } catch (error) {
      console.error("Error syncing lead forms", error)
      toast.error("Failed to sync lead forms from Facebook")
    } finally {
      setIsLoading(false)
    }
  }

  const syncLeads = async () => {
    try {
      setIsLoading(true)
      const response = await axios.post("/integrations/facebook/sync-leads")

      if (response.data.success) {
        toast.success(`Successfully synced ${response.data.count} leads`)
      } else {
        throw new Error(response.data.message || "Failed to sync leads")
      }
    } catch (error) {
      console.error("Error syncing leads", error)
      toast.error("Failed to sync leads from Facebook")
    } finally {
      setIsLoading(false)
    }
  }

  const saveWebhookSettings = async () => {
    setIsLoading(true)
    try {
      // First, save the webhook settings to your database
      const response = await axios.post("/integrations/facebook/webhooks", {
        appId: config.appId,
        pageId: config.pageId,
        subscriptions: webhookSettings.subscriptions,
      })

      if (response.data.success) {
        toast.success("Webhook settings saved to database")
        toast.success("Successfully subscribed to Facebook webhook events")
      } else {
        throw new Error(response.data.message || "Failed to save webhook settings")
      }
    } catch (error: any) {
      console.error("Error saving webhook settings", error)
      toast.error(error.response?.data?.message || "Failed to set up webhook subscriptions")
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch existing configuration on a page load
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await axios.get("/integrations/facebook")

        if (response.data.success && response.data.exists) {
          const { config: savedConfig } = response.data.integration

          setConfig({
            appId: savedConfig.appId || "",
            appSecret: savedConfig.appSecret, // Don't display the actual secret
            pageId: savedConfig.pageId || "",
            accessToken: savedConfig.accessToken, // Don't display the actual token
            enableMessaging: savedConfig.enableMessaging ?? true,
            enablePosts: savedConfig.enablePosts ?? true,
            enableInsights: savedConfig.enableInsights ?? true,
            enableLeadGen: savedConfig.enableLeadGen ?? true,
            webhook_verify_token: savedConfig.webhook_verify_token || "",
          })

          toast.info("Loaded existing Facebook configuration")
        }
      } catch (error) {
        console.error("Failed to load Facebook configuration", error)
        toast.error("Failed to load existing configuration")
      } finally {
        setIsFetching(false)
      }
    }

    const fetchWebhookConfig = async () => {
      try {
        const response = await axios.get("/integrations/facebook/webhook-config")

        if (response.data.success) {
          setWebhookUrl(response.data.webhook_url || "")
        }
      } catch (error) {
        console.error("Failed to load webhook configuration", error)
      }
    }

    const fetchSavedPages = async () => {
      setIsFetchingPages(true)
      try {
        const response = await axios.post("/integrations/facebook/pages")

        if (response.data.success && response.data.pages.length > 0) {
          setPages(response.data.pages)

          toast.info("Loaded existing Facebook configuration")
        }
      } catch (error) {
        console.error("Failed to load Facebook configuration", error)
        toast.error("Failed to load existing configuration")
      } finally {
        setIsFetchingPages(false)
      }
    }

    fetchConfig()
    fetchWebhookConfig()
    fetchSavedPages()
  }, [])

  // Show loading state while fetching initial data
  if (isFetching) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <Loader2 className="mb-4 h-8 w-8 animate-spin" />
        <p>Loading Facebook integration...</p>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="flex min-h-screen flex-col bg-background p-6">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/integrations" className="text-muted-foreground hover:text-foreground">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-foreground text-balance">Facebook Integration</h1>
            <p className="text-muted-foreground mt-2">Connect and manage your Facebook business presence</p>
          </div>

          <Card className="w-80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-foreground">Integration Health</CardTitle>
                <Button variant="ghost" size="sm" onClick={checkIntegrationHealth}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">API Connection</span>
                {healthStatus.api ? (
                  <Badge variant="default" className="bg-green-600 text-white dark:bg-green-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Inactive
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Webhooks</span>
                {healthStatus.webhooks ? (
                  <Badge variant="default" className="bg-green-600 text-white dark:bg-green-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Permissions</span>
                {healthStatus.permissions ? (
                  <Badge variant="default" className="bg-green-600 text-white dark:bg-green-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Granted
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Required
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Last checked: {healthStatus.lastChecked.toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Setup Progress</h2>
            <span className="text-sm text-muted-foreground">Step {currentStep} of 4</span>
          </div>
          <Progress value={setupProgress} className="mb-6" />

          <div className="flex items-center gap-4 mb-8">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step < currentStep ? <CheckCircle className="h-4 w-4" /> : step}
                </div>
                {step < 4 && <div className={`w-12 h-0.5 ${step < currentStep ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>
        </div>

        {currentStep === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Zap className="h-5 w-5" />
                  Choose Your Integration Template
                </CardTitle>
                <CardDescription>
                  Select a pre-configured template that matches your business needs. You can customize it later.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {integrationTemplates.map((template) => (
                    <Card
                      key={template.name}
                      className="cursor-pointer hover:shadow-md transition-shadow border-border hover:border-primary/50"
                      onClick={() => selectTemplate(template)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${template.color} dark:opacity-90`}>
                            <template.icon className="h-5 w-5 text-white" />
                          </div>
                          <CardTitle className="text-lg text-foreground">{template.name}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {template.features.map((feature) => (
                            <Badge key={feature} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" disabled>
                  Previous
                </Button>
                <Button onClick={nextStep}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">API Configuration</CardTitle>
                <CardDescription>
                  Enter your Facebook API credentials. You can find these in your Facebook Developer account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="appId" className="text-foreground">
                    App ID
                  </Label>
                  <Input
                    id="appId"
                    name="appId"
                    value={config.appId}
                    onChange={handleChange}
                    placeholder="Enter your Facebook App ID"
                    className="bg-background text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appSecret" className="text-foreground">
                    App Secret
                  </Label>
                  <Input
                    id="appSecret"
                    name="appSecret"
                    type="password"
                    value={config.appSecret}
                    onChange={handleChange}
                    placeholder="Enter your Facebook App Secret"
                    className="bg-background text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pageId" className="text-foreground">
                    Page ID
                  </Label>
                  <Input
                    id="pageId"
                    name="pageId"
                    value={config.pageId}
                    onChange={handleChange}
                    placeholder="Enter your Facebook Page ID"
                    className="bg-background text-foreground"
                  />
                </div>

                {config.appId && config.appSecret && (
                  <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      Credentials look good! Click continue to test the connection.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                  Previous
                </Button>
                <Button onClick={nextStep} disabled={!config.appId || !config.appSecret}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Select Your Facebook Page</CardTitle>
                <CardDescription>
                  Choose which Facebook page you want to integrate with your application.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground">Available Pages</h4>
                  <Button variant="outline" size="sm" onClick={fetchPages} disabled={isFetchingPages}>
                    {isFetchingPages ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-2">{isFetchingPages ? "Loading..." : "Refresh"}</span>
                  </Button>
                </div>

                {isFetchingPages ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <Skeleton className="h-4 w-4 rounded-sm" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    ))}
                  </div>
                ) : pages.length > 0 ? (
                  <div className="space-y-2">
                    {pages.map((page, index) => (
                      <Card
                        key={index}
                        className={`cursor-pointer transition-colors border-border hover:border-primary/50 ${
                          selectedPageId === page.page_id ? "ring-2 ring-primary border-primary" : ""
                        }`}
                        onClick={() => handlePageSelect(page.page_id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <Checkbox checked={selectedPageId === page.page_id} readOnly />
                            <div>
                              <p className="font-medium text-foreground">{page.name}</p>
                              <p className="text-sm text-muted-foreground">ID: {page.page_id}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No pages found. Make sure you have the necessary permissions and try refreshing.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                  Previous
                </Button>
                <Button onClick={nextStep} disabled={!selectedPageId}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Final Configuration</CardTitle>
                <CardDescription>Review your settings and complete the integration setup.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Feature toggles */}
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">Enabled Features</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <h4 className="font-medium text-foreground">Messaging</h4>
                          <p className="text-sm text-muted-foreground">Manage Facebook Messenger</p>
                        </div>
                      </div>
                      <Switch
                        checked={config.enableMessaging}
                        onCheckedChange={(value) => handleToggleChange("enableMessaging", value)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <div>
                          <h4 className="font-medium text-foreground">Insights</h4>
                          <p className="text-sm text-muted-foreground">View analytics and performance</p>
                        </div>
                      </div>
                      <Switch
                        checked={config.enableInsights}
                        onCheckedChange={(value) => handleToggleChange("enableInsights", value)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card">
                      <div className="flex items-center gap-3">
                        <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        <div>
                          <h4 className="font-medium text-foreground">Lead Generation</h4>
                          <p className="text-sm text-muted-foreground">Sync lead forms and leads</p>
                        </div>
                      </div>
                      <Switch
                        checked={config.enableLeadGen}
                        onCheckedChange={(value) => handleToggleChange("enableLeadGen", value)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        <div>
                          <h4 className="font-medium text-foreground">Posts</h4>
                          <p className="text-sm text-muted-foreground">Create and schedule posts</p>
                        </div>
                      </div>
                      <Switch
                        checked={config.enablePosts}
                        onCheckedChange={(value) => handleToggleChange("enablePosts", value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Configuration summary */}
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <h4 className="font-medium mb-2 text-foreground">Configuration Summary</h4>
                  <div className="space-y-1 text-sm text-foreground">
                    <p>
                      <strong>App ID:</strong> {config.appId}
                    </p>
                    <p>
                      <strong>Selected Page:</strong> {pages.find((p) => p.page_id === selectedPageId)?.name}
                    </p>
                    <p>
                      <strong>Enabled Features:</strong>{" "}
                      {[
                        config.enableMessaging && "Messaging",
                        config.enablePosts && "Posts",
                        config.enableInsights && "Insights",
                        config.enableLeadGen && "Lead Generation",
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                  Previous
                </Button>
                <Button onClick={handleSave} disabled={isLoading} className="bg-primary text-primary-foreground">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    <>
                      Activate Integration
                      <CheckCircle className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
