import { AudioPlayerToast } from '@/components/audio-player-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Phone, PhoneIncoming, PhoneMissed, PhoneOff, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type CallSession = {
    id: number;
    session_id: string;
    call_signature: string;
    caller: {
        id: number;
        name: string;
    } | null;
    caller_number: string;
    callee_number: string;
    status: string;
    started_at: string;
    answered_at: string | null;
    ended_at: string | null;
    duration: number | null;
    duration_formatted: string | null;
    end_reason: string | null;
    recording_url: string | null;
    has_recording: boolean;
};

type CallStatistics = {
    total_calls: number;
    completed_calls: number;
    missed_calls: number;
    total_duration: number;
    average_duration: number;
    last_call_at: string | null;
};

type CallHistoryResponse = {
    calls: CallSession[];
    statistics: CallStatistics;
};

type LeadRecordsCallsProps = {
    leadId: number | string;
};

export function LeadRecordsCalls({ leadId }: LeadRecordsCallsProps) {
    const [callHistory, setCallHistory] = useState<CallHistoryResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchCallHistory();
    }, [leadId]);

    const fetchCallHistory = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await fetch(`/api/leads/${leadId}/calls`);

            if (!response.ok) {
                throw new Error('Failed to fetch call history');
            }

            const data = await response.json();
            setCallHistory(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusIcon = (status: string, endReason: string | null) => {
        if (status === 'answered' || (status === 'ended' && endReason === 'hangup')) {
            return <Phone className="size-4 text-green-600" />;
        }
        if (endReason === 'declined') {
            return <PhoneOff className="size-4 text-red-600" />;
        }
        if (endReason === 'no_answer') {
            return <PhoneMissed className="size-4 text-orange-600" />;
        }
        return <PhoneIncoming className="size-4 text-gray-600" />;
    };

    const getStatusBadge = (status: string, endReason: string | null) => {
        if (status === 'answered' || (status === 'ended' && endReason === 'hangup')) {
            return (
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                    Completed
                </Badge>
            );
        }
        if (endReason === 'declined') {
            return (
                <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                    Declined
                </Badge>
            );
        }
        if (endReason === 'no_answer') {
            return (
                <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
                    Missed
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-700">
                {status}
            </Badge>
        );
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(date);
    };

    const formatDuration = (seconds: number | null) => {
        if (!seconds) return '-';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        }
        if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        }
        return `${secs}s`;
    };

    const playRecording = (call: CallSession) => {
        if (!call.recording_url) return;

        const callerName = call.caller?.name || 'Unknown';
        const callDate = new Date(call.started_at).toLocaleDateString();
        const title = `${callerName} - ${callDate}`;

        toast(<AudioPlayerToast audioUrl={call.recording_url} title={title} />, {
            duration: Infinity,
            closeButton: true,
            classNames: {
                toast: '!w-full !max-w-md',
                content: '!w-full',
                title: '!w-full',
            },
        });
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <h3 className="text-sm font-semibold">Call History</h3>
                <div className="animate-pulse space-y-3">
                    <div className="grid grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="rounded-lg border bg-card p-4">
                                <div className="h-4 w-20 rounded bg-muted" />
                                <div className="mt-2 h-6 w-12 rounded bg-muted" />
                            </div>
                        ))}
                    </div>
                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 rounded bg-muted" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-4">
                <h3 className="text-sm font-semibold">Call History</h3>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-800">
                    <p>{error}</p>
                    <button
                        onClick={fetchCallHistory}
                        className="mt-2 text-sm underline hover:no-underline"
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    if (!callHistory || callHistory.calls.length === 0) {
        return (
            <div className="space-y-4">
                <h3 className="text-sm font-semibold">Call History</h3>
                <div className="py-12 text-center text-muted-foreground">
                    No calls recorded yet
                </div>
            </div>
        );
    }

    const { calls, statistics } = callHistory;

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-sm font-semibold">Call Statistics</h3>
                <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <div className="rounded-lg border bg-card p-4">
                        <p className="text-xs text-muted-foreground">Total Calls</p>
                        <p className="mt-1 text-2xl font-semibold">{statistics.total_calls}</p>
                    </div>
                    <div className="rounded-lg border bg-card p-4">
                        <p className="text-xs text-muted-foreground">Completed</p>
                        <p className="mt-1 text-2xl font-semibold text-green-600">
                            {statistics.completed_calls}
                        </p>
                    </div>
                    <div className="rounded-lg border bg-card p-4">
                        <p className="text-xs text-muted-foreground">Missed</p>
                        <p className="mt-1 text-2xl font-semibold text-orange-600">
                            {statistics.missed_calls}
                        </p>
                    </div>
                    <div className="rounded-lg border bg-card p-4">
                        <p className="text-xs text-muted-foreground">Avg. Duration</p>
                        <p className="mt-1 text-2xl font-semibold">
                            {formatDuration(Math.round(statistics.average_duration || 0))}
                        </p>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-sm font-semibold">Recent Calls</h3>
                <div className="mt-4 rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12"></TableHead>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Caller</TableHead>
                                <TableHead>Number</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Duration</TableHead>
                                <TableHead className="w-24">Recording</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {calls.map((call) => (
                                <TableRow key={call.id}>
                                    <TableCell>
                                        {getStatusIcon(call.status, call.end_reason)}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {formatDateTime(call.started_at)}
                                    </TableCell>
                                    <TableCell>
                                        {call.caller ? call.caller.name : 'Unknown'}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {call.callee_number}
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(call.status, call.end_reason)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs">
                                        {call.duration_formatted || formatDuration(call.duration)}
                                    </TableCell>
                                    <TableCell>
                                        {call.has_recording && call.recording_url ? (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0"
                                                onClick={() => playRecording(call)}
                                                title="Play recording"
                                            >
                                                <Play className="size-4" />
                                            </Button>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
