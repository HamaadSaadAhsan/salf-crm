import { Content } from '@/crm/layout/components/content';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Badge, Building2, FileText, Globe, GraduationCap, ListChecks, Lock, Map, MapPin, MapPinned, Share2, Shield, Users } from 'lucide-react';
import React from 'react';
import { ManagementCard } from './management-card';
import { PageHeader } from './page-header';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Management Settings',
        href: '/settings/management',
    },
];

export default function ManagementSettingsPage() {
    const userManagementSections = [
        {
            title: 'Users',
            description: 'Manage user accounts, roles, and permissions',
            icon: Users,
            href: '/users',
        },
        {
            title: 'Roles',
            description: 'Create and manage roles with permission assignments',
            icon: Shield,
            href: '/settings/management/roles',
        },
        {
            title: 'Permissions',
            description: 'Configure the permission matrix across all roles',
            icon: Lock,
            href: '/settings/management/permissions',
        },
    ];

    const locationManagementSections = [
        {
            title: 'Countries',
            description: 'Manage countries and regional settings',
            icon: Globe,
            href: '/countries',
        },
        {
            title: 'Provinces',
            description: 'Configure provinces and states',
            icon: Map,
            href: '/provinces',
        },
        {
            title: 'Cities',
            description: 'Manage cities and municipalities',
            icon: MapPinned,
            href: '/cities',
        },
        {
            title: 'Zones',
            description: 'Define operational zones and territories',
            icon: MapPin,
            href: '/zones',
        },
        {
            title: 'Offices',
            description: 'Manage office locations and assignments',
            icon: Building2,
            href: '/offices',
        },
    ];

    const programManagementSections = [
        {
            title: 'Programs',
            description: 'Manage educational and training programs',
            icon: GraduationCap,
            href: '/services',
            disabled: false,
            badge: React.createElement(Badge),
        },
        {
            title: 'PDF Templates',
            description: 'Manage PDF form templates for document generation',
            icon: FileText,
            href: '/settings/management/pdf-templates',
        },
    ];

    const leadManagementSections = [
        {
            title: 'Lead Sources',
            description: 'Manage and organize lead sources',
            icon: Share2,
            href: '/settings/management/lead-sources',
        },
        {
            title: 'Lead Statuses',
            description: 'Configure lead lifecycle statuses and colors',
            icon: ListChecks,
            href: '/settings/management/lead-statuses',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Management Settings" />
            <PageHeader />
            <Content className="px-0">
                <div className="py-6">
                    <div className="container-fluid">
                        <div className="space-y-8">
                            <div>
                                <h2 className="mb-4 text-base font-semibold text-muted-foreground">User Management</h2>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {userManagementSections.map((section) => (
                                        <ManagementCard
                                            key={section.title}
                                            title={section.title}
                                            description={section.description}
                                            icon={section.icon}
                                            href={section.href}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h2 className="mb-4 text-base font-semibold text-muted-foreground">Location Management</h2>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {locationManagementSections.map((section) => (
                                        <ManagementCard
                                            key={section.title}
                                            title={section.title}
                                            description={section.description}
                                            icon={section.icon}
                                            href={section.href}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h2 className="mb-4 text-base font-semibold text-muted-foreground">Program Management</h2>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {programManagementSections.map((section) => (
                                        <ManagementCard
                                            key={section.title}
                                            title={section.title}
                                            description={section.description}
                                            icon={section.icon}
                                            href={section.href}
                                            disabled={section.disabled}
                                            badge={section.badge}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h2 className="mb-4 text-base font-semibold text-muted-foreground">Lead Management</h2>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {leadManagementSections.map((section) => (
                                        <ManagementCard
                                            key={section.title}
                                            title={section.title}
                                            description={section.description}
                                            icon={section.icon}
                                            href={section.href}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Content>
        </AppLayout>
    );
}
