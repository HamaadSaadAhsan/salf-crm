import { Users, Briefcase, TrendingUp, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface UserData {
  id: number;
  name: string;
  active_services_count?: number;
  leads_count?: number;
  active_leads_count?: number;
}

interface Props {
  user: UserData;
}

export function UserStatsSection({ user }: Props) {
  const stats = [
    {
      label: 'Total Leads',
      value: user.leads_count || 0,
      icon: Users,
      description: 'All time assigned leads',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Active Leads',
      value: user.active_leads_count || 0,
      icon: Activity,
      description: 'Currently active leads',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Programs',
      value: user.active_services_count || 0,
      icon: Briefcase,
      description: 'Assigned programs',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Conversion Rate',
      value: user.leads_count && user.leads_count > 0
        ? `${Math.round(((user.leads_count - (user.active_leads_count || 0)) / user.leads_count) * 100)}%`
        : 'N/A',
      icon: TrendingUp,
      description: 'Closed leads ratio',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Performance Stats</CardTitle>
        <CardDescription>User activity and performance metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col p-3 rounded-lg border bg-muted/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded ${stat.bgColor}`}>
                  <stat.icon className={`size-4 ${stat.color}`} />
                </div>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-semibold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
