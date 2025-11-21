import { AudioWaveform, Bot, Command, Frame, GalleryVerticalEnd, LayoutGrid, Map, PieChart, Settings2, Users, Phone, PhoneCall, Workflow } from 'lucide-react';


import { NavConfig } from '../types';
import { dashboard } from '@/routes';
import { IconTools } from '@tabler/icons-react';

export const MAIN_NAV: NavConfig = [
        {
            id:'dashboard',
            title: 'Dashboard',
            path: dashboard().url,
            icon: LayoutGrid,
            isActive: true,
            items: [
                {
                    title: 'Overview',
                    path: dashboard().url,
                },
                {
                    title: 'Analytics',
                    path: '#',
                },
                {
                    title: 'Reports',
                    path: '#',
                },
            ],
        },
        {
            id: 'leads',
            title: 'Leads',
            path: '/leads',
            icon: Users,
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
            id:'workflows',
            title: 'Workflows',
            path: '/workflows',
            icon: Workflow,
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
            path: '#',
            icon: Bot,
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
            ],
        },
        {
            id: 'integrations',
            title: 'Integrations',
            path: '/integrations',
            icon: IconTools,
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
            path: '#',
            icon: Settings2,
            items: [
                {
                    title: 'General',
                    path: '#',
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
