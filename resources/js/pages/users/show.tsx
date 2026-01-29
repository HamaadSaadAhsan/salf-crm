import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Building, MapPin, Briefcase } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Content } from '@/crm/layout/components/content';
import { ContentHeader } from '@/crm/layout/components/content-header';
import { type BreadcrumbItem } from '@/types';
import { UserProfileSection } from './show/user-profile-section';
import { UserServicesSection } from './show/user-services-section';
import { UserStatsSection } from './show/user-stats-section';
import { UserActionsSection } from './show/user-actions-section';
import { UserActivityHeatmap } from './show/user-activity-heatmap';

interface Role {
  id: number;
  name: string;
  guard_name?: string;
}

interface Service {
  id: number;
  name: string;
  country_code?: string;
  country_name?: string;
  parent?: {
    id: number;
    name: string;
  };
}

interface Lead {
  id: number;
  name: string;
  email?: string;
  service_id?: number;
  assigned_to?: number;
  inquiry_status?: string;
  created_at?: string;
  service?: {
    id: number;
    name: string;
  };
}

interface Zone {
  id: number;
  name: string;
  code?: string;
  is_active?: boolean;
}

interface Office {
  id: number;
  name: string;
  code?: string;
  zone_id?: number;
  is_active?: boolean;
  zone?: {
    id: number;
    name: string;
  };
}

interface UserData {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string;
  availability?: boolean;
  availability_date?: string;
  availability_time?: string;
  active_services_count?: number;
  leads_count?: number;
  active_leads_count?: number;
  active_services?: Service[];
  services?: Service[];
  leads?: Lead[];
  roles?: Role[];
  zone?: Zone;
  office?: Office;
  created_at?: string;
  updated_at?: string;
}

interface AvailableService {
  id: number;
  name: string;
  detail?: string;
  country_code?: string;
  country_name?: string;
  parent_id?: number;
  children?: AvailableService[];
}

interface Props {
  user: UserData;
  roles: Role[];
  zones: Zone[];
  offices: Office[];
  services: AvailableService[];
}

export default function UserShow({ user, roles, zones, offices, services }: Props) {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Users', href: '/users' },
    { title: user.name, href: '#' },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`User - ${user.name}`} />

      <ContentHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/users">
                <ArrowLeft className="size-4 mr-2" />
                Back to Users
              </Link>
            </Button>
          </div>
        </div>
      </ContentHeader>

      <Content>
        <div className="grid gap-6 lg:grid-cols-3 px-5">
          {/* Left column - User info and profile */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Header Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="size-16">
                    <AvatarFallback className="text-xl bg-primary/10 text-primary">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl font-semibold">{user.name}</h1>
                      {user.email_verified_at && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {user.roles?.map((role) => (
                        <Badge key={role.id} variant="secondary">
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="size-4" />
                    <span>{user.zone?.name || 'No zone'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building className="size-4" />
                    <span>{user.office?.name || 'No office'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="size-4" />
                    <span>{user.active_services_count || 0} Programs</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Profile Section */}
            <UserProfileSection
              user={user}
              roles={roles}
              zones={zones}
              offices={offices}
            />

            {/* User Services Section */}
            <UserServicesSection
              user={user}
              availableServices={services}
            />

            {/* User Activity Heatmap */}
            <UserActivityHeatmap userId={user.id} />
          </div>

          {/* Right column - Stats and Actions */}
          <div className="space-y-6">
            {/* Stats Section */}
            <UserStatsSection user={user} />

            {/* Recent Leads */}
            {user.leads && user.leads.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Leads</CardTitle>
                  <CardDescription>Latest assigned leads</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {user.leads.slice(0, 5).map((lead) => (
                      <Link
                        key={lead.id}
                        href={`/leads/${lead.id}`}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{lead.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {lead.service?.name || 'No service'}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0 ml-2">
                          {lead.inquiry_status?.replace(/_/g, ' ')}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                  {user.leads_count && user.leads_count > 5 && (
                    <Button variant="ghost" className="w-full mt-3" size="sm" asChild>
                      <Link href={`/leads?assigned_to=${user.id}`}>
                        View all {user.leads_count} leads
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Actions Section */}
            <UserActionsSection user={user} />
          </div>
        </div>
      </Content>
    </AppLayout>
  );
}
