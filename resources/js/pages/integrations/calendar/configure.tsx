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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { PageProps } from '@/types/global';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, CalendarDays, RefreshCw, Unplug } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Integrations', href: '/integrations' },
    { title: 'Google Calendar', href: '/integrations/calendar' },
];

interface CalendarIntegration {
    id: string;
    google_account_email: string;
    is_active: boolean;
    token_expires_at: string;
    sync_preferences: {
        syncLeads: boolean;
        syncFollowUps: boolean;
        defaultCalendarId: string;
    };
    created_at: string;
}

interface ConfigurePageProps extends PageProps {
    integration: CalendarIntegration;
}

function GoogleCalendarIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 81 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <g clipPath="url(#gcal-cfg)">
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
                <clipPath id="gcal-cfg">
                    <rect width="80" height="80" fill="white" transform="translate(0.5)" />
                </clipPath>
            </defs>
        </svg>
    );
}

export default function CalendarConfigurePage({ integration }: ConfigurePageProps) {
    const [syncLeads, setSyncLeads] = useState(integration.sync_preferences?.syncLeads ?? true);
    const [syncFollowUps, setSyncFollowUps] = useState(integration.sync_preferences?.syncFollowUps ?? true);
    const [isSaving, setIsSaving] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showDisconnect, setShowDisconnect] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);

    const isTokenExpired = new Date(integration.token_expires_at) < new Date();

    const updatePreferences = async (syncLeadsValue: boolean, syncFollowUpsValue: boolean) => {
        setIsSaving(true);
        try {
            await axios.put(`/calendar/${integration.id}`, {
                sync_preferences: {
                    syncLeads: syncLeadsValue,
                    syncFollowUps: syncFollowUpsValue,
                    defaultCalendarId: integration.sync_preferences?.defaultCalendarId ?? 'primary',
                },
            });
            toast.success('Sync preferences updated');
        } catch {
            toast.error('Failed to update preferences');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSyncLeadsChange = (checked: boolean) => {
        setSyncLeads(checked);
        updatePreferences(checked, syncFollowUps);
    };

    const handleSyncFollowUpsChange = (checked: boolean) => {
        setSyncFollowUps(checked);
        updatePreferences(syncLeads, checked);
    };

    const handleRefreshToken = async () => {
        setIsRefreshing(true);
        try {
            await axios.post(`/calendar/${integration.id}/refresh-token`);
            toast.success('Token refreshed successfully');
            router.reload();
        } catch {
            toast.error('Failed to refresh token. You may need to reconnect.');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleDisconnect = async () => {
        setIsDisconnecting(true);
        try {
            await axios.delete(`/calendar/${integration.id}`);
            toast.success('Calendar disconnected');
            router.visit('/integrations');
        } catch {
            toast.error('Failed to disconnect calendar');
        } finally {
            setIsDisconnecting(false);
            setShowDisconnect(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Google Calendar Configuration" />

            <div className="container-fluid space-y-6 py-5">
                {/* Back + Title */}
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => router.visit('/integrations')}>
                        <ArrowLeft className="size-3.5" />
                        Back
                    </Button>
                    <h2 className="text-base font-semibold tracking-tight text-foreground">
                        Google Calendar
                    </h2>
                </div>

                <Separator />

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Connected Account */}
                    <Card>
                        <CardContent className="space-y-4 p-5">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-foreground">Connected Account</span>
                                <Badge
                                    variant={integration.is_active && !isTokenExpired ? 'success' : 'warning'}
                                    appearance="light"
                                    size="sm"
                                    shape="circle"
                                >
                                    {integration.is_active && !isTokenExpired ? 'Healthy' : 'Needs attention'}
                                </Badge>
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-3.5">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-zinc-50 dark:bg-zinc-900">
                                        <GoogleCalendarIcon className="size-4" />
                                    </div>
                                    <div className="flex flex-col gap-0 overflow-hidden">
                                        <span className="truncate text-sm font-medium leading-5 tracking-[-0.01em] text-foreground">
                                            {integration.google_account_email}
                                        </span>
                                        <span className="text-xs font-medium leading-4 tracking-[-0.01em] text-muted-foreground">
                                            Connected {format(parseISO(integration.created_at), 'MMM d, yyyy')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {isTokenExpired && (
                                <div className="flex items-center justify-between rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                                    <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                                        Access token has expired
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleRefreshToken}
                                        disabled={isRefreshing}
                                    >
                                        <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                                    </Button>
                                </div>
                            )}

                            <div className="pt-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setShowDisconnect(true)}
                                >
                                    <Unplug className="size-3.5" />
                                    Disconnect
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sync Preferences */}
                    <Card>
                        <CardContent className="space-y-4 p-5">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="size-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-foreground">Sync Preferences</span>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex flex-col gap-0.5">
                                        <Label className="text-sm font-medium text-foreground">
                                            Sync Leads
                                        </Label>
                                        <span className="text-xs font-medium text-muted-foreground">
                                            Create calendar events when leads have follow-up dates
                                        </span>
                                    </div>
                                    <Switch
                                        checked={syncLeads}
                                        onCheckedChange={handleSyncLeadsChange}
                                        size="sm"
                                        disabled={isSaving}
                                    />
                                </div>

                                <Separator />

                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex flex-col gap-0.5">
                                        <Label className="text-sm font-medium text-foreground">
                                            Sync Follow-ups
                                        </Label>
                                        <span className="text-xs font-medium text-muted-foreground">
                                            Include follow-up reminders as calendar events
                                        </span>
                                    </div>
                                    <Switch
                                        checked={syncFollowUps}
                                        onCheckedChange={handleSyncFollowUpsChange}
                                        size="sm"
                                        disabled={isSaving}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Disconnect confirmation */}
            <AlertDialog open={showDisconnect} onOpenChange={setShowDisconnect}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Google Calendar</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to disconnect "{integration.google_account_email}"? Synced calendar events will no longer be
                            updated.
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
