import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import WhatsAppIcon from '@/components/WhatsAppIcon';
import AppLayout from '@/layouts/app-layout';
import { PageProps } from '@/types/global';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { Loader2, Plug, Settings2, Unplug } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Integrations', href: '/integrations' }];

interface Integration {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    status: 'active' | 'inactive';
    configureUrl?: string;
    type?: 'calendar';
}

interface IntegrationsPageProps extends PageProps {
    statuses: {
        facebook: boolean;
        whatsapp: boolean;
        calendar: boolean;
    };
}

function GoogleCalendarIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 81 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <g clipPath="url(#gcal)">
                <path d="M61.55 18.95L42.61 16.84L19.45 18.95L17.34 40L19.45 61.05L40.5 63.68L61.55 61.05L63.66 39.47L61.55 18.95Z" fill="white" />
                <path d="M28.08 51.61C26.51 50.55 25.42 48.99 24.83 46.94L28.48 45.44C28.81 46.7 29.39 47.68 30.22 48.37C31.04 49.07 32.04 49.41 33.21 49.41C34.4 49.41 35.43 49.05 36.28 48.32C37.14 47.59 37.57 46.67 37.57 45.55C37.57 44.4 37.12 43.46 36.22 42.74C35.31 42.01 34.17 41.65 32.82 41.65H30.71V38.03H32.6C33.77 38.03 34.75 37.72 35.55 37.08C36.35 36.45 36.75 35.59 36.75 34.49C36.75 33.51 36.39 32.73 35.68 32.15C34.96 31.56 34.06 31.27 32.96 31.27C31.88 31.27 31.03 31.55 30.4 32.13C29.77 32.7 29.31 33.41 29.02 34.24L25.41 32.73C25.88 31.37 26.76 30.17 28.05 29.14C29.34 28.1 30.99 27.58 32.99 27.58C34.47 27.58 35.8 27.86 36.98 28.44C38.16 29.01 39.08 29.81 39.75 30.82C40.42 31.83 40.75 32.97 40.75 34.23C40.75 35.52 40.44 36.61 39.82 37.51C39.2 38.4 38.44 39.08 37.53 39.56V39.78C38.73 40.28 39.7 41.04 40.47 42.07C41.23 43.09 41.62 44.32 41.62 45.75C41.62 47.18 41.25 48.46 40.53 49.58C39.8 50.71 38.79 51.59 37.52 52.23C36.24 52.87 34.81 53.2 33.21 53.2C31.36 53.21 29.66 52.67 28.08 51.61Z" fill="#1A73E8" />
                <path d="M50.5 33.48L46.51 36.38L44.51 33.34L51.7 28.15H54.46V52.63H50.5V33.48Z" fill="#1A73E8" />
                <path d="M61.55 80L80.5 61.05L71.03 56.84L61.55 61.05L57.34 70.53L61.55 80Z" fill="#EA4335" />
                <path d="M15.24 70.53L19.45 80H61.55V61.05H19.45L15.24 70.53Z" fill="#34A853" />
                <path d="M6.82 0C3.33 0 0.5 2.83 0.5 6.32V61.05L9.97 65.26L19.45 61.05V18.95H61.55L65.76 9.47L61.55 0H6.82Z" fill="#4285F4" />
                <path d="M0.5 61.05V73.68C0.5 77.17 3.33 80 6.82 80H19.45V61.05H0.5Z" fill="#188038" />
                <path d="M61.55 18.95V61.05H80.5V18.95L71.03 14.74L61.55 18.95Z" fill="#FBBC04" />
                <path d="M80.5 18.95V6.32C80.5 2.83 77.67 0 74.18 0H61.55V18.95H80.5Z" fill="#1967D2" />
            </g>
            <defs>
                <clipPath id="gcal">
                    <rect width="80" height="80" fill="white" transform="translate(0.5)" />
                </clipPath>
            </defs>
        </svg>
    );
}

function FacebookIcon({ className }: { className?: string }) {
    return (
        <div className={`flex items-center justify-center rounded-full bg-blue-600 ${className}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current text-white">
                <path d="M9.198 21.5H13.198V13.49H16.802L17.198 9.51H13.198V7.5C13.198 6.948 13.646 6.5 14.198 6.5H17.198V2.5H14.198C11.437 2.5 9.198 4.739 9.198 7.5V9.51H7.198L6.802 13.49H9.198V21.5Z" />
            </svg>
        </div>
    );
}

function IntegrationCard({
    integration,
    onConnect,
    onDisconnect,
    isConnecting,
}: {
    integration: Integration;
    onConnect: () => void;
    onDisconnect: (id: string) => void;
    isConnecting?: boolean;
}) {
    const isActive = integration.status === 'active';

    return (
        <Card>
            <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-zinc-50 dark:bg-zinc-900">
                            {integration.icon}
                        </div>
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                            <span className="truncate text-sm font-medium leading-5 tracking-[-0.01em] text-foreground">
                                {integration.name}
                            </span>
                            <span className="text-xs font-medium leading-4 tracking-[-0.01em] text-muted-foreground">
                                {integration.description}
                            </span>
                        </div>
                    </div>
                    <Badge
                        variant={isActive ? 'success' : 'secondary'}
                        appearance="light"
                        size="sm"
                        shape="circle"
                        className="shrink-0"
                    >
                        {isActive ? 'Connected' : 'Not connected'}
                    </Badge>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {isActive && integration.configureUrl && (
                            <Button variant="outline" size="sm" asChild>
                                <Link href={integration.configureUrl}>
                                    <Settings2 className="size-3.5" />
                                    Configure
                                </Link>
                            </Button>
                        )}
                        {isActive ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onDisconnect(integration.id)}
                            >
                                <Unplug className="size-3.5" />
                                Disconnect
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onConnect}
                                disabled={isConnecting}
                            >
                                {isConnecting ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                    <Plug className="size-3.5" />
                                )}
                                {isConnecting ? 'Connecting...' : 'Connect'}
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function IntegrationsPage({ statuses }: IntegrationsPageProps) {
    const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [connectingFacebook, setConnectingFacebook] = useState(false);
    const popupRef = useRef<Window | null>(null);
    const popupCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const toStatus = (linked: boolean): 'active' | 'inactive' => (linked ? 'active' : 'inactive');

    const integrations: Integration[] = [
        {
            id: 'facebook',
            name: 'Facebook',
            description: 'Manage posts, engagement, and automate replies',
            icon: <FacebookIcon className="size-6" />,
            status: toStatus(statuses.facebook),
            configureUrl: '/integrations/facebook',
        },
        {
            id: 'whatsapp',
            name: 'WhatsApp',
            description: 'Send updates, offer support, real-time communication',
            icon: <WhatsAppIcon className="size-6" />,
            status: toStatus(statuses.whatsapp),
        },
        {
            id: 'calendar',
            name: 'Google Calendar',
            description: 'Sync lead follow-ups as calendar events',
            icon: <GoogleCalendarIcon className="size-4" />,
            status: toStatus(statuses.calendar),
            type: 'calendar',
            configureUrl: statuses.calendar ? '/integrations/calendar' : undefined,
        },
    ];

    const activeCount = integrations.filter((i) => i.status === 'active').length;

    const connectCalendar = async () => {
        try {
            const response = await axios.post('/calendar/authorize');
            const authUrl = response.data.auth_url;
            if (authUrl && typeof authUrl === 'string') {
                window.location.href = authUrl;
            }
        } catch {
            toast.error('Failed to initiate calendar connection');
        }
    };

    const connectFacebook = async () => {
        setConnectingFacebook(true);

        try {
            // Open popup first (must be in direct click handler to avoid popup blocker)
            const popup = window.open('about:blank', 'facebook_oauth', 'width=600,height=700');
            popupRef.current = popup;

            const res = await api.post('/integrations/facebook/oauth/authorize', {});
            if (res.success && res.auth_url) {
                if (popup && !popup.closed) {
                    popup.location.href = res.auth_url;
                } else {
                    popupRef.current = window.open(res.auth_url, 'facebook_oauth', 'width=600,height=700');
                }

                // Poll for popup close
                popupCheckRef.current = setInterval(async () => {
                    if (popupRef.current && popupRef.current.closed) {
                        if (popupCheckRef.current) {
                            clearInterval(popupCheckRef.current);
                            popupCheckRef.current = null;
                        }

                        // Check if OAuth completed (token saved)
                        try {
                            const statusRes = await api.get('/workflows/facebook/token-status');
                            if (statusRes.connected) {
                                toast.success('Facebook connected successfully');
                                router.reload();
                            } else {
                                toast.error('Facebook login was not completed');
                            }
                        } catch {
                            toast.error('Failed to verify Facebook connection');
                        }

                        setConnectingFacebook(false);
                    }
                }, 1000);
            } else {
                popup?.close();
                setConnectingFacebook(false);
                toast.error('Failed to get Facebook auth URL');
            }
        } catch (err: any) {
            setConnectingFacebook(false);
            const message = err?.response?.data?.message || err?.message || 'Failed to connect Facebook';
            toast.error(message);
        }
    };

    const handleConnect = (id: string) => {
        if (id === 'calendar') {
            connectCalendar();
        } else if (id === 'facebook') {
            connectFacebook();
        }
    };

    const handleDisconnect = async () => {
        if (!disconnectTarget) return;

        if (disconnectTarget === 'calendar') {
            setIsDisconnecting(true);
            try {
                const { data } = await axios.get('/calendar/status');
                if (data?.isLinked) {
                    const integrationData = data[0];
                    if (integrationData?.id) {
                        await axios.delete(`/calendar/${integrationData.id}`);
                    }
                }
                toast.success('Calendar disconnected successfully');
                router.reload();
            } catch {
                toast.error('Failed to disconnect calendar');
            } finally {
                setIsDisconnecting(false);
                setDisconnectTarget(null);
            }
        } else {
            setDisconnectTarget(null);
        }
    };

    // Clean up popup interval on unmount
    useEffect(() => {
        return () => {
            if (popupCheckRef.current) {
                clearInterval(popupCheckRef.current);
            }
        };
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Integrations" />

            <div className="container-fluid space-y-6 py-5">
                {/* Summary */}
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                        <h2 className="text-base font-semibold tracking-tight text-foreground">
                            Connected Services
                        </h2>
                        <p className="text-sm font-medium text-muted-foreground">
                            {activeCount} of {integrations.length} integrations active
                        </p>
                    </div>
                </div>

                <Separator />

                {/* Integration Cards */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {integrations.map((integration) => (
                        <IntegrationCard
                            key={integration.id}
                            integration={integration}
                            onConnect={() => handleConnect(integration.id)}
                            onDisconnect={setDisconnectTarget}
                            isConnecting={integration.id === 'facebook' && connectingFacebook}
                        />
                    ))}
                </div>
            </div>

            {/* Disconnect confirmation */}
            <AlertDialog open={!!disconnectTarget} onOpenChange={(open) => !open && setDisconnectTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect integration</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to disconnect this integration? Any synced data will no longer be updated.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDisconnect}
                            className="bg-destructive text-white hover:bg-destructive/90"
                            disabled={isDisconnecting}
                        >
                            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
