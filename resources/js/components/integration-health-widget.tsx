import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Activity, Zap, Clock, Users, AlertTriangle } from "lucide-react"
import { useState } from "react"

interface HealthStatus {
  api: boolean
  webhooks: boolean
  permissions: boolean
  tokens?: boolean
  lastChecked: Date
}

interface TokenStatus {
  statistics: {
    total_users: number
    expired_tokens: number
    expiring_soon: number
    healthy_tokens: number
  }
  expired_users: Array<{
    id: number
    name: string
    email: string
    expired_at: string
    days_expired: number
  }>
  expiring_soon_users: Array<{
    id: number
    name: string
    email: string
    expires_at: string
    expires_in_hours: number
    expires_in_days: number
    urgency: string
  }>
  overall_health: 'healthy' | 'warning' | 'critical'
}

interface IntegrationHealthWidgetProps {
  connectionStatus: "disconnected" | "connecting" | "connected" | "error"
  lastSyncAt: Date | null
  healthStatus: HealthStatus
  tokenStatus?: TokenStatus
  isSuperAdmin?: boolean
  onTestConnection: () => void
  onForceSyncData: () => void
  onViewLogs: () => void
  onViewTokenDetails?: () => void
  onRefreshTokens?: () => void
}

export function IntegrationHealthWidget({
  connectionStatus,
  lastSyncAt,
  healthStatus,
  tokenStatus,
  isSuperAdmin = false,
  onTestConnection,
  onForceSyncData,
  onViewLogs,
  onViewTokenDetails,
  onRefreshTokens,
}: IntegrationHealthWidgetProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "connecting":
        return <RefreshCw className="h-4 w-4 animate-spin text-yellow-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "connecting":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      case "error":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onTestConnection()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'high':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      default:
        return 'bg-green-500/10 text-green-500 border-green-500/20'
    }
  }

  const getHealthBadgeColor = (health: string) => {
    switch (health) {
      case 'critical':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      default:
        return 'bg-green-500/10 text-green-500 border-green-500/20'
    }
  }

  return (
    <Card className="border-gray-800 bg-gray-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          Integration Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(connectionStatus)}
            <span className="font-medium">Connection Status</span>
          </div>
          <Badge className={getStatusColor(connectionStatus)}>
            {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
          </Badge>
        </div>

        {/* Last Sync Time */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Last Sync</span>
          <span className="text-sm">{lastSyncAt ? lastSyncAt.toLocaleString() : "Never"}</span>
        </div>

        {/* Health Checks */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Health Checks</h4>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(healthStatus).map(([key, value]) => {
              if (key === "lastChecked") return null
              return (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                  {typeof value === "boolean" ? (
                    value ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        {/* Super Admin Token Status */}
        {isSuperAdmin && tokenStatus && (
          <div className="space-y-2 border-t border-gray-700 pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <h4 className="text-sm font-medium">Token Status (Admin)</h4>
              <Badge className={getHealthBadgeColor(tokenStatus.overall_health)}>
                {tokenStatus.overall_health}
              </Badge>
            </div>
            
            {/* Token Statistics */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Users:</span>
                  <span>{tokenStatus.statistics.total_users}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Healthy:</span>
                  <span className="text-green-400">{tokenStatus.statistics.healthy_tokens}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Expiring Soon:</span>
                  <span className="text-yellow-400">{tokenStatus.statistics.expiring_soon}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Expired:</span>
                  <span className="text-red-400">{tokenStatus.statistics.expired_tokens}</span>
                </div>
              </div>
            </div>

            {/* Critical Issues Alert */}
            {(tokenStatus.expired_users.length > 0 || tokenStatus.expiring_soon_users.length > 0) && (
              <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-2">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  <span className="text-xs font-medium text-orange-400">Token Issues Detected</span>
                </div>
                
                {tokenStatus.expired_users.length > 0 && (
                  <div className="text-xs text-red-400 mb-1">
                    {tokenStatus.expired_users.length} expired token{tokenStatus.expired_users.length > 1 ? 's' : ''}
                  </div>
                )}
                
                {tokenStatus.expiring_soon_users.length > 0 && (
                  <div className="text-xs text-yellow-400">
                    {tokenStatus.expiring_soon_users.length} expiring soon
                  </div>
                )}
              </div>
            )}

            {/* Admin Actions for Tokens */}
            {onViewTokenDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewTokenDetails}
                className="w-full border-blue-700 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
              >
                <Clock className="h-4 w-4" />
                <span className="ml-2">Manage Token Expiry</span>
              </Button>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium">Quick Actions</h4>
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-gray-700 bg-transparent text-white hover:bg-gray-800"
            >
              {isRefreshing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              <span className="ml-2">Test Connection</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onForceSyncData}
              className="border-gray-700 bg-transparent text-white hover:bg-gray-800"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="ml-2">Force Sync</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onViewLogs}
              className="border-gray-700 bg-transparent text-white hover:bg-gray-800"
            >
              <Activity className="h-4 w-4" />
              <span className="ml-2">View Logs</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
