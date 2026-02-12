import { Bot, LayoutGrid, PieChart, Settings2, Users, Phone, PhoneCall, Workflow } from 'lucide-react';


import { NavConfig } from '../types';
import { dashboard } from '@/routes';
import { IconTools } from '@tabler/icons-react';
import { management } from '@/routes/settings';

export const MAIN_NAV: NavConfig = [
        {
            id: 'dashboard',
            title: 'Dashboard',
            path: dashboard().url,
            icon: LayoutGrid,
            isActive: true,
            requiredPermission: 'view dashboard',
            items: [
                {
                    title: 'Overview',
                    path: dashboard().url,
                },
                {
                    title: 'Analytics',
                    path: '#',
                    requiredPermission: 'view analytics',
                },
                {
                    title: 'Reports',
                    path: '#',
                    requiredPermission: 'view reports',
                },
            ],
        },
        {
            id: 'tasks',
            title: 'Tasks',
            path: '/tasks',
            icon: Bot,
        },
        {
            id: 'leads',
            title: 'Leads',
            path: '/leads',
            icon: Users,
            requiredPermission: 'view leads',
            items: [
                {
                    title: 'All Leads',
                    path: '/leads',
                },
                {
                    title: 'New Leads',
                    path: '#',
                },
                {
                    title: 'Qualified',
                    path: '#',
                },
                {
                    title: 'Lost',
                    path: '#',
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
                    path: '/workflows/create',
                },
                {
                    title: 'Templates',
                    path: '/workflows/templates',
                },
            ],
        },
        {
            id: 'management',
            title: 'Management',
            path: management.url(),
            icon: Bot,
            superAdminOnly: true,
            items: [
                {
                    title: 'Users',
                    path: '#',
                },
                {
                    title: 'Roles',
                    path: '#',
                },
                {
                    title: 'Permissions',
                    path: '#',
                },
                {
                    title: 'Assignment Queue',
                    path: '/settings/management/assignment-visualizer',
                },
            ],
        },
        {
            id: 'integrations',
            title: 'Integrations',
            path: '/integrations',
            icon: IconTools,
            requiredPermission: 'manage integrations',
            items: [
                {
                    title: 'Overview',
                    path: '/integrations',
                    icon: PieChart,
                },
                {
                    title: 'Calendar',
                    path: '/integrations/calendar',
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
                {
                    title: 'History',
                    path: '/calls/history',
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
                    path: '/settings/management',
                    superAdminOnly: true,
                },
                {
                    title: 'Security',
                    path: '#',
                },
                {
                    title: 'Integrations',
                    path: '#',
                },
            ],
        },
];
