import { AudioPlayerToast } from '@/components/audio-player-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { useCall } from '@/providers/CallContextProvider';
import { Head, Link, router } from '@inertiajs/react';
import { Calendar, Clock, Download, Filter, Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, Play, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/pages/calls/pager-header';
import { Content } from '@/layouts/components/content';

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

function IndexContent({ callSessions, stats, filters }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters?.search || '');
    const [statusFilter, setStatusFilter] = useState(filters?.status || 'all');
    const [directionFilter, setDirectionFilter] = useState(filters?.direction || 'all');
    const { startCall: _startCall } = useCall();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'answered':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'ringing':
            case 'initiated':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'ended':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
            case 'failed':
            case 'cancelled':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    };

    const getDirectionIcon = (direction: string) => {
        return direction === 'inbound' ? <PhoneIncoming className="h-4 w-4" /> : <PhoneOutgoing className="h-4 w-4" />;
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '-';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

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

    const downloadRecording = (recordingPath: string, sessionId: string) => {
        // Implementation for downloading call recording
        const link = document.createElement('a');
        link.href = `/storage/${recordingPath}`;
        link.download = `call-recording-${sessionId}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                                <p className="text-2xl font-bold">{stats.total_calls}</p>
                            </div>
                            <Phone className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Active Calls</p>
                                <p className="text-2xl font-bold text-green-600">{stats.active_calls}</p>
                            </div>
                            <PhoneCall className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {
                                        callSessions.data.filter((call) => {
                                            const callDate = new Date(call.started_at);
                                            const now = new Date();
                                            return callDate.getMonth() === now.getMonth() && callDate.getFullYear() === now.getFullYear();
                                        }).length
                                    }
                                </p>
                            </div>
                            <Clock className="h-8 w-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
                        <div className="min-w-64 flex-1">
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, number, or session ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="All Status" />
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
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="All Direction" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Direction</SelectItem>
                                <SelectItem value="inbound">Inbound</SelectItem>
                                <SelectItem value="outbound">Outbound</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button type="submit">
                            <Filter className="mr-2 h-4 w-4" />
                            Filter
                        </Button>

                        {(searchTerm || statusFilter !== 'all' || directionFilter !== 'all') && (
                            <Button variant="outline" onClick={clearFilters}>
                                Clear
                            </Button>
                        )}
                    </form>
                </CardContent>
            </Card>

            {/* Calls Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Calls</CardTitle>
                    <CardDescription>A list of your recent call sessions with details and controls.</CardDescription>
                </CardHeader>
                <CardContent>
                    {callSessions.data.length === 0 ? (
                        <div className="py-12 text-center">
                            <Phone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                            <h3 className="mb-2 text-lg font-semibold">No calls found</h3>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Participants</TableHead>
                                    <TableHead>Direction</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Started</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Recording</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {callSessions.data.map((call) => (
                                    <TableRow key={call.id}>
                                        <TableCell>
                                            <div className="flex items-center space-x-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={call.caller.avatar} />
                                                    <AvatarFallback>{getInitials(call.caller.name)}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">
                                                        {call.caller.name} → {call.lead?.name || call.callee_number}
                                                    </p>
                                                    <p className="font-mono text-xs text-muted-foreground">
                                                        {call.caller_number} → {call.callee_number}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-1">
                                                {getDirectionIcon(call.call_direction)}
                                                <span className="text-sm capitalize">{call.call_direction}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getStatusColor(call.status)}>{call.status}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm">{new Date(call.started_at).toLocaleString()}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-sm">{formatDuration(call.duration)}</span>
                                        </TableCell>
                                        <TableCell>
                                            {call.recording_url ? (
                                                <div className="flex items-center space-x-1">
                                                    <Button variant="ghost" size="sm" onClick={() => playRecording(call)} title="Play recording">
                                                        <Play className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => window.open(call.recording_url, '_blank')}
                                                        title="Download recording"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">No recording</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/calls/${call.id}`}>
                                                <Button variant="ghost" size="sm">
                                                    View Details
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {/* Pagination */}
                    {callSessions.links && callSessions.links.length > 3 && (
                        <div className="mt-4 flex justify-center space-x-1">
                            {callSessions.links.map((link: any, index: number) => (
                                <Button
                                    key={index}
                                    variant={link.active ? 'primary' : 'outline'}
                                    size="sm"
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
    );
}

export default function Index({ callSessions, stats, filters }: Props) {
    return (
        <AppLayout>
            <Head title="Call Sessions" />
            <PageHeader />
            <Content className="px-5 md:px-0 lg-px-0">
                <IndexContent callSessions={callSessions} stats={stats} filters={filters} />
            </Content>
        </AppLayout>
    );
}
