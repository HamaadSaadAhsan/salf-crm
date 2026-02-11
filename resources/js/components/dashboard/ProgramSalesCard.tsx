import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ProgramData {
    created: number;
    qualified: number;
    won: number;
}

interface ProgramSalesCardProps {
    programSales?: {
        cbi: ProgramData;
        rbi: ProgramData;
        skilled: ProgramData;
    };
    isLoading?: boolean;
}

const programs = [
    { key: 'cbi' as const, label: 'CBI', color: 'bg-blue-500' },
    { key: 'rbi' as const, label: 'RBI', color: 'bg-emerald-500', note: 'Excl. D Category' },
    { key: 'skilled' as const, label: 'Skilled', color: 'bg-amber-500' },
];

const stages = [
    { key: 'created' as const, label: 'Created' },
    { key: 'qualified' as const, label: 'Qualified' },
    { key: 'won' as const, label: 'Won' },
];

export function ProgramSalesCard({ programSales, isLoading }: ProgramSalesCardProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader className="border-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Program Sales
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                </CardContent>
            </Card>
        );
    }

    const defaultData: ProgramData = { created: 0, qualified: 0, won: 0 };

    return (
        <Card>
            <CardHeader className="border-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    Program Sales
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Header row */}
                <div className="grid grid-cols-[1fr_repeat(3,_minmax(0,_1fr))] gap-2 mb-2 text-xs text-muted-foreground">
                    <div></div>
                    {stages.map((stage) => (
                        <div key={stage.key} className="text-center font-medium">
                            {stage.label}
                        </div>
                    ))}
                </div>

                {/* Program rows */}
                <div className="space-y-2">
                    {programs.map((program) => {
                        const data = programSales?.[program.key] ?? defaultData;

                        return (
                            <div
                                key={program.key}
                                className="grid grid-cols-[1fr_repeat(3,_minmax(0,_1fr))] items-center gap-2"
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full ${program.color}`} />
                                    <span className="text-sm font-medium text-foreground">
                                        {program.label}
                                    </span>
                                </div>
                                {stages.map((stage) => (
                                    <div
                                        key={stage.key}
                                        className="text-center text-sm font-semibold tabular-nums text-foreground"
                                    >
                                        {data[stage.key].toLocaleString()}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>

                {/* RBI note */}
                <div className="mt-3 text-[11px] text-muted-foreground border-t pt-2">
                    RBI: Excl. D Category
                </div>
            </CardContent>
        </Card>
    );
}