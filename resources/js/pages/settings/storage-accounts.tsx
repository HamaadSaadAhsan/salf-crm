import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';

import DropBoxIcon from '@/components/icons/drop-box-icon';
import EmptyStorageAccounts from '@/components/icons/empty-storage-accounts';
import GoogleDriveIcon from '@/components/icons/google-drive-icon';
import { CreateButton } from '@/components/ui/create-button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { storageAccounts } from '@/routes/settings';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import axios from '@/lib/axios';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Storage accounts',
        href: storageAccounts().url,
    },
];

interface StorageAccountData {
    id: number;
    provider: string;
    provider_account_email: string;
    provider_account_name: string | null;
    is_active: boolean;
    created_at: string;
}

interface StorageProvider {
    name: string;
    key: string;
    description: string;
    icon: React.ReactNode;
    connectUrl?: string;
}

const providers: StorageProvider[] = [
    {
        name: 'Dropbox',
        key: 'dropbox',
        description: 'Connect your Dropbox to access and attach cloud files',
        icon: <DropBoxIcon className="size-4" />,
    },
    {
        name: 'Google Drive',
        key: 'google_drive',
        description: 'Connect your Google Drive to link files and folders to records',
        icon: <GoogleDriveIcon className="size-4" />,
        connectUrl: '/settings/storage-accounts/google-drive/connect',
    },
];

function ConnectedAccountCard({
    account,
    onDisconnect,
}: {
    account: StorageAccountData;
    onDisconnect: (account: StorageAccountData) => void;
}) {
    const provider = providers.find((p) => p.key === account.provider);

    return (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-3.5">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-zinc-50 dark:bg-zinc-900">
                    {provider?.icon ?? <GoogleDriveIcon className="size-4" />}
                </div>
                <div className="flex flex-col gap-0 overflow-hidden">
                    <span className="truncate text-sm font-medium leading-5 tracking-[-0.01em] text-foreground">
                        {account.provider_account_email}
                    </span>
                    <span className="text-xs font-medium leading-4 tracking-[-0.01em] text-foreground/[0.45]">
                        {provider?.name ?? account.provider} &middot; Connected {format(parseISO(account.created_at), 'MMM d, yyyy')}
                    </span>
                </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onDisconnect(account)}>
                Disconnect
            </Button>
        </div>
    );
}

export default function StorageAccounts({ storageAccounts: accounts = [] }: { storageAccounts: StorageAccountData[] }) {
    const [disconnectTarget, setDisconnectTarget] = useState<StorageAccountData | null>(null);
    const [isDisconnecting, setIsDisconnecting] = useState(false);

    const connectedAccounts = accounts;
    const hasAccounts = connectedAccounts.length > 0;

    const handleConnect = (provider: StorageProvider) => {
        if (provider.connectUrl) {
            window.location.href = provider.connectUrl;
        }
    };

    const handleDisconnect = async () => {
        if (!disconnectTarget) return;
        setIsDisconnecting(true);
        try {
            await axios.delete(`/settings/storage-accounts/google-drive/${disconnectTarget.id}/disconnect`);
            toast.success('Storage account disconnected.');
            router.reload();
        } catch {
            toast.error('Failed to disconnect account.');
        } finally {
            setIsDisconnecting(false);
            setDisconnectTarget(null);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Storage accounts" />

            <SettingsLayout>
                <div className="flex w-full max-w-3xl flex-col items-center-safe gap-10 px-[72px] py-[72px]">
                    <div className="flex w-full flex-col items-center-safe justify-start gap-6">
                        <div className="flex w-full flex-col items-start justify-start gap-4">
                            <div className="flex w-full flex-row items-center-safe justify-between gap-4">
                                <div className="flex w-full flex-row items-center-safe justify-start gap-4 overflow-hidden">
                                    <div className="flex w-full flex-col items-stretch justify-start gap-0.5 overflow-hidden">
                                        <div className="flex flex-row items-center-safe justify-start gap-2">
                                            <div
                                                className="text-2xl leading-7 font-semibold tracking-tight text-foreground"
                                                data-truncate="false"
                                                data-numeric="false"
                                                data-uppercase="false"
                                            >
                                                Storage accounts
                                            </div>
                                            <div className="flex flex-row items-center gap-1.5"></div>
                                        </div>
                                        <div className="items-center-safe text-sm leading-5 font-medium tracking-[-0.01em] text-muted-foreground">
                                            Learn more about{' '}
                                            <Button
                                                className="text-muted-foreground decoration-foreground/10"
                                                variant="foreground"
                                                mode="link"
                                                underlined="solid"
                                                size="sm"
                                                asChild
                                            >
                                                <Link href="">
                                                    storage integrations
                                                    <ArrowUpRight className="size-3" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <Separator />
                    </div>

                    {hasAccounts ? (
                        <div className="w-full space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium leading-5 tracking-[-0.01em] text-foreground">
                                    Connected accounts
                                </span>
                            </div>
                            <div className="space-y-2">
                                {connectedAccounts.map((account) => (
                                    <ConnectedAccountCard key={account.id} account={account} onDisconnect={setDisconnectTarget} />
                                ))}
                            </div>

                            <div className="pt-4">
                                <span className="text-sm font-medium leading-5 tracking-[-0.01em] text-muted-foreground">
                                    Add another account
                                </span>
                                <div className="mt-2 flex flex-row items-center gap-2 rounded-xl border border-dashed border-border bg-background p-2">
                                    {providers.map((provider) => (
                                        <CreateButton
                                            key={provider.name}
                                            className="flex-1 py-1.5 pr-2.5 pl-2"
                                            icon={provider.icon}
                                            onClick={() => handleConnect(provider)}
                                        >
                                            {provider.name}
                                        </CreateButton>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full space-y-3">
                            <Empty className="gap-0">
                                <EmptyHeader>
                                    <EmptyMedia>
                                        <EmptyStorageAccounts />
                                    </EmptyMedia>
                                </EmptyHeader>
                                <EmptyTitle className="mb-0 pb-0">No connected accounts</EmptyTitle>
                                <EmptyDescription>You can connect multiple storage accounts to Saad Ahsan CRM</EmptyDescription>
                                <EmptyContent className="pt-5">
                                    <div className="flex flex-row items-center gap-2 rounded-xl border border-dashed border-border bg-background p-2">
                                        {providers.map((provider) => (
                                            <CreateButton
                                                key={provider.name}
                                                className="flex-1 py-1.5 pr-2.5 pl-2"
                                                icon={provider.icon}
                                                onClick={() => handleConnect(provider)}
                                            >
                                                {provider.name}
                                            </CreateButton>
                                        ))}
                                    </div>
                                </EmptyContent>
                            </Empty>
                        </div>
                    )}
                </div>
            </SettingsLayout>

            {/* Disconnect confirmation */}
            <AlertDialog open={!!disconnectTarget} onOpenChange={(open) => !open && setDisconnectTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect storage account</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to disconnect "{disconnectTarget?.provider_account_email}"? Any linked files in leads will
                            also be removed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDisconnect}
                            className="bg-destructive text-white hover:bg-destructive/90"
                            disabled={isDisconnecting}
                        >
                            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
