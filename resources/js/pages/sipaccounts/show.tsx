import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Calendar, Edit, Phone, PhoneCall, User } from 'lucide-react';

interface SipAccount {
    id: string;
    username: string;
    domain: string;
    display_name?: string;
    port: number;
    transport: string;
    status: string;
    is_enabled: boolean;
    last_registered_at?: string;
    codec_priority?: string;
}

interface CallSession {
    id: string;
    caller_number: string;
    callee_number: string;
    status: string;
    call_type: string;
    call_direction: 'inbound' | 'outbound';
    started_at?: string;
    duration?: number;
    callee?: { id: string; name: string };
}

interface Props {
    sipAccount: SipAccount;
    recentCalls: CallSession[];
}

export default function Show({ sipAccount, recentCalls }: Props) {
    const formatDuration = (seconds?: number) => {
        if (!seconds) return '-';
        const m = Math.floor(seconds / 60);
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl leading-tight font-semibold text-foreground">SIP Account</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Details and recent calls</p>
                    </div>
                    <Link href={`/sip-accounts/${sipAccount.id}/edit`}>
                        <Button>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                    </Link>
                </div>
            }
        >
            <Head title={`SIP ${sipAccount.username}`} />

            <div className="mx-auto max-w-6xl space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Phone className="h-5 w-5" /> {sipAccount.display_name || sipAccount.username}
                        </CardTitle>
                        <CardDescription>Connection and registration information</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                                <div className="text-sm text-muted-foreground">SIP Address</div>
                                <div className="font-mono">{sipAccount.username}@{sipAccount.domain}:{sipAccount.port}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Transport</div>
                                <div>{sipAccount.transport}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Status</div>
                                <Badge>{sipAccount.status}</Badge>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Enabled</div>
                                <div>{sipAccount.is_enabled ? 'Yes' : 'No'}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Last Registered</div>
                                <div>{sipAccount.last_registered_at ? new Date(sipAccount.last_registered_at).toLocaleString() : 'Never'}</div>
                            </div>
                            {sipAccount.codec_priority && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Codec Priority</div>
                                    <div className="font-mono text-sm">{sipAccount.codec_priority}</div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PhoneCall className="h-5 w-5" /> Recent Calls
                        </CardTitle>
                        <CardDescription>Last 10 calls made from this account</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentCalls.length === 0 ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" /> No recent calls
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Direction</TableHead>
                                        <TableHead>To</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Started</TableHead>
                                        <TableHead>Duration</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentCalls.map((call) => (
                                        <TableRow key={call.id}>
                                            <TableCell className="capitalize">{call.call_direction}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4" />
                                                    <span className="font-mono">{call.callee_number}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="capitalize">{call.status}</TableCell>
                                            <TableCell>{call.started_at ? new Date(call.started_at).toLocaleString() : '-'}</TableCell>
                                            <TableCell>{formatDuration(call.duration)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
