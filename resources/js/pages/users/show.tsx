import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Building, MapPin, Briefcase, UserCog } from 'lucide-react';
import { type SharedData } from '@/types';
import AppLayout from '@/layouts/app-layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Content } from '@/crm/layout/components/content';
import { type BreadcrumbItem } from '@/types';
import { UserProfileSection } from './show/user-profile-section';
import { UserPermissionsSection } from './show/user-permissions-section';
import { UserServicesSection } from './show/user-services-section';
import { UserStatsSection } from './show/user-stats-section';
import { UserPerformanceBoard } from './show/user-performance-board';
import { UserActionsSection } from './show/user-actions-section';
import { UserActivityHeatmap } from './show/user-activity-heatmap';

interface Permission {
  id: number;
  name: string;
}

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
  direct_permissions?: Permission[];
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
  allPermissions: Permission[];
}

export default function UserShow({ user, roles, zones, offices, services, allPermissions }: Props) {
  const { auth } = usePage<SharedData>().props;
  const isSuperAdmin = auth.isSuperAdmin;
  const currentUserId = auth.user.id;
  const canManageTeam = !isSuperAdmin && auth.permissions?.includes('manage team agents');

  const canImpersonate = (): boolean => {
    if (!isSuperAdmin || user.id === currentUserId) return false;
    return !user.roles?.some((role) => role.name === 'super-admin');
  };

  const handleImpersonate = () => {
    if (!canImpersonate()) return;
    router.post(`/impersonate/${user.id}`);
  };

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

          <Content className="px-5">
              <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex items-center gap-2 py-2">
                      <Button size="sm" asChild className="bg-blue-500 shadow-(--button-shadow)">
                          <Link href="/users">
                              <ArrowLeft className="size-4" />
                              <span className="ml-2 hidden sm:inline">Back to Users</span>
                          </Link>
                      </Button>
                  </div>
                  {canImpersonate() && (
                      <Button
                          variant="outline"
                          size="sm"
                          onClick={handleImpersonate}
                          className="border-border text-amber-600 shadow-(--button-shadow) transition-colors duration-300 hover:bg-amber-50 hover:text-amber-700"
                      >
                          <UserCog className="size-4" />
                          <span className="ml-2 hidden sm:inline">Impersonate User</span>
                      </Button>
                  )}
              </div>
          </Content>

          <Content>
              <div className="w-full space-y-4 px-3 sm:space-y-6 sm:px-5">
                  {/* Full-width User Header Card */}
                  <Card>
                      <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                              <Avatar className="size-14 shrink-0 sm:size-16">
                                  <AvatarImage src={undefined} />
                                  <AvatarFallback className="bg-primary/10 text-lg text-primary sm:text-xl">{getInitials(user.name)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                      <h1 className="truncate text-xl font-semibold sm:text-2xl">{user.name}</h1>
                                      {user.email_verified_at && (
                                          <Badge variant="outline" className="shrink-0 border-green-200 bg-green-50 text-xs text-green-700">
                                              Verified
                                          </Badge>
                                      )}
                                  </div>
                                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                      {user.roles?.map((role) => (
                                          <Badge key={role.id} variant="secondary">
                                              {role.name}
                                          </Badge>
                                      ))}
                                  </div>
                              </div>
                          </div>

                          <Separator className="my-4" />

                          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                  <MapPin className="size-4 shrink-0" />
                                  <span className="truncate">{user.zone?.name || 'No zone'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                  <Building className="size-4 shrink-0" />
                                  <span className="truncate">{user.office?.name || 'No office'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                  <Briefcase className="size-4 shrink-0" />
                                  <span>{user.active_services_count || 0} Programs</span>
                              </div>
                          </div>
                      </CardContent>
                  </Card>

                  {/* Main two-column grid */}
                  <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
                      {/* Left column - Profile details */}
                      <div className="space-y-4 sm:space-y-6 lg:col-span-2">
                          {/* User Profile Section */}
                          <UserProfileSection user={user} roles={roles} zones={zones} offices={offices} isSuperAdmin={isSuperAdmin} />

                          {/* Direct Permissions Section — super-admin only */}
                          {isSuperAdmin && <UserPermissionsSection user={user} allPermissions={allPermissions} />}

                          {/* User Services Section */}
                          <UserServicesSection user={user} availableServices={services} />

                          {/* User Activity Heatmap */}
                          <UserActivityHeatmap userId={user.id} />
                      </div>

                      {/* Right column - appears first on mobile */}
                      <div className="order-first space-y-4 sm:space-y-6 lg:order-last">
                          {/* Performance Board for CRO/Advisor, Stats for others */}
                          {user.roles?.some((role) =>
                              ['support-agent', 'senior-support-agent', 'sales-rep', 'senior-sales-rep'].includes(role.name),
                          ) ? (
                              <UserPerformanceBoard userId={user.id} />
                          ) : (
                              <></>
                          )}

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
                                                  className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-muted/50"
                                              >
                                                  <div className="min-w-0 flex-1">
                                                      <p className="truncate text-sm font-medium">{lead.name}</p>
                                                      <p className="truncate text-xs text-muted-foreground">{lead.service?.name || 'No service'}</p>
                                                  </div>
                                                  <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                                                      {lead.inquiry_status?.replace(/_/g, ' ')}
                                                  </Badge>
                                              </Link>
                                          ))}
                                      </div>
                                      {user.leads_count && user.leads_count > 5 && (
                                          <Button variant="ghost" className="mt-3 w-full" size="sm" asChild>
                                              <Link href={`/leads?assigned_to=${user.id}`}>View all {user.leads_count} leads</Link>
                                          </Button>
                                      )}
                                  </CardContent>
                              </Card>
                          )}

                          {/* Actions Section — super-admin only */}
                          {isSuperAdmin && <UserActionsSection user={user} />}
                      </div>
                  </div>
              </div>
          </Content>
      </AppLayout>
  );
}
