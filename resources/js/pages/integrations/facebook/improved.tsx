import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import React from 'react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Save, Settings, Activity, Shield, AlertTriangle } from 'lucide-react';

// Import our new centralized components
import { FacebookIntegrationProvider, useFacebookIntegration } from '@/contexts/FacebookIntegrationContext';
import HealthStatus from '@/components/facebook/HealthStatus';
import SyncStatus from '@/components/facebook/SyncStatus';
import ErrorRecovery from '@/components/facebook/ErrorRecovery';
import { useFacebookWebSocket } from '@/hooks/useFacebookWebSocket';

function FacebookIntegrationContent() {
    const { state, actions } = useFacebookIntegration();
    
    const {
        config,
        connectionStatus,
        isConfigured,
        isLoading,
        activeTab,
        errors,
        warnings
    } = state;

    // Initialize WebSocket connection for real-time updates
    const webSocket = useFacebookWebSocket(
        state.config?.integrationId, // You'll need to add this to your config
        window.Laravel?.user?.id
    );

    const handleConfigChange = (field: string, value: string | boolean) => {
        actions.saveConfig({ [field]: value });
    };

    const handleSaveConfig = async () => {
        const success = await actions.saveConfig(config);
        if (success) {
            await actions.checkHealth();
        }
    };

    const handleTestConnection = async () => {
        await actions.testConnection();
    };

    const requestPermission = async () => {
        try {
            // This would typically redirect to Facebook OAuth
            window.location.href = '/integrations/facebook/oauth/authorize';
        } catch (error) {
            console.error('Failed to initiate Facebook OAuth', error);
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-black p-6 text-white">
            <div className="mb-8 flex items-center gap-4">
                <Link href="/integrations" className="text-gray-400 hover:text-white">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-4xl font-bold">Facebook Integration</h1>
                    <p className="text-gray-400 mt-2">
                        Manage your Facebook Lead Generation integration with advanced monitoring and error recovery
                    </p>
                </div>
                
                {/* Status indicators */}
                <div className="flex items-center space-x-4">
                    {(errors.length > 0 || warnings.length > 0) && (
                        <div className="flex items-center space-x-2 text-yellow-400">
                            <AlertTriangle className="h-5 w-5" />
                            <span className="text-sm">{errors.length + warnings.length} issues</span>
                        </div>
                    )}
                    <div className={`w-3 h-3 rounded-full ${
                        connectionStatus === 'connected' ? 'bg-green-500' :
                        connectionStatus === 'error' ? 'bg-red-500' :
                        connectionStatus === 'connecting' ? 'bg-yellow-500' :
                        'bg-gray-500'
                    }`} />
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={actions.setActiveTab} className="w-full">
                <div className="mb-6 flex items-center justify-between">
                    <TabsList className="bg-gray-900">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-gray-800">
                            <Activity className="h-4 w-4 mr-2" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="setup" className="data-[state=active]:bg-gray-800">
                            <Settings className="h-4 w-4 mr-2" />
                            Setup
                        </TabsTrigger>
                        <TabsTrigger value="permissions" className="data-[state=active]:bg-gray-800">
                            <Shield className="h-4 w-4 mr-2" />
                            Permissions
                        </TabsTrigger>
                        <TabsTrigger value="monitoring" className="data-[state=active]:bg-gray-800">
                            <Activity className="h-4 w-4 mr-2" />
                            Monitoring
                        </TabsTrigger>
                        <TabsTrigger value="issues" className="data-[state=active]:bg-gray-800">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Issues
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Overview Tab */}
                <TabsContent value="overview">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <HealthStatus showActions={true} />
                        <SyncStatus />
                        
                        <div className="lg:col-span-2">
                            <ErrorRecovery />
                        </div>
                    </div>
                </TabsContent>

                {/* Setup Tab */}
                <TabsContent value="setup">
                    <div className="space-y-6">
                        <Card className="border-gray-800 bg-gray-900">
                            <CardHeader>
                                <CardTitle>API Configuration</CardTitle>
                                <CardDescription className="text-gray-400">
                                    Configure your Facebook App credentials and connection settings.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="appId">App ID</Label>
                                    <Input
                                        id="appId"
                                        name="appId"
                                        value={config.appId}
                                        onChange={(e) => handleConfigChange('appId', e.target.value)}
                                        placeholder="Enter your Facebook App ID"
                                        className="border-gray-700 bg-gray-800"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="appSecret">App Secret</Label>
                                    <Input
                                        id="appSecret"
                                        name="appSecret"
                                        type="password"
                                        value={config.appSecret}
                                        onChange={(e) => handleConfigChange('appSecret', e.target.value)}
                                        placeholder="Enter your Facebook App Secret"
                                        className="border-gray-700 bg-gray-800"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="pageId">Page ID</Label>
                                    <Input
                                        id="pageId"
                                        name="pageId"
                                        value={config.pageId}
                                        onChange={(e) => handleConfigChange('pageId', e.target.value)}
                                        placeholder="Enter your Facebook Page ID"
                                        className="border-gray-700 bg-gray-800"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-gray-800 bg-gray-900">
                            <CardHeader>
                                <CardTitle>Feature Configuration</CardTitle>
                                <CardDescription className="text-gray-400">
                                    Enable the Facebook features you want to use with your CRM.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium">Messaging</h4>
                                        <p className="text-sm text-gray-400">Manage Facebook Messenger conversations</p>
                                    </div>
                                    <Switch
                                        checked={config.enableMessaging}
                                        onCheckedChange={(value) => handleConfigChange('enableMessaging', value)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium">Posts</h4>
                                        <p className="text-sm text-gray-400">Create and schedule posts</p>
                                    </div>
                                    <Switch 
                                        checked={config.enablePosts} 
                                        onCheckedChange={(value) => handleConfigChange('enablePosts', value)} 
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium">Insights</h4>
                                        <p className="text-sm text-gray-400">View page analytics and performance</p>
                                    </div>
                                    <Switch
                                        checked={config.enableInsights}
                                        onCheckedChange={(value) => handleConfigChange('enableInsights', value)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium">Lead Generation</h4>
                                        <p className="text-sm text-gray-400">Sync lead forms and leads automatically</p>
                                    </div>
                                    <Switch 
                                        checked={config.enableLeadGen} 
                                        onCheckedChange={(value) => handleConfigChange('enableLeadGen', value)} 
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="flex space-x-2">
                                <Button 
                                    className="flex-1 bg-white text-black hover:bg-gray-200" 
                                    onClick={handleSaveConfig} 
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Saving...' : 'Save Configuration'}
                                    {!isLoading && <Save className="ml-2 h-4 w-4" />}
                                </Button>
                                <Button 
                                    variant="outline"
                                    onClick={handleTestConnection}
                                    disabled={isLoading}
                                    className="border-gray-700 bg-transparent text-white hover:bg-gray-800"
                                >
                                    Test Connection
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </TabsContent>

                {/* Permissions Tab */}
                <TabsContent value="permissions">
                    <Card className="border-gray-800 bg-gray-900">
                        <CardHeader>
                            <CardTitle>Required Permissions</CardTitle>
                            <CardDescription className="text-gray-400">
                                Your app needs these permissions to function properly with Facebook.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-md bg-gray-800 p-4">
                                <h4 className="mb-2 font-medium">Basic Permissions</h4>
                                <ul className="list-inside list-disc space-y-1 text-gray-400">
                                    <li>email - Access to user's email address</li>
                                    <li>public_profile - Basic profile information</li>
                                </ul>
                            </div>
                            <div className="rounded-md bg-gray-800 p-4">
                                <h4 className="mb-2 font-medium">Page Management</h4>
                                <ul className="list-inside list-disc space-y-1 text-gray-400">
                                    <li>pages_show_list - List pages you manage</li>
                                    <li>pages_read_engagement - Read page engagement data</li>
                                    <li>pages_manage_posts - Create and manage posts</li>
                                    <li>pages_messaging - Send and receive messages</li>
                                </ul>
                            </div>
                            <div className="rounded-md bg-gray-800 p-4">
                                <h4 className="mb-2 font-medium">Lead Generation</h4>
                                <ul className="list-inside list-disc space-y-1 text-gray-400">
                                    <li>leads_retrieval - Access to lead form data</li>
                                    <li>ads_management - Manage ad campaigns and lead forms</li>
                                </ul>
                            </div>
                            <div className="rounded-md bg-gray-800 p-4">
                                <h4 className="mb-2 font-medium">Analytics</h4>
                                <ul className="list-inside list-disc space-y-1 text-gray-400">
                                    <li>read_insights - Access page and post insights</li>
                                </ul>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button 
                                className="w-full bg-blue-600 text-white hover:bg-blue-700" 
                                onClick={requestPermission}
                                disabled={isLoading}
                            >
                                Request Permissions from Facebook
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* Monitoring Tab */}
                <TabsContent value="monitoring">
                    <div className="space-y-6">
                        <SyncStatus />
                        <HealthStatus showActions={true} />
                    </div>
                </TabsContent>

                {/* Issues Tab */}
                <TabsContent value="issues">
                    <ErrorRecovery />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function ImprovedFacebookIntegrationPage() {
    return (
        <AppLayout>
            <FacebookIntegrationProvider>
                <FacebookIntegrationContent />
            </FacebookIntegrationProvider>
        </AppLayout>
    );
}