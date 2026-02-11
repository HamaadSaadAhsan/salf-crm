import { Head } from '@inertiajs/react';
import {
  Globe,
  Map,
  MapPinned,
  MapPin,
  Building2,
  GraduationCap,
  Users,
  Shield,
  Lock,
  Badge,
  Share2,
  ListChecks,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { PageHeader } from './page-header';
import { ManagementCard } from './management-card';
import { Content } from '@/crm/layout/components/content';
import React from 'react';

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
    <AppLayout>
      <Head title="Management Settings" />
      <PageHeader />
      <Content className="px-0">
        <div className="py-6">
          <div className="container-fluid">
            <div className="space-y-8">
              <div>
                <h2 className="text-base font-semibold text-muted-foreground mb-4">
                  User Management
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <h2 className="text-base font-semibold text-muted-foreground mb-4">
                  Location Management
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <h2 className="text-base font-semibold text-muted-foreground mb-4">
                  Program Management
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <h2 className="text-base font-semibold text-muted-foreground mb-4">
                  Lead Management
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
