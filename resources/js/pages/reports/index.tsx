import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    BarChart3,
    Building,
    HeadphonesIcon,
    Briefcase,
    Globe,
    Layers,
    TrendingUp,
    TrendingDown,
    ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/reports' },
];

const reportCards = [
    {
        title: 'Leads Overall',
        description: 'Summary KPIs, trend charts, and status breakdown across all leads.',
        href: '/reports/leads-overall',
        icon: BarChart3,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
    },
    {
        title: 'By Office',
        description: 'Lead distribution and conversion performance across offices.',
        href: '/reports/leads-by-office',
        icon: Building,
        color: 'text-violet-500',
        bgColor: 'bg-violet-500/10',
    },
    {
        title: 'By Support Agent',
        description: 'Support agent qualification rates and response times.',
        href: '/reports/leads-by-support-agent',
        icon: HeadphonesIcon,
        color: 'text-cyan-500',
        bgColor: 'bg-cyan-500/10',
    },
    {
        title: 'By Sales Rep',
        description: 'Sales rep conversion metrics, pipeline, and deal velocity.',
        href: '/reports/leads-by-sales-rep',
        icon: Briefcase,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
    },
    {
        title: 'By Source',
        description: 'Lead source effectiveness, conversion, and qualification rates.',
        href: '/reports/leads-by-source',
        icon: Globe,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
    },
    {
        title: 'By Service',
        description: 'Service and program performance comparison and trends.',
        href: '/reports/leads-by-service',
        icon: Layers,
        color: 'text-indigo-500',
        bgColor: 'bg-indigo-500/10',
    },
    {
        title: 'Won Leads (Conversion)',
        description: 'Detailed analysis of converted leads with source and service breakdown.',
        href: '/reports/leads-conversion',
        icon: TrendingUp,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
    },
    {
        title: 'Lost Leads',
        description: 'Lost lead analysis with loss reason breakdown and patterns.',
        href: '/reports/leads-lost',
        icon: TrendingDown,
        color: 'text-rose-500',
        bgColor: 'bg-rose-500/10',
    },
];

export default function ReportsIndex() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reports" />
            <div className="p-5 lg:p-7.5 space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
                    <p className="text-muted-foreground mt-1">
                        Analyze leads performance across different dimensions.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {reportCards.map((card) => (
                        <Link key={card.href} href={card.href} className="group">
                            <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/20 group-hover:-translate-y-0.5">
                                <CardContent className="p-5 flex flex-col gap-4">
                                    <div className="flex items-start justify-between">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bgColor}`}>
                                            <card.icon className={`h-5 w-5 ${card.color}`} />
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-sm">{card.title}</h3>
                                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                            {card.description}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
