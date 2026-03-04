import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type User } from '@/types';
import type { Lead } from '@/types/lead';
import { Head, router } from '@inertiajs/react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { LeadPage as LeadComponent } from './show/lead';
import { PageHeader } from './show/page-header';
import { PanelHeader } from './show/panel-header';

interface Navigation {
    prev: number | null;
    next: number | null;
    current: number;
    total: number;
}

type Props = {
    lead: Lead;
    users?: User[];
    tab?: string;
    navigation: Navigation;
};

function LeadPanel({ lead, users = [], tab = 'overview', navigation }: Props) {
    const [container, setContainer] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setContainer(document.querySelector('main'));
    }, []);

    return (
        <DialogPrimitive.Root
            open={true}
            modal={false}
            onOpenChange={(open) => {
                if (!open) {
                    router.visit('/leads', { preserveState: false });
                }
            }}
        >
            <DialogPrimitive.Portal container={container}>
                <DialogPrimitive.Content
                    className="absolute inset-0 z-1 outline-none"
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogPrimitive.Title className="sr-only">
                        Lead - {lead.name}
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="sr-only">
                        Lead details panel
                    </DialogPrimitive.Description>

                    {/* Panel wrapper */}
                    <div
                        className="ml-1.5 flex flex-col overflow-hidden rounded-l-xl border-l border-border bg-background"
                        style={{
                            maxWidth: 'calc(100% - 7px)',
                            height: 'calc(100% - 2px)',
                        }}
                    >
                        <PanelHeader lead={lead} navigation={navigation} />
                        {/* Dialog body */}
                        <div className="flex flex-1 flex-col items-stretch overflow-hidden">
                            <PageHeader lead={lead} users={users} />
                            <LeadComponent lead={lead} users={users} activeTab={tab} />
                        </div>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

export default function LeadShow({ lead, users = [], tab = 'overview', navigation }: Props) {
    return (
        <AppLayout hideContentHeader>
            <Head title={`Lead - ${lead.name}`} />
            <LeadPanel lead={lead} users={users} tab={tab} navigation={navigation} />
        </AppLayout>
    );
}
