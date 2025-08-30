import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle, Info, AlertCircle, RefreshCw, ExternalLink, HelpCircle } from 'lucide-react';
import { useFacebookIntegration } from '@/contexts/FacebookIntegrationContext';
import { formatDistanceToNow } from 'date-fns';

interface ErrorRecoveryGuides {
    [key: string]: {
        title: string;
        description: string;
        steps: string[];
        autoFix?: () => Promise<void>;
        helpUrl?: string;
    };
}

const errorRecoveryGuides: ErrorRecoveryGuides = {
    'TOKEN_EXPIRED': {
        title: 'Access Token Expired',
        description: 'Your Facebook access token has expired and needs to be refreshed.',
        steps: [
            'Go to the Permissions tab',
            'Click "Request Permissions" to reauthorize',
            'Complete the Facebook OAuth flow',
            'Your token will be automatically refreshed'
        ],
        helpUrl: 'https://developers.facebook.com/docs/facebook-login/access-tokens/refreshing'
    },
    'PERMISSION_DENIED': {
        title: 'Insufficient Permissions',
        description: 'Your app doesn\'t have the required permissions to perform this action.',
        steps: [
            'Go to the Permissions tab',
            'Review the required permissions list',
            'Click "Request Permissions" to get additional permissions',
            'Make sure to grant all required permissions in Facebook'
        ],
        helpUrl: 'https://developers.facebook.com/docs/permissions/reference'
    },
    'RATE_LIMIT': {
        title: 'Rate Limit Exceeded',
        description: 'You\'ve made too many requests to Facebook\'s API. Please wait before retrying.',
        steps: [
            'Wait for the rate limit to reset (usually 1 hour)',
            'Reduce the frequency of sync operations',
            'Consider upgrading your Facebook app limits',
            'Use webhooks for real-time data instead of frequent polling'
        ],
        helpUrl: 'https://developers.facebook.com/docs/graph-api/overview/rate-limiting'
    },
    'WEBHOOK_VERIFICATION_FAILED': {
        title: 'Webhook Setup Failed',
        description: 'Facebook couldn\'t verify your webhook endpoint.',
        steps: [
            'Check that your webhook URL is accessible from the internet',
            'Verify your webhook verify token matches what\'s configured',
            'Ensure your server returns a 200 status code',
            'Try reconfiguring webhooks in the Webhooks tab'
        ]
    },
    'default': {
        title: 'General Integration Error',
        description: 'An unexpected error occurred with your Facebook integration.',
        steps: [
            'Check your internet connection',
            'Verify your Facebook app credentials',
            'Test your connection using the Health Status panel',
            'Review the Facebook Developer Console for any app-level issues',
            'Contact support if the problem persists'
        ]
    }
};

export default function ErrorRecovery() {
    const { state, actions } = useFacebookIntegration();
    const { errors, warnings, isLoading } = state;

    const getErrorIcon = (type: 'error' | 'warning' | 'info') => {
        switch (type) {
            case 'error':
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            case 'warning':
                return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            default:
                return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    const getRecoveryGuide = (errorMessage: string) => {
        const errorType = Object.keys(errorRecoveryGuides).find(key => 
            errorMessage.toLowerCase().includes(key.toLowerCase().replace('_', ' '))
        );
        return errorRecoveryGuides[errorType || 'default'];
    };

    const handleAutoFix = async (error: any) => {
        const guide = getRecoveryGuide(error.message);
        if (guide.autoFix) {
            await guide.autoFix();
            actions.clearError(error.id);
        }
    };

    if (errors.length === 0 && warnings.length === 0) {
        return (
            <Card className="border-gray-800 bg-gray-900">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center space-x-2 text-green-400">
                        <AlertCircle className="h-5 w-5" />
                        <span>All Systems Operational</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-400">
                        Your Facebook integration is running smoothly with no active issues.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-gray-800 bg-gray-900">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <span>Issues & Recovery</span>
                    <Badge variant="destructive" className="ml-auto">
                        {errors.length + warnings.length}
                    </Badge>
                </CardTitle>
                <p className="text-sm text-gray-400">
                    Active issues with suggested fixes
                </p>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {[...errors, ...warnings].map((issue) => {
                        const guide = getRecoveryGuide(issue.message);
                        
                        return (
                            <Alert key={issue.id} className="border-gray-700 bg-gray-800">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-3 flex-1">
                                        {getErrorIcon(issue.type)}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <h4 className="font-medium text-sm">{guide.title}</h4>
                                                <Badge variant={issue.type === 'error' ? 'destructive' : 'secondary'} className="text-xs">
                                                    {issue.type}
                                                </Badge>
                                                <span className="text-xs text-gray-500">
                                                    {formatDistanceToNow(issue.timestamp, { addSuffix: true })}
                                                </span>
                                            </div>
                                            
                                            <AlertDescription className="text-sm text-gray-400 mb-3">
                                                {guide.description}
                                            </AlertDescription>
                                            
                                            <div className="mb-3">
                                                <p className="text-xs font-medium text-gray-300 mb-2">Recovery Steps:</p>
                                                <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                                                    {guide.steps.map((step, index) => (
                                                        <li key={index}>{step}</li>
                                                    ))}
                                                </ol>
                                            </div>
                                            
                                            <div className="flex items-center space-x-2">
                                                {guide.autoFix && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleAutoFix(issue)}
                                                        disabled={isLoading}
                                                        className="border-gray-600 bg-transparent text-white hover:bg-gray-700"
                                                    >
                                                        <RefreshCw className="h-3 w-3 mr-1" />
                                                        Auto Fix
                                                    </Button>
                                                )}
                                                
                                                {guide.helpUrl && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => window.open(guide.helpUrl, '_blank')}
                                                        className="border-gray-600 bg-transparent text-white hover:bg-gray-700"
                                                    >
                                                        <HelpCircle className="h-3 w-3 mr-1" />
                                                        Learn More
                                                        <ExternalLink className="h-3 w-3 ml-1" />
                                                    </Button>
                                                )}
                                                
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => actions.clearError(issue.id)}
                                                    className="border-gray-600 bg-transparent text-white hover:bg-gray-700"
                                                >
                                                    Mark as Resolved
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => actions.clearError(issue.id)}
                                        className="ml-2 text-gray-400 hover:text-white"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </Alert>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}