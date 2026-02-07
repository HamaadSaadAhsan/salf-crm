import { LayoutProvider } from '@/crm/layout/components/layout-context';
import { MAIN_NAV } from '@/crm/config/app.config';
import { Layout } from '@/crm/layout/components/layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type ReactNode, useMemo } from 'react';
import { Toaster } from '@/components/ui/sonner';
import ReactQueryProvider from '@/providers/react-query-provider';
import { CallContextComponent } from '@/providers/CallContextProvider';
import { usePage } from '@inertiajs/react';
import { useTaskReminders } from '@/hooks/useTaskReminders';
import { useTaskReminderListener } from '@/hooks/useTaskReminderListener';
import { useLeadAssignmentListener } from '@/hooks/useLeadAssignmentListener';
import { useLeadRequalifiedListener } from '@/hooks/useLeadRequalifiedListener';
import { AsteriskWebSocketProvider } from '@/contexts/AsteriskWebSocketContext';
import { InboundCallManager } from '@/components/inbound-calls/InboundCallManager';
import { OutboundCallManager } from '@/components/outbound-calls/OutboundCallManager';
import { ImpersonationBanner } from '@/components/impersonation-banner';
import { type NavConfig } from '@/crm/types';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default ({ children, breadcrumbs = [] }: AppLayoutProps) => {
    const { auth } = usePage<SharedData>().props;
    const userRole = auth.user.role;

    // Filter navigation items based on user role
    const filteredNav: NavConfig = useMemo(() => {
        return MAIN_NAV.map(item => {
            // Filter out items the user doesn't have access to
            if (item.requiredRole && item.requiredRole !== userRole) {
                return null;
            }

            // Filter sub-items based on role
            if (item.items) {
                const filteredItems = item.items.filter(
                    subItem => !subItem.requiredRole || subItem.requiredRole === userRole
                );
                return { ...item, items: filteredItems };
            }

            return item;
        }).filter(Boolean) as NavConfig;
    }, [userRole]);

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

    // Enable real-time lead requalification listening via WebSocket
    useLeadRequalifiedListener({
        userId: auth.user.id,
        enabled: true,
    });

    return (
        <LayoutProvider sidebarNavItems={filteredNav}>
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
