import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useFacebookIntegration } from '@/contexts/FacebookIntegrationContext';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, CheckCircle, Clock, Download, Play, RefreshCw, XCircle } from 'lucide-react';

export default function SyncStatus() {
    const { state, actions } = useFacebookIntegration();
    const { syncStatus, isLoading } = state;

    const getSyncStatusIcon = (status: 'idle' | 'running' | 'success' | 'error') => {
        switch (status) {
            case 'running':
                return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'error':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-400" />;
        }
    };

    const getSyncStatusBadge = (status: 'idle' | 'running' | 'success' | 'error') => {
        switch (status) {
            case 'running':
                return (
                    <Badge variant="secondary" className="bg-blue-600">
                        Running
                    </Badge>
                );
            case 'success':
                return (
                    <Badge variant="default" className="bg-green-600">
                        Success
                    </Badge>
                );
            case 'error':
                return <Badge variant="destructive">Error</Badge>;
            default:
                return <Badge variant="outline">Ready</Badge>;
        }
    };

    const syncOperations = [
        {
            key: 'pages' as const,
            title: 'Facebook Pages',
            description: 'Sync your Facebook pages and access tokens',
            action: actions.fetchPages,
            icon: <Download className="h-4 w-4" />,
        },
        {
            key: 'leadForms' as const,
            title: 'Lead Forms',
            description: 'Sync lead forms from your Facebook pages',
            action: actions.syncLeadForms,
            icon: <Download className="h-4 w-4" />,
        },
        {
            key: 'leads' as const,
            title: 'Leads',
            description: 'Import leads from your Facebook lead forms',
            action: () => actions.syncLeads(),
            icon: <Download className="h-4 w-4" />,
        },
    ];

    return (
        <Card className="border-gray-800 bg-gray-900">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-lg">
                    <RefreshCw className="h-5 w-5" />
                    <span>Sync Operations</span>
                </CardTitle>
                <p className="text-sm text-gray-400">Monitor and control data synchronization from Facebook</p>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {syncOperations.map((operation) => {
                        const opStatus = syncStatus[operation.key];
                        const isRunning = opStatus.isRunning;

                        return (
                            <div key={operation.key} className="rounded-md border border-gray-700 bg-gray-800 p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="flex items-center space-x-2">
                                            {getSyncStatusIcon(opStatus.status)}
                                            <h3 className="font-medium">{operation.title}</h3>
                                        </div>
                                        {getSyncStatusBadge(opStatus.status)}
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={operation.action}
                                        disabled={isRunning || isLoading}
                                        className="border-gray-600 bg-transparent text-white hover:bg-gray-700"
                                    >
                                        {isRunning ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                        {isRunning ? 'Running...' : 'Start Sync'}
                                    </Button>
                                </div>

                                <p className="mb-3 text-sm text-gray-400">{operation.description}</p>

                                {/* Progress bar for running operations */}
                                {isRunning && opStatus.progress !== undefined && (
                                    <div className="mb-3">
                                        <Progress value={opStatus.progress} className="h-2" />
                                        <p className="mt-1 text-xs text-gray-500">{opStatus.progress}% complete</p>
                                    </div>
                                )}

                                {/* Last run information */}
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>Last run: {opStatus.lastRun ? formatDistanceToNow(opStatus.lastRun, { addSuffix: true }) : 'Never'}</span>

                                    {opStatus.error && (
                                        <div className="flex items-center space-x-1 text-red-400">
                                            <AlertCircle className="h-3 w-3" />
                                            <span>Error: {opStatus.error}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Global sync actions */}
                <div className="mt-6 rounded-md border border-gray-700 bg-gray-800/50 p-4">
                    <h4 className="mb-2 font-medium">Bulk Operations</h4>
                    <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                                await actions.fetchPages();
                                await actions.syncLeadForms();
                                await actions.syncLeads();
                            }}
                            disabled={Object.values(syncStatus).some((s) => s.isRunning) || isLoading}
                            className="border-gray-600 bg-transparent text-white hover:bg-gray-700"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Sync All
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={actions.checkHealth}
                            disabled={isLoading}
                            className="border-gray-600 bg-transparent text-white hover:bg-gray-700"
                        >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Health Check
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
