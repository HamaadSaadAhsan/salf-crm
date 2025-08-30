"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, RefreshCw, ExternalLink, HelpCircle, CheckCircle } from "lucide-react"

interface FacebookApiError {
  type: "TOKEN_EXPIRED" | "PERMISSION_DENIED" | "RATE_LIMIT" | "WEBHOOK_VERIFICATION_FAILED" | "UNKNOWN"
  message: string
  code?: string
  recoverySteps: string[]
  canAutoRecover: boolean
}

interface ErrorRecoveryCardProps {
  error: FacebookApiError
  onAutoRecover: () => void
  onManualFix: () => void
  onGetHelp: () => void
  isRecovering?: boolean
}

export function ErrorRecoveryCard({
  error,
  onAutoRecover,
  onManualFix,
  onGetHelp,
  isRecovering = false,
}: ErrorRecoveryCardProps) {
  const getErrorSeverity = (type: string) => {
    switch (type) {
      case "TOKEN_EXPIRED":
      case "PERMISSION_DENIED":
        return "high"
      case "RATE_LIMIT":
        return "medium"
      case "WEBHOOK_VERIFICATION_FAILED":
        return "medium"
      default:
        return "low"
    }
  }

  const getErrorColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "medium":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      default:
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
    }
  }

  const getSimpleExplanation = (type: string) => {
    switch (type) {
      case "TOKEN_EXPIRED":
        return "Your Facebook access token has expired and needs to be refreshed."
      case "PERMISSION_DENIED":
        return "Your app doesn't have the required permissions to access this Facebook feature."
      case "RATE_LIMIT":
        return "You've made too many requests to Facebook. Please wait before trying again."
      case "WEBHOOK_VERIFICATION_FAILED":
        return "Facebook couldn't verify your webhook endpoint. Check your webhook configuration."
      default:
        return "An unexpected error occurred with your Facebook integration."
    }
  }

  const severity = getErrorSeverity(error.type)

  return (
    <Card className="border-gray-800 bg-gray-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Integration Error Detected
          <Badge className={getErrorColor(severity)}>{severity.toUpperCase()}</Badge>
        </CardTitle>
        <CardDescription className="text-gray-400">{error.message}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Simple Explanation */}
        <Alert className="border-gray-700 bg-gray-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-gray-300">{getSimpleExplanation(error.type)}</AlertDescription>
        </Alert>

        {/* Recovery Steps */}
        <div className="space-y-2">
          <h4 className="font-medium">Recovery Steps:</h4>
          <div className="space-y-2">
            {error.recoverySteps.map((step, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-medium text-blue-400 mt-0.5">
                  {index + 1}
                </div>
                <p className="text-sm text-gray-300">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          {error.canAutoRecover && (
            <Button onClick={onAutoRecover} disabled={isRecovering} className="bg-green-600 hover:bg-green-700">
              {isRecovering ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Fixing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Auto Fix
                </>
              )}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={onManualFix}
            className="border-gray-700 bg-transparent text-white hover:bg-gray-800"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Manual Fix Guide
          </Button>

          <Button
            variant="outline"
            onClick={onGetHelp}
            className="border-gray-700 bg-transparent text-white hover:bg-gray-800"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Get Help
          </Button>
        </div>

        {/* Additional Info */}
        {error.code && <div className="text-xs text-gray-500 font-mono">Error Code: {error.code}</div>}
      </CardContent>
    </Card>
  )
}
