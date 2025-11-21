import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { AlertCircle, CheckCircle, Clock, Edit, MoreHorizontal, Phone, Plus, Power, Search, Trash2, Wifi, WifiOff, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface SipAccount {
    id: string;
    username: string;
    domain: string;
    display_name?: string;
    port: number;
    transport: string;
    status: 'active' | 'inactive' | 'registered' | 'unregistered';
    is_enabled: boolean;
    last_registered_at?: string;
    created_at: string;
}

interface Props {
    sipAccounts: SipAccount[];
    filters?: {
        search?: string;
        status?: string;
        enabled?: string | boolean;
    };
}

export default function Index({ sipAccounts, filters }: Props) {
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [search, setSearch] = useState(filters?.search ?? '');
    const [statusFilter, setStatusFilter] = useState(filters?.status ?? 'all');
    const [enabledFilter, setEnabledFilter] = useState((filters?.enabled as string)?.toString() ?? 'all');

    const applyFilters = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }
        const params = new URLSearchParams();
        if (search) {
            params.set('search', search);
        }
        if (statusFilter !== 'all') {
            params.set('status', statusFilter);
        }
        if (enabledFilter !== 'all') {
            params.set('enabled', enabledFilter);
        }
        router.get('/sip-accounts', Object.fromEntries(params), { preserveState: true, replace: true });
    };

    const clearFilters = () => {
        setSearch('');
        setStatusFilter('all');
        setEnabledFilter('all');
        router.get('/sip-accounts', {}, { preserveState: true, replace: true });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'registered':
            case 'active':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'unregistered':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'inactive':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'registered':
            case 'active':
                return <CheckCircle className="h-4 w-4" />;
            case 'unregistered':
                return <AlertCircle className="h-4 w-4" />;
            case 'inactive':
                return <XCircle className="h-4 w-4" />;
            default:
                return <AlertCircle className="h-4 w-4" />;
        }
    };

    const handleToggleStatus = (account: SipAccount) => {
        router.post(
            `/sip-accounts/${account.id}/toggle`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(`SIP account ${account.is_enabled ? 'disabled' : 'enabled'} successfully`);
                },
                onError: () => {
                    toast.error('Failed to update SIP account status');
                },
            },
        );
    };

    const handleRegister = (account: SipAccount) => {
        router.post(
            `/sip-accounts/${account.id}/register`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('SIP account registration queued');
                },
                onError: () => {
                    toast.error('Failed to queue SIP account registration');
                },
            },
        );
    };

    const handleDelete = (accountId: string) => {
        router.delete(`/sip-accounts/${accountId}`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('SIP account deleted successfully');
                setConfirmDelete(null);
            },
            onError: () => {
                toast.error('Failed to delete SIP account');
            },
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="SIP Accounts" />

            <Card className="border-0 h-full">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl leading-tight font-semibold text-gray-800 dark:text-gray-200">SIP Accounts</h2>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage your SIP accounts for making and receiving calls</p>
                        </div>
                        <Link href="/sip-accounts/create">
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Account
                            </Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mx-auto max-w-7xl space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Total Accounts</p>
                                            <p className="text-2xl font-bold">{sipAccounts.length}</p>
                                        </div>
                                        <Phone className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Active</p>
                                            <p className="text-2xl font-bold text-green-600">
                                                {
                                                    sipAccounts.filter((account) => account.status === 'registered' || account.status === 'active')
                                                        .length
                                                }
                                            </p>
                                        </div>
                                        <Wifi className="h-8 w-8 text-green-600" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Inactive</p>
                                            <p className="text-2xl font-bold text-red-600">
                                                {sipAccounts.filter((account) => account.status === 'inactive').length}
                                            </p>
                                        </div>
                                        <WifiOff className="h-8 w-8 text-red-600" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Pending</p>
                                            <p className="text-2xl font-bold text-yellow-600">
                                                {sipAccounts.filter((account) => account.status === 'unregistered').length}
                                            </p>
                                        </div>
                                        <Clock className="h-8 w-8 text-yellow-600" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* SIP Accounts Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle>SIP Accounts</CardTitle>
                                <CardDescription>A list of all your SIP accounts with their current status and registration details.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Toolbar */}
                                <form onSubmit={applyFilters} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                                    <div className="md:col-span-2">
                                        <div className="relative">
                                            <Input
                                                placeholder="Search username, domain, display name"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                className="pl-9"
                                            />
                                            <Search className="absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <div>
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All statuses</SelectItem>
                                                <SelectItem value="registered">Registered</SelectItem>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="unregistered">Unregistered</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Select value={enabledFilter} onValueChange={setEnabledFilter}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Enabled" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                <SelectItem value="true">Enabled</SelectItem>
                                                <SelectItem value="false">Disabled</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center gap-2 md:col-span-4">
                                        <Button type="submit">Apply</Button>
                                        <Button type="button" variant="outline" onClick={clearFilters}>
                                            Clear
                                        </Button>
                                    </div>
                                </form>

                                {sipAccounts.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <Phone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                                        <h3 className="mb-2 text-lg font-semibold">No SIP accounts found</h3>
                                        <p className="mb-4 text-muted-foreground">
                                            Get started by creating your first SIP account to make and receive calls.
                                        </p>
                                        <Link href="/sip-accounts/create">
                                            <Button>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Create SIP Account
                                            </Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Username</TableHead>
                                                <TableHead>Domain</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Transport</TableHead>
                                                <TableHead>Last Registered</TableHead>
                                                <TableHead>Enabled</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sipAccounts.map((account) => (
                                                <TableRow key={account.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center space-x-2">
                                                            {getStatusIcon(account.status)}
                                                            <div>
                                                                <p className="font-mono">{account.username}</p>
                                                                {account.display_name && (
                                                                    <p className="text-sm text-muted-foreground">{account.display_name}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-mono text-sm">
                                                            {account.domain}:{account.port}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={getStatusColor(account.status)}>{account.status}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{account.transport}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {account.last_registered_at ? (
                                                            <span className="text-sm">
                                                                {new Date(account.last_registered_at).toLocaleDateString()}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm text-muted-foreground">Never</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Switch checked={account.is_enabled} onCheckedChange={() => handleToggleStatus(account)} />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <Link href={`/sip-accounts/${account.id}`}>
                                                                    <DropdownMenuItem>View Details</DropdownMenuItem>
                                                                </Link>
                                                                <Link href={`/sip-accounts/${account.id}/edit`}>
                                                                    <DropdownMenuItem>
                                                                        <Edit className="mr-2 h-4 w-4" />
                                                                        Edit
                                                                    </DropdownMenuItem>
                                                                </Link>
                                                                <DropdownMenuItem onClick={() => handleRegister(account)}>
                                                                    <Power className="mr-2 h-4 w-4" />
                                                                    Re-register
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-destructive"
                                                                    onClick={() => setConfirmDelete(account.id)}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Confirm Deletion</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <p>Are you sure you want to delete this SIP account? This action cannot be undone.</p>
                                <div className="flex justify-end space-x-2">
                                    <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                                        Cancel
                                    </Button>
                                    <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete)}>
                                        Delete Account
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
