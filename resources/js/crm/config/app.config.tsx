import { LayoutGrid, PieChart, Settings2, Users, Phone, PhoneCall, Workflow, Shield, KeyRound, BarChart3, ListChecks } from 'lucide-react';

import { NavConfig } from '../types';
import { assignmentVisualizer, dashboard, integrations as integrationsRoute } from '@/routes';
import { IconTools } from '@tabler/icons-react';
import { management } from '@/routes/settings';
import { roles, permissions, leadSources, leadStatuses } from '@/routes/settings/management';
import { page as usersPage } from '@/routes/users';

export const MAIN_NAV: NavConfig = [
        {
            id: 'dashboard',
            title: 'Dashboard',
            path: dashboard().url,
            icon: LayoutGrid,
            isActive: true,
            requiredPermission: 'view dashboard',
        },
        {
            id: 'leads',
            title: 'Leads',
            path: '/leads',
            icon: Users,
            requiredPermission: 'view leads',
        },
        {
            id: 'tasks',
            title: 'Tasks',
            path: '/tasks',
            icon: ListChecks,
        },
        {
            id: 'workflows',
            title: 'Workflows',
            path: '/workflows',
            icon: Workflow,
            superAdminOnly: true,
            items: [
                {
                    title: 'All Workflows',
                    path: '/workflows',
                },
                {
                    title: 'Create New',
                    path: '/workflows/create',
                },
            ],
        },
        {
            id: 'management',
            title: 'Management',
            path: management.url(),
            icon: Shield,
            superAdminOnly: true,
            items: [
                {
                    title: 'Overview',
                    path: management.url(),
                },
                {
                    title: 'Users',
                    path: usersPage.url(),
                },
                {
                    title: 'Roles',
                    path: roles.url(),
                },
                {
                    title: 'Permissions',
                    path: permissions.url(),
                },
                {
                    title: 'Lead Sources',
                    path: leadSources.url(),
                },
                {
                    title: 'Lead Statuses',
                    path: leadStatuses.url(),
                },
                {
                    title: 'Assignment Queue',
                    path: assignmentVisualizer.url(),
                },
            ],
        },
        {
            id: 'integrations',
            title: 'Integrations',
            path: integrationsRoute.url(),
            icon: IconTools,
            requiredPermission: 'manage integrations',
            items: [
                {
                    title: 'Overview',
                    path: integrationsRoute.url(),
                    icon: PieChart,
                },
                {
                    title: 'Calendar',
                    path: '/calendar',
                },
                {
                    title: 'Facebook',
                    path: '/integrations/facebook',
                },
            ],
        },
        {
            id: 'calls',
            title: 'Calls',
            path: '/calls',
            icon: PhoneCall,
            requiredPermission: 'make calls',
            items: [
                {
                    title: 'All Calls',
                    path: '/calls',
                },
                {
                    title: 'New Call',
                    path: '/calls/create',
                },
            ],
        },
        {
            id: 'sip-accounts',
            title: 'SIP Accounts',
            path: '/sip-accounts',
            icon: Phone,
            superAdminOnly: true,
            items: [
                {
                    title: 'All Accounts',
                    path: '/sip-accounts',
                },
                {
                    title: 'Create',
                    path: '/sip-accounts/create',
                },
            ],
        },
        {
            id: 'settings',
            title: 'Settings',
            path: '/settings/profile',
            icon: Settings2,
            items: [
                {
                    title: 'General',
                    path: '/settings/profile',
                },
                {
                    title: 'Management',
                    path: management.url(),
                    superAdminOnly: true,
                },
            ],
        },
];
