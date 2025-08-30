import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, ArrowRight, ArrowLeft, Zap, Shield, MessageSquare, BarChart3, Users } from "lucide-react"
import { useState } from "react"

interface SetupStep {
  id: string
  title: string
  description: string
  completed: boolean
}

interface FeatureCard {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  benefits: string[]
  permissions: string[]
  selected: boolean
}

interface SetupWizardProps {
  onComplete: (config: any) => void
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])

  const steps: SetupStep[] = [
    {
      id: "connection",
      title: "Connect to Facebook",
      description: "Authenticate with Facebook and grant permissions",
      completed: false,
    },
    {
      id: "features",
      title: "Select Features",
      description: "Choose which Facebook features to enable",
      completed: false,
    },
    {
      id: "configuration",
      title: "Configure Settings",
      description: "Set up webhooks and notifications",
      completed: false,
    },
  ]

  const featureCards: FeatureCard[] = [
    {
      id: "messaging",
      title: "Messaging",
      description: "Manage Facebook Messenger conversations",
      icon: <MessageSquare className="h-6 w-6" />,
      benefits: ["Real-time message sync", "Automated responses", "Customer support"],
      permissions: ["pages_messaging", "pages_messaging_subscriptions"],
      selected: false,
    },
    {
      id: "leadgen",
      title: "Lead Generation",
      description: "Sync lead forms and capture leads",
      icon: <Users className="h-6 w-6" />,
      benefits: ["Automatic lead capture", "Real-time notifications", "CRM integration"],
      permissions: ["leads_retrieval", "pages_show_list"],
      selected: false,
    },
    {
      id: "insights",
      title: "Analytics & Insights",
      description: "View page analytics and performance",
      icon: <BarChart3 className="h-6 w-6" />,
      benefits: ["Performance tracking", "Audience insights", "Growth metrics"],
      permissions: ["read_insights", "pages_read_engagement"],
      selected: false,
    },
    {
      id: "posts",
      title: "Content Management",
      description: "Create and schedule posts",
      icon: <Zap className="h-6 w-6" />,
      benefits: ["Post scheduling", "Content planning", "Engagement tracking"],
      permissions: ["pages_manage_posts", "pages_read_engagement"],
      selected: false,
    },
  ]

  const progress = ((currentStep + 1) / steps.length) * 100

  const handleFeatureToggle = (featureId: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureId) ? prev.filter((id) => id !== featureId) : [...prev, featureId],
    )
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Complete setup
      onComplete({
        selectedFeatures,
        completed: true,
      })
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderConnectionStep = () => (
    <Card className="border-gray-800 bg-gray-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Connect to Facebook
        </CardTitle>
        <CardDescription className="text-gray-400">
          We'll redirect you to Facebook to authorize your account and grant necessary permissions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
          <h4 className="font-medium text-blue-400 mb-2">What happens next?</h4>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• You'll be redirected to Facebook</li>
            <li>• Grant permissions for your pages</li>
            <li>• We'll automatically discover your pages</li>
            <li>• Return here to continue setup</li>
          </ul>
        </div>
        <Button className="w-full bg-blue-600 hover:bg-blue-700">Connect to Facebook</Button>
      </CardContent>
    </Card>
  )

  const renderFeaturesStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold mb-2">Choose Your Features</h3>
        <p className="text-gray-400">Select the Facebook features you want to enable. You can change these later.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {featureCards.map((feature) => (
          <Card
            key={feature.id}
            className={`border-gray-800 bg-gray-900 cursor-pointer transition-all hover:border-blue-500/50 ${
              selectedFeatures.includes(feature.id) ? "border-blue-500 bg-blue-500/5" : ""
            }`}
            onClick={() => handleFeatureToggle(feature.id)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {feature.icon}
                  {feature.title}
                </div>
                {selectedFeatures.includes(feature.id) && <CheckCircle className="h-5 w-5 text-blue-500" />}
              </CardTitle>
              <CardDescription className="text-gray-400">{feature.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h5 className="text-sm font-medium mb-1">Benefits:</h5>
                  <ul className="text-xs text-gray-400 space-y-1">
                    {feature.benefits.map((benefit, index) => (
                      <li key={index}>• {benefit}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="text-sm font-medium mb-1">Required Permissions:</h5>
                  <div className="flex flex-wrap gap-1">
                    {feature.permissions.map((permission, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderConfigurationStep = () => (
    <Card className="border-gray-800 bg-gray-900">
      <CardHeader>
        <CardTitle>Final Configuration</CardTitle>
        <CardDescription className="text-gray-400">
          We'll automatically configure webhooks and notifications based on your selected features.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
          <h4 className="font-medium text-green-400 mb-2">Ready to activate!</h4>
          <p className="text-sm text-gray-300">Your integration will be configured with the following features:</p>
          <ul className="text-sm text-gray-300 mt-2 space-y-1">
            {selectedFeatures.map((featureId) => {
              const feature = featureCards.find((f) => f.id === featureId)
              return feature ? <li key={featureId}>• {feature.title}</li> : null
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderConnectionStep()
      case 1:
        return renderFeaturesStep()
      case 2:
        return renderConfigurationStep()
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Facebook Integration Setup</h2>
          <Badge variant="outline" className="text-sm">
            Step {currentStep + 1} of {steps.length}
          </Badge>
        </div>

        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm text-gray-400">
            {steps.map((step, index) => (
              <span key={step.id} className={index <= currentStep ? "text-blue-400" : ""}>
                {step.title}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Current Step Content */}
      {renderCurrentStep()}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="border-gray-700 bg-transparent text-white hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Button
          onClick={handleNext}
          disabled={currentStep === 1 && selectedFeatures.length === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {currentStep === steps.length - 1 ? "Complete Setup" : "Next"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
