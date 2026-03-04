import { AudioPlayerToast } from '@/components/audio-player-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { useCall } from '@/providers/CallContextProvider';
import { Head, Link, router, usePoll } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { Clock, Download, Filter, Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, Play, Search, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/pages/calls/pager-header';

interface CallSession {
    id: string;
    session_id: string;
    caller: {
        id: string;
        name: string;
        avatar?: string;
    };
    lead?: {
        id: string;
        name: string;
        phone: string;
    };
    caller_number: string;
    callee_number: string;
    status: 'initiated' | 'ringing' | 'answered' | 'ended' | 'failed' | 'cancelled';
    call_type: 'voice' | 'video';
    call_direction: 'inbound' | 'outbound';
    started_at: string;
    answered_at?: string;
    ended_at?: string;
    duration?: number;
    end_reason?: string;
    recording_path?: string;
    recording_url?: string;
}

interface Props {
    callSessions: {
        data: CallSession[];
        links: any[];
        meta: any;
    };
    stats: {
        total_calls: number;
        active_calls: number;
    };
    filters?: {
        search?: string;
        status?: string;
        direction?: string;
        type?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Calls', href: '/calls' },
];

function getStatusColor(status: string) {
    switch (status) {
        case 'answered':
            return 'bg-green-500/15 text-green-400 border-green-500/20';
        case 'ringing':
        case 'initiated':
            return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
        case 'ended':
            return 'bg-muted text-muted-foreground border-border';
        case 'failed':
        case 'cancelled':
            return 'bg-red-500/15 text-red-400 border-red-500/20';
        default:
            return 'bg-muted text-muted-foreground border-border';
    }
}

function getDirectionIcon(direction: string) {
    return direction === 'inbound' ? (
        <PhoneIncoming className="size-3.5 text-blue-400" />
    ) : (
        <PhoneOutgoing className="size-3.5 text-emerald-400" />
    );
}

function formatDuration(seconds?: number) {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatRelativeTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

export default function Index({ callSessions, stats, filters }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters?.search || '');
    const [statusFilter, setStatusFilter] = useState(filters?.status || 'all');
    const [directionFilter, setDirectionFilter] = useState(filters?.direction || 'all');

    // Poll every 5 seconds for real-time data updates
    usePoll(5000);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (searchTerm) params.set('search', searchTerm);
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (directionFilter !== 'all') params.set('direction', directionFilter);

        router.get('/calls', Object.fromEntries(params), {
            preserveState: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setDirectionFilter('all');
        router.get('/calls', {}, { preserveState: true, replace: true });
    };

    const hasActiveFilters = searchTerm || statusFilter !== 'all' || directionFilter !== 'all';

    const playRecording = (call: CallSession) => {
        if (!call.recording_url) return;

        const callerName = call.caller.name;
        const calleeName = call.lead?.name || call.callee_number;
        const callDate = new Date(call.started_at).toLocaleDateString();
        const title = `${callerName} → ${calleeName} - ${callDate}`;

        toast(<AudioPlayerToast audioUrl={call.recording_url} title={title} fallbackDuration={call.duration} />, {
            duration: Infinity,
            closeButton: true,
            classNames: {
                toast: '!w-full !max-w-md',
                content: '!w-full',
                title: '!w-full',
            },
        });
    };

    const thisMonthCount = callSessions.data.filter((call) => {
        const callDate = new Date(call.started_at);
        const now = new Date();
        return callDate.getMonth() === now.getMonth() && callDate.getFullYear() === now.getFullYear();
    }).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Call Sessions" />

            <div className="flex flex-1 flex-col">
                <PageHeader />

                <div className="flex flex-1 flex-col gap-4 px-5 pb-5 lg:px-6 lg:pb-6">
                    {/* Stats */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Card>
                            <CardContent className="flex items-center gap-3 p-4">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                                    <Phone className="size-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-2xl font-semibold leading-none">{stats.total_calls}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Total Calls</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-3 p-4">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                                    <PhoneCall className="size-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-semibold leading-none text-green-500">{stats.active_calls}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Active Calls</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-3 p-4">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                                    <Clock className="size-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-semibold leading-none text-blue-500">{thisMonthCount}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">This Month</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filters */}
                    <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, number, or session ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-32 sm:w-36">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="answered">Answered</SelectItem>
                                    <SelectItem value="ended">Ended</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={directionFilter} onValueChange={setDirectionFilter}>
                                <SelectTrigger className="w-32 sm:w-36">
                                    <SelectValue placeholder="Direction" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Direction</SelectItem>
                                    <SelectItem value="inbound">Inbound</SelectItem>
                                    <SelectItem value="outbound">Outbound</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button type="submit" size="sm">
                                <Filter className="mr-1.5 size-3.5" />
                                Filter
                            </Button>

                            {hasActiveFilters && (
                                <Button variant="ghost" size="sm" onClick={clearFilters}>
                                    <X className="mr-1.5 size-3.5" />
                                    Clear
                                </Button>
                            )}
                        </div>
                    </form>

                    {/* Calls Table */}
                    <Card className="flex-1">
                        <CardContent className="p-0">
                            {callSessions.data.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <Phone className="mb-3 size-10 text-muted-foreground/50" />
                                    <p className="text-sm font-medium text-muted-foreground">No calls found</p>
                                    <p className="mt-1 text-xs text-muted-foreground/70">
                                        {hasActiveFilters ? 'Try adjusting your filters' : 'Calls will appear here once initiated'}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="min-w-[200px]">Participants</TableHead>
                                                <TableHead className="w-[100px]">Direction</TableHead>
                                                <TableHead className="w-[100px]">Status</TableHead>
                                                <TableHead className="w-[120px]">Started</TableHead>
                                                <TableHead className="w-[80px]">Duration</TableHead>
                                                <TableHead className="w-[100px]">Recording</TableHead>
                                                <TableHead className="w-[80px] text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {callSessions.data.map((call) => (
                                                <TableRow key={call.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="size-8">
                                                                <AvatarImage src={call.caller.avatar} />
                                                                <AvatarFallback className="text-xs">
                                                                    {getInitials(call.caller.name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-medium">
                                                                    {call.caller.name}{' '}
                                                                    <span className="text-muted-foreground">→</span>{' '}
                                                                    {call.lead?.name || call.callee_number}
                                                                </p>
                                                                <p className="truncate font-mono text-xs text-muted-foreground">
                                                                    {call.caller_number} → {call.callee_number}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1.5">
                                                            {getDirectionIcon(call.call_direction)}
                                                            <span className="text-xs capitalize">{call.call_direction}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={getStatusColor(call.status)}>
                                                            {call.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-xs text-muted-foreground" title={new Date(call.started_at).toLocaleString()}>
                                                            {formatRelativeTime(call.started_at)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-mono text-xs">{formatDuration(call.duration)}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {call.recording_url ? (
                                                            <div className="flex items-center gap-0.5">
                                                                <Button variant="ghost" size="icon" className="size-7" onClick={() => playRecording(call)} title="Play">
                                                                    <Play className="size-3.5" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="size-7"
                                                                    onClick={() => window.open(call.recording_url, '_blank')}
                                                                    title="Download"
                                                                >
                                                                    <Download className="size-3.5" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground/50">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Link href={`/calls/${call.id}`}>
                                                            <Button variant="ghost" size="sm" className="text-xs">
                                                                View
                                                            </Button>
                                                        </Link>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            {/* Pagination */}
                            {callSessions.links && callSessions.links.length > 3 && (
                                <div className="flex justify-center gap-1 border-t p-3">
                                    {callSessions.links.map((link: any, index: number) => (
                                        <Button
                                            key={index}
                                            variant={link.active ? 'primary' : 'outline'}
                                            size="sm"
                                            className="h-7 min-w-7 text-xs"
                                            onClick={() => link.url && router.get(link.url)}
                                            disabled={!link.url}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
