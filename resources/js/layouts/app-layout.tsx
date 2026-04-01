import { LayoutProvider } from '@/crm/layout/components/layout-context';
import { MAIN_NAV } from '@/crm/config/app.config';
import { Layout } from '@/crm/layout/components/layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type ReactNode, useMemo } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { CallContextComponent } from '@/providers/CallContextProvider';
import { GlobalSearchProvider } from '@/providers/GlobalSearchProvider';
import { usePage } from '@inertiajs/react';
import { useTaskReminders } from '@/hooks/useTaskReminders';
import { useTaskReminderListener } from '@/hooks/useTaskReminderListener';
import { useLeadAssignmentListener } from '@/hooks/useLeadAssignmentListener';
import { useLeadRequalifiedListener } from '@/hooks/useLeadRequalifiedListener';
import { usePermissionUpdateListener } from '@/hooks/usePermissionUpdateListener';
import { AsteriskWebSocketProvider } from '@/contexts/AsteriskWebSocketContext';
import { InboundCallManager } from '@/components/inbound-calls/InboundCallManager';
import { OutboundCallManager } from '@/components/outbound-calls/OutboundCallManager';
import { ImpersonationBanner } from '@/components/impersonation-banner';
import { CreateDialogProvider } from '@/providers/CreateDialogProvider';
import { type NavConfig } from '@/crm/types';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    hideContentHeader?: boolean;
    fullHeight?: boolean;
    collapseSidebar?: boolean;
}

export default ({ children, breadcrumbs = [], hideContentHeader = false, fullHeight = false, collapseSidebar = false }: AppLayoutProps) => {
    const { auth } = usePage<SharedData>().props;
    const isSuperAdmin = auth.isSuperAdmin;
    const userPermissions = auth.permissions ?? [];

    // Filter navigation items based on role, permissions, and super admin status
    const filteredNav: NavConfig = useMemo(() => {
        const hasPermission = (permission: string) => userPermissions.includes(permission);

        const isItemAllowed = (item: { superAdminOnly?: boolean; requiredPermission?: string; requiredRole?: string }) => {
            if (item.superAdminOnly && !isSuperAdmin) return false;
            if (!isSuperAdmin && item.requiredPermission && !hasPermission(item.requiredPermission)) return false;
            return true;
        };

        return MAIN_NAV.map(item => {
            if (!isItemAllowed(item)) return null;

            // Filter sub-items
            if (item.items) {
                const filteredItems = item.items.filter(isItemAllowed);
                return { ...item, items: filteredItems };
            }

            return item;
        }).filter(Boolean) as NavConfig;
    }, [isSuperAdmin, userPermissions]);

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

    // Enable real-time permission update listening via WebSocket
    usePermissionUpdateListener({
        userId: auth.user.id,
        enabled: true,
    });

    return (
        <GlobalSearchProvider>
            <LayoutProvider sidebarNavItems={filteredNav}>
                <AsteriskWebSocketProvider>
                    <CallContextComponent user={auth.user}>
                        <CreateDialogProvider>
                            {/* Impersonation Banner - shows when super admin is impersonating */}
                            <ImpersonationBanner />

                            <Layout breadcrumbs={breadcrumbs} hideContentHeader={hideContentHeader} fullHeight={fullHeight} collapseSidebar={collapseSidebar}>
                                {children}
                            </Layout>

                            {/* Inbound Call Manager - handles incoming calls */}
                            <InboundCallManager />

                            {/* Outbound Call Manager - handles outgoing calls */}
                            <OutboundCallManager />
                        </CreateDialogProvider>
                    </CallContextComponent>
                </AsteriskWebSocketProvider>
                <Toaster
                    position="bottom-right"
                    closeButton
                    expand
                    gap={8}
                />
            </LayoutProvider>
        </GlobalSearchProvider>
    );
};
