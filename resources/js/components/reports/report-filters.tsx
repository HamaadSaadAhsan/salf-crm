import { useState } from 'react';
import { format } from 'date-fns';
import { Filter, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DateRangePicker, DateRangePickerProps } from '@/components/dashboard/date-range-picker';
import type { ReportFilters } from '@/hooks/useReports';
import { DateRange } from 'react-day-picker';

interface OfficeOption {
    id: number;
    name: string;
    code?: string;
}

interface ServiceOption {
    id: number;
    name: string;
}

interface SourceOption {
    id: number;
    name: string;
}

interface ReportFiltersBarProps {
    filters: ReportFilters;
    onChange: (filters: ReportFilters) => void;
    offices?: OfficeOption[];
    services?: ServiceOption[];
    sources?: SourceOption[];
    showOffice?: boolean;
    showSource?: boolean;
    showService?: boolean;
    showGroupBy?: boolean;
}

export function ReportFiltersBar({
    filters,
    onChange,
    offices = [],
    services = [],
    sources = [],
    showOffice = true,
    showSource = true,
    showService = true,
    showGroupBy = true,
}: ReportFiltersBarProps) {
    const dateRange: DateRange | undefined =
        filters.date_from && filters.date_to
            ? { from: new Date(filters.date_from), to: new Date(filters.date_to) }
            : undefined;

    const handleDateChange = (range: DateRange | undefined) => {
        onChange({
            ...filters,
            date_from: range?.from ? format(range.from, 'yyyy-MM-dd') : undefined,
            date_to: range?.to ? format(range.to, 'yyyy-MM-dd') : undefined,
        });
    };

    const handleReset = () => {
        onChange({});
    };

    const hasActiveFilters = Object.values(filters).some(
        (v) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0),
    );

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" />
                Filters
            </div>

            <DateRangePicker value={dateRange} onChange={handleDateChange} />

            {showOffice && offices.length > 0 && (
                <Select
                    value={filters.office_id?.toString() ?? ''}
                    onValueChange={(val) =>
                        onChange({ ...filters, office_id: val ? Number(val) : undefined })
                    }
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Offices" />
                    </SelectTrigger>
                    <SelectContent>
                        {offices.map((office) => (
                            <SelectItem key={office.id} value={office.id.toString()}>
                                {office.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {showSource && sources.length > 0 && (
                <Select
                    value={filters.source_id?.[0]?.toString() ?? ''}
                    onValueChange={(val) =>
                        onChange({ ...filters, source_id: val ? [Number(val)] : undefined })
                    }
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                    <SelectContent>
                        {sources.map((source) => (
                            <SelectItem key={source.id} value={source.id.toString()}>
                                {source.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {showService && services.length > 0 && (
                <Select
                    value={filters.service_id?.[0]?.toString() ?? ''}
                    onValueChange={(val) =>
                        onChange({ ...filters, service_id: val ? [Number(val)] : undefined })
                    }
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Services" />
                    </SelectTrigger>
                    <SelectContent>
                        {services.map((service) => (
                            <SelectItem key={service.id} value={service.id.toString()}>
                                {service.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {showGroupBy && (
                <Select
                    value={filters.group_by ?? 'day'}
                    onValueChange={(val) =>
                        onChange({ ...filters, group_by: val as 'day' | 'week' | 'month' })
                    }
                >
                    <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Group by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="day">Daily</SelectItem>
                        <SelectItem value="week">Weekly</SelectItem>
                        <SelectItem value="month">Monthly</SelectItem>
                    </SelectContent>
                </Select>
            )}

            {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground">
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Reset
                </Button>
            )}
        </div>
    );
}
