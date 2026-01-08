import { LayoutProvider } from '@/crm/layout/components/layout-context';
import { MAIN_NAV } from '@/crm/config/app.config';
import { Layout } from '@/crm/layout/components/layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';
import ReactQueryProvider from '@/providers/react-query-provider';
import { CallContextComponent } from '@/providers/CallContextProvider';
import { usePage } from '@inertiajs/react';
import { useTaskReminders } from '@/hooks/useTaskReminders';
import { useTaskReminderListener } from '@/hooks/useTaskReminderListener';
import { useLeadAssignmentListener } from '@/hooks/useLeadAssignmentListener';
import { DialerIntegration } from '@/components/dialer/DialerIntegration';
import { AsteriskWebSocketProvider } from '@/contexts/AsteriskWebSocketContext';
import { InboundCallManager } from '@/components/inbound-calls/InboundCallManager';
import { OutboundCallManager } from '@/components/outbound-calls/OutboundCallManager';
import { ImpersonationBanner } from '@/components/impersonation-banner';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default ({ children, breadcrumbs = [] }: AppLayoutProps) => {
    const { auth } = usePage<SharedData>().props;

    // Enable task reminder polling (fallback)
    useTaskReminders({
        enabled: true,
        soundEnabled: true,
        pollInterval: 5 * 60 * 1000, // 5 minutes
    });

    // Enable real-time task reminder listening via WebSocket
    useTaskReminderListener({
        userId: auth.user.id,
        enabled: true,
        soundEnabled: true,
    });

    // Enable real-time lead assignment listening via WebSocket
    useLeadAssignmentListener({
        userId: auth.user.id,
        enabled: true,
    });

    return (
        <LayoutProvider sidebarNavItems={MAIN_NAV}>
            <ReactQueryProvider>
                <AsteriskWebSocketProvider>
                    <CallContextComponent user={auth.user}>
                        {/* Impersonation Banner - shows when super admin is impersonating */}
                        <ImpersonationBanner />

                        <Layout breadcrumbs={breadcrumbs}>
                            {children}
                        </Layout>

                        {/* Inbound Call Manager - handles incoming calls */}
                        <InboundCallManager />

                        {/* Outbound Call Manager - handles outgoing calls */}
                        <OutboundCallManager />
                    </CallContextComponent>
                </AsteriskWebSocketProvider>
            </ReactQueryProvider>
            <Toaster
                richColors
                position="bottom-right"
                closeButton
            />
        </LayoutProvider>
    );
};
