import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import AuthenticatedLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Phone, Save, Settings } from 'lucide-react';
import { FormEventHandler } from 'react';
import { toast } from 'sonner';

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        username: '',
        password: '',
        domain: 'localhost',
        display_name: '',
        port: 5060,
        transport: 'UDP',
        codec_priority: 'ulaw,alaw,gsm',
        is_enabled: true,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post('/sip-accounts', {
            onSuccess: () => {
                toast.success('SIP account created successfully');
            },
            onError: (errors) => {
                toast.error('Failed to create SIP account');
                console.error(errors);
            },
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Create SIP Account" />
            <Card className="h-full border-0">
                <CardHeader>
                    <div className="flex items-center space-x-4">
                        <Link href="/sip-accounts">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to SIP Accounts
                            </Button>
                        </Link>
                        <div>
                            <h2 className="text-xl leading-tight font-semibold text-gray-800 dark:text-gray-200">Create SIP Account</h2>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                Configure a new SIP account for making and receiving calls
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mx-auto max-w-2xl">
                        <form onSubmit={submit} className="space-y-6">
                            {/* Basic Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Phone className="h-5 w-5" />
                                        Basic Information
                                    </CardTitle>
                                    <CardDescription>Enter the basic details for your SIP account</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="username">Username *</Label>
                                            <Input
                                                id="username"
                                                type="text"
                                                value={data.username}
                                                onChange={(e) => setData('username', e.target.value)}
                                                placeholder="Enter SIP username"
                                                className="font-mono"
                                                required
                                            />
                                            {errors.username && <p className="text-sm text-red-500">{errors.username}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="display_name">Display Name</Label>
                                            <Input
                                                id="display_name"
                                                type="text"
                                                value={data.display_name}
                                                onChange={(e) => setData('display_name', e.target.value)}
                                                placeholder="Enter display name"
                                            />
                                            {errors.display_name && <p className="text-sm text-red-500">{errors.display_name}</p>}
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="password">Password *</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                value={data.password}
                                                onChange={(e) => setData('password', e.target.value)}
                                                placeholder="Enter SIP password"
                                                required
                                            />
                                            {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Connection Settings */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Settings className="h-5 w-5" />
                                        Connection Settings
                                    </CardTitle>
                                    <CardDescription>Configure the connection parameters for your SIP server</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="domain">Domain/Host *</Label>
                                            <Input
                                                id="domain"
                                                type="text"
                                                value={data.domain}
                                                onChange={(e) => setData('domain', e.target.value)}
                                                placeholder="sip.example.com"
                                                className="font-mono"
                                                required
                                            />
                                            {errors.domain && <p className="text-sm text-red-500">{errors.domain}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="port">Port *</Label>
                                            <Input
                                                id="port"
                                                type="number"
                                                min="1"
                                                max="65535"
                                                value={data.port}
                                                onChange={(e) => setData('port', parseInt(e.target.value) || 5060)}
                                                placeholder="5060"
                                                required
                                            />
                                            {errors.port && <p className="text-sm text-red-500">{errors.port}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="transport">Transport Protocol</Label>
                                            <Select value={data.transport} onValueChange={(value) => setData('transport', value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select transport" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="UDP">UDP</SelectItem>
                                                    <SelectItem value="TCP">TCP</SelectItem>
                                                    <SelectItem value="TLS">TLS (Secure)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {errors.transport && <p className="text-sm text-red-500">{errors.transport}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="is_enabled">Enable Account</Label>
                                            <div className="flex items-center space-x-2 pt-2">
                                                <Switch
                                                    id="is_enabled"
                                                    checked={data.is_enabled}
                                                    onCheckedChange={(checked) => setData('is_enabled', checked)}
                                                />
                                                <Label htmlFor="is_enabled" className="text-sm text-muted-foreground">
                                                    Account will be automatically registered when enabled
                                                </Label>
                                            </div>
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="codec_priority">Codec Priority</Label>
                                            <Input
                                                id="codec_priority"
                                                type="text"
                                                value={data.codec_priority}
                                                onChange={(e) => setData('codec_priority', e.target.value)}
                                                placeholder="ulaw,alaw,gsm,g729"
                                                className="font-mono"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Comma-separated list of audio codecs in order of preference
                                            </p>
                                            {errors.codec_priority && <p className="text-sm text-red-500">{errors.codec_priority}</p>}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Action Buttons */}
                            <div className="flex justify-end space-x-2">
                                <Link href="/sip-accounts">
                                    <Button variant="outline" type="button">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={processing}>
                                    {processing ? (
                                        <>
                                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Create Account
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
