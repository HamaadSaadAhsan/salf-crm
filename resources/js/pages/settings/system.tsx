import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type BreadcrumbItem, type SystemSettings } from '@/types';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { system } from '@/routes/settings';
import { update as systemUpdate } from '@/routes/settings/system';
import { api } from '@/lib/api';
import { ChevronLeft, ChevronRight, Phone, PhoneOff } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'System settings', href: system().url },
];

interface PhoneRevealRecord {
    id: number;
    user: { name: string; email: string } | null;
    lead: { id: string; name: string } | null;
    ip_address: string | null;
    revealed_at: string;
    expires_at: string;
}

interface Paginator<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

export default function SystemSettingsPage({
    settings,
    reveals,
}: {
    settings: SystemSettings;
    reveals: Paginator<PhoneRevealRecord>;
}) {
    const [callingEnabled, setCallingEnabled] = useState(settings.calling_enabled ?? false);
    const [revealDuration, setRevealDuration] = useState(String(settings.phone_reveal_duration ?? 30));
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put(systemUpdate().url, {
                calling_enabled: callingEnabled,
                phone_reveal_duration: parseInt(revealDuration, 10),
            });
            toast.success('System settings saved');
        } catch {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="System settings" />

            <SettingsLayout>
                <div className="w-full max-w-3xl space-y-5 py-6">

                    {/* ── Calling settings ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Calling</CardTitle>
                            <CardDescription>
                                Control whether the calling feature is active for all agents.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    {callingEnabled
                                        ? <Phone className="size-4 text-green-500" />
                                        : <PhoneOff className="size-4 text-muted-foreground" />
                                    }
                                    <div className="space-y-0.5">
                                        <Label htmlFor="calling-enabled" className="text-sm font-medium">
                                            Enable calling
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            {callingEnabled
                                                ? 'Call button shown in lead details. Phone numbers are hidden.'
                                                : 'Call button hidden. Phone numbers shown with timed reveal.'}
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    id="calling-enabled"
                                    checked={callingEnabled}
                                    onCheckedChange={setCallingEnabled}
                                />
                            </div>

                            {!callingEnabled && (
                                <div className="space-y-1.5 border-t pt-5">
                                    <Label htmlFor="reveal-duration">Phone reveal duration (seconds)</Label>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        How long a phone number stays visible after an agent reveals it. All reveals are logged.
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <Input
                                            id="reveal-duration"
                                            type="number"
                                            min={10}
                                            max={300}
                                            value={revealDuration}
                                            onChange={(e) => setRevealDuration(e.target.value)}
                                            className="w-28"
                                        />
                                        <span className="text-sm text-muted-foreground">seconds (10–300)</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving…' : 'Save changes'}
                        </Button>
                    </div>

                    {/* ── Phone Reveal Log ── */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <CardTitle>Phone reveal log</CardTitle>
                                    <CardDescription className="">
                                        Audit trail of every phone number reveal by agents.
                                        {reveals.total > 0 && (
                                            <span className="ml-1 font-medium text-foreground">{reveals.total.toLocaleString()} total</span>
                                        )}
                                    </CardDescription>
                                </div>
                                {reveals.total > 0 && (
                                    <Badge variant="secondary" appearance="light" size="sm">
                                        {reveals.total}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {reveals.data.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-12 text-center">
                                    <Phone className="size-8 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">No phone reveals yet</p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                                                    <th className="px-4 py-2.5">Agent</th>
                                                    <th className="px-4 py-2.5">Lead</th>
                                                    <th className="px-4 py-2.5">IP address</th>
                                                    <th className="px-4 py-2.5">Revealed at</th>
                                                    <th className="px-4 py-2.5">Expired at</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {reveals.data.map((r) => (
                                                    <tr key={r.id} className="hover:bg-muted/40 transition-colors">
                                                        <td className="px-4 py-2.5">
                                                            {r.user ? (
                                                                <div>
                                                                    <span className="font-medium">{r.user.name}</span>
                                                                    <span className="block text-xs text-muted-foreground">{r.user.email}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            {r.lead ? (
                                                                <Link
                                                                    href={`/leads/${r.lead.id}`}
                                                                    className="font-medium text-primary hover:underline"
                                                                >
                                                                    {r.lead.name}
                                                                </Link>
                                                            ) : (
                                                                <span className="text-muted-foreground">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                                                            {r.ip_address ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                                            {formatDate(r.revealed_at)}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                                            {formatDate(r.expires_at)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {reveals.last_page > 1 && (
                                        <div className="flex items-center justify-between border-t border-border px-4 py-3">
                                            <p className="text-xs text-muted-foreground">
                                                Showing {reveals.from}–{reveals.to} of {reveals.total}
                                            </p>
                                            <div className="flex items-center gap-1">
                                                {reveals.links.map((link, i) => {
                                                    if (link.label === '&laquo; Previous') {
                                                        return (
                                                            <Link
                                                                key={i}
                                                                href={link.url ?? '#'}
                                                                className="flex size-7 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-accent disabled:opacity-50"
                                                                aria-disabled={!link.url}
                                                            >
                                                                <ChevronLeft className="size-3.5" />
                                                            </Link>
                                                        );
                                                    }
                                                    if (link.label === 'Next &raquo;') {
                                                        return (
                                                            <Link
                                                                key={i}
                                                                href={link.url ?? '#'}
                                                                className="flex size-7 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-accent disabled:opacity-50"
                                                                aria-disabled={!link.url}
                                                            >
                                                                <ChevronRight className="size-3.5" />
                                                            </Link>
                                                        );
                                                    }
                                                    return (
                                                        <Link
                                                            key={i}
                                                            href={link.url ?? '#'}
                                                            className={`flex size-7 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                                                                link.active
                                                                    ? 'bg-primary text-primary-foreground'
                                                                    : 'border border-input text-muted-foreground hover:bg-accent'
                                                            }`}
                                                            aria-disabled={!link.url}
                                                        >
                                                            {link.label}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
