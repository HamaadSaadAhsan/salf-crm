import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import AuthenticatedLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Phone, Save } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { toast } from 'sonner';

interface SipAccount {
    id: string;
    username: string;
    domain: string;
    display_name?: string;
    port: number;
    transport: 'UDP' | 'TCP' | 'TLS';
    codec_priority?: string;
    is_enabled: boolean;
}

interface Props {
    sipAccount: SipAccount;
}

export default function Edit({ sipAccount }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        username: sipAccount.username,
        password: '',
        domain: sipAccount.domain,
        display_name: sipAccount.display_name ?? '',
        port: sipAccount.port,
        transport: sipAccount.transport,
        codec_priority: sipAccount.codec_priority ?? '',
        is_enabled: sipAccount.is_enabled,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(`/sip-accounts/${sipAccount.id}`, {
            onSuccess: () => toast.success('SIP account updated successfully'),
            onError: () => toast.error('Failed to update SIP account'),
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-4">
                    <Link href="/sip-accounts">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to SIP Accounts
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-xl leading-tight font-semibold text-foreground">Edit SIP Account</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Update your SIP account settings</p>
                    </div>
                </div>
            }
        >
            <Head title="Edit SIP Account" />

            <div className="mx-auto max-w-2xl">
                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Phone className="h-5 w-5" /> Account Details
                            </CardTitle>
                            <CardDescription>Update your SIP account credentials and settings</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="username">Username *</Label>
                                    <Input id="username" value={data.username} onChange={(e) => setData('username', e.target.value)} className="font-mono" required />
                                    {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="display_name">Display Name</Label>
                                    <Input id="display_name" value={data.display_name} onChange={(e) => setData('display_name', e.target.value)} />
                                    {errors.display_name && <p className="text-sm text-destructive">{errors.display_name}</p>}
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="password">Password (leave blank to keep unchanged)</Label>
                                    <Input id="password" type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} />
                                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="domain">Domain *</Label>
                                    <Input id="domain" value={data.domain} onChange={(e) => setData('domain', e.target.value)} required />
                                    {errors.domain && <p className="text-sm text-destructive">{errors.domain}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="port">Port *</Label>
                                    <Input id="port" type="number" value={data.port} onChange={(e) => setData('port', Number(e.target.value))} required />
                                    {errors.port && <p className="text-sm text-destructive">{errors.port}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Transport *</Label>
                                    <Select value={data.transport} onValueChange={(v) => setData('transport', v as SipAccount['transport'])}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select transport" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="UDP">UDP</SelectItem>
                                            <SelectItem value="TCP">TCP</SelectItem>
                                            <SelectItem value="TLS">TLS</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.transport && <p className="text-sm text-destructive">{errors.transport}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="codec_priority">Codec Priority</Label>
                                    <Input id="codec_priority" value={data.codec_priority} onChange={(e) => setData('codec_priority', e.target.value)} />
                                    {errors.codec_priority && <p className="text-sm text-destructive">{errors.codec_priority}</p>}
                                </div>
                                <div className="flex items-center justify-between rounded-md border p-3">
                                    <div>
                                        <Label htmlFor="is_enabled">Enabled</Label>
                                        <p className="text-sm text-muted-foreground">Toggle to enable or disable this account</p>
                                    </div>
                                    <Switch id="is_enabled" checked={data.is_enabled} onCheckedChange={(v) => setData('is_enabled', v)} />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button type="submit" disabled={processing}>
                                    <Save className="mr-2 h-4 w-4" /> Save Changes
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
