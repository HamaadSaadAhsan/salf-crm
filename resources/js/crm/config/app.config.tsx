import { PieChart, Settings2, Users, PhoneCall, Workflow, Shield, KeyRound, BarChart3, ListChecks, BellIcon, LifeBuoy, CalendarDays, Mail, UsersRound } from 'lucide-react';

import { NavConfig } from '../types';
import { assignmentVisualizer, dashboard, integrations as integrationsRoute } from '@/routes';
import { IconBell, IconSmartHome, IconTools } from '@tabler/icons-react';
import { management } from '@/routes/settings';
import { roles, permissions, leadSources, leadStatuses } from '@/routes/settings/management';
import { page as usersPage } from '@/routes/users';

export const MAIN_NAV: NavConfig = [
        {
            id: 'dashboard',
            title: 'Dashboard',
            path: dashboard().url,
            icon: IconSmartHome,
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
            id: 'notifications',
            title: 'Notifications',
            path: '/notifications',
            icon: BellIcon,
            requiredPermission: 'view notifications',
        },
        {
            id: 'tasks',
            title: 'Tasks',
            path: '/tasks',
            icon: ListChecks,
        },
        {
            id: 'follow-up-calendar',
            title: 'Calendar',
            path: '/follow-up-calendar',
            icon: CalendarDays,
        },
        {
            id: 'mail',
            title: 'Mail',
            path: '/mail',
            icon: Mail,
        },
        {
            id: 'reports',
            title: 'Reports',
            path: '/reports',
            icon: BarChart3,
            requiredPermission: 'view reports',
            items: [
                {
                    title: 'Overview',
                    path: '/reports',
                },
                {
                    title: 'Leads Overall',
                    path: '/reports/leads-overall',
                },
                {
                    title: 'By Office',
                    path: '/reports/leads-by-office',
                },
                {
                    title: 'By Support Agent',
                    path: '/reports/leads-by-support-agent',
                },
                {
                    title: 'By Sales Rep',
                    path: '/reports/leads-by-sales-rep',
                },
                {
                    title: 'By Source',
                    path: '/reports/leads-by-source',
                },
                {
                    title: 'By Service',
                    path: '/reports/leads-by-service',
                },
                {
                    title: 'Conversions',
                    path: '/reports/leads-conversion',
                },
                {
                    title: 'Lost Leads',
                    path: '/reports/leads-lost',
                },
            ],
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
                    path: '/workflows/new',
                },
            ],
        },
        {
            id: 'management',
            title: 'Management',
            path: usersPage.url(),
            icon: Shield,
            requiredPermission: 'view users',
            items: [
                {
                    title: 'Overview',
                    path: management.url(),
                    superAdminOnly: true,
                },
                {
                    title: 'Users',
                    path: usersPage.url(),
                    requiredPermission: 'view users',
                },
                {
                    title: 'Roles',
                    path: roles.url(),
                    superAdminOnly: true,
                },
                {
                    title: 'Permissions',
                    path: permissions.url(),
                    superAdminOnly: true,
                },
                {
                    title: 'Lead Sources',
                    path: leadSources.url(),
                    superAdminOnly: true,
                },
                {
                    title: 'Lead Statuses',
                    path: leadStatuses.url(),
                    superAdminOnly: true,
                },
                {
                    title: 'Assignment Queue',
                    path: assignmentVisualizer.url(),
                    superAdminOnly: true,
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
            ],
        },
        {
            id: 'support',
            title: 'Support',
            path: '/support',
            icon: LifeBuoy,
            items: [
                {
                    title: 'My Tickets',
                    path: '/support',
                },
                {
                    title: 'New Ticket',
                    path: '/support/create',
                },
                {
                    title: 'All Tickets',
                    path: '/admin/tickets',
                    superAdminOnly: true,
                },
            ],
        },
        {
            id: 'teams',
            title: 'Teams',
            path: '/teams',
            icon: UsersRound,
            items: [
                {
                    title: 'All Teams',
                    path: '/teams',
                },
                {
                    title: 'Current Team',
                    path: '/teams/current',
                },
                {
                    title: 'Create Team',
                    path: '/teams/create',
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
                    path: usersPage.url(),
                    requiredPermission: 'view users',
                },
            ],
        },
];
