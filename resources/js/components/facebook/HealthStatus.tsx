import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { useFacebookIntegration } from '@/contexts/FacebookIntegrationContext';
import { formatDistanceToNow } from 'date-fns';

interface HealthStatusProps {
    showActions?: boolean;
}

export default function HealthStatus({ showActions = true }: HealthStatusProps) {
    const { state, actions } = useFacebookIntegration();
    const { healthStatus, connectionStatus, lastSyncAt, isLoading } = state;

    const getStatusIcon = (status: boolean) => {
        if (status) {
            return <CheckCircle className="h-4 w-4 text-green-500" />;
        } else {
            return <XCircle className="h-4 w-4 text-red-500" />;
        }
    };

    const getConnectionStatusBadge = () => {
        switch (connectionStatus) {
            case 'connected':
                return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>;
            case 'connecting':
                return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Connecting</Badge>;
            case 'error':
                return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Error</Badge>;
            default:
                return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Disconnected</Badge>;
        }
    };

    const handleRefreshHealth = async () => {
        await actions.checkHealth();
    };

    return (
        <Card className="border-gray-800 bg-gray-900">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Integration Health</CardTitle>
                    {getConnectionStatusBadge()}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Health Checks */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center justify-between p-3 rounded-md bg-gray-800">
                            <div className="flex items-center space-x-2">
                                {getStatusIcon(healthStatus.api)}
                                <span className="text-sm font-medium">API Connection</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 rounded-md bg-gray-800">
                            <div className="flex items-center space-x-2">
                                {getStatusIcon(healthStatus.permissions)}
                                <span className="text-sm font-medium">Permissions</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 rounded-md bg-gray-800">
                            <div className="flex items-center space-x-2">
                                {getStatusIcon(healthStatus.webhooks)}
                                <span className="text-sm font-medium">Webhooks</span>
                            </div>
                        </div>
                    </div>

                    {/* Last Sync Information */}
                    <div className="flex items-center justify-between p-3 rounded-md bg-gray-800">
                        <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-blue-400" />
                            <span className="text-sm font-medium">Last Sync</span>
                        </div>
                        <span className="text-sm text-gray-400">
                            {lastSyncAt ? formatDistanceToNow(lastSyncAt, { addSuffix: true }) : 'Never'}
                        </span>
                    </div>

                    {/* Health Check Time */}
                    <div className="flex items-center justify-between p-3 rounded-md bg-gray-800">
                        <div className="flex items-center space-x-2">
                            <RefreshCw className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">Last Health Check</span>
                        </div>
                        <span className="text-sm text-gray-400">
                            {formatDistanceToNow(healthStatus.lastChecked, { addSuffix: true })}
                        </span>
                    </div>

                    {/* Actions */}
                    {showActions && (
                        <div className="flex space-x-2 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefreshHealth}
                                disabled={isLoading}
                                className="border-gray-700 bg-transparent text-white hover:bg-gray-800"
                            >
                                {isLoading ? (
                                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                )}
                                Refresh Status
                            </Button>
                            
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={actions.testConnection}
                                disabled={isLoading}
                                className="border-gray-700 bg-transparent text-white hover:bg-gray-800"
                            >
                                Test Connection
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}