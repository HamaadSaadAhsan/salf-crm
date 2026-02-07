import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePortalContainer } from '@/contexts/PortalContainerContext';
import { useOptimisticLeadUpdate } from '@/hooks/useLead';
import { useStatuses } from '@/lib/useStatus';
import { cn } from '@/lib/utils';
import { SharedData } from '@/types';
import { Lead, LeadStatus, Status } from '@/types/lead';
import { usePage } from '@inertiajs/react';
import { useQueryClient } from '@tanstack/react-query';
import { CommandList } from 'cmdk';
import { AlertCircle, Check, CheckCircle2, ChevronsUpDown, Clock, FileText, Phone, RefreshCw, Trophy, UserCheck, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

/**
 * CRO status transition map — mirrors backend rules in LeadController::update()
 */
const croTransitions: Record<string, string[]> = {
    new: ['contacted', 'nurturing', 'lost'],
    contacted: ['qualified', 'nurturing', 'lost'],
    qualified: ['assigned_to_advisor', 'nurturing', 'lost'],
    requalify: ['contacted', 'qualified', 'nurturing', 'lost'],
    nurturing: ['contacted', 'lost'],
    assigned_to_advisor: ['requalify', 'won', 'lost'],
};

const restrictedRoles = ['support-agent', 'senior-support-agent', 'sales-rep', 'senior-sales-rep'];
const adminRoles = ['super-admin', 'admin', 'manager', 'team-lead'];

type Props = {
    lead: Lead | null | undefined;
};

function LeadStatusCombobox({ lead }: Props) {
    const portalContainer = usePortalContainer();
    const [open, setOpen] = useState(false);
    const { statuses } = useStatuses();
    const { mutate: updateLead } = useOptimisticLeadUpdate();
    const queryClient = useQueryClient();
    const { auth } = usePage<SharedData>().props;

    const allowedStatuses = useMemo(() => {
        if (!lead || !statuses.length) return statuses;

        const userRoles = (auth.user?.roles ?? []).map((r) => r.name);
        const isCRO = userRoles.some((r) => restrictedRoles.includes(r)) && !userRoles.some((r) => adminRoles.includes(r));
        const isAdmin = userRoles.some((r) => adminRoles.includes(r)) || auth.isSuperAdmin;

        // Admins see all statuses
        if (isAdmin) return statuses;

        // CROs see only allowed transitions from current status
        if (isCRO) {
            const allowed = croTransitions[lead.inquiry_status] ?? [];
            return statuses.filter((s) => allowed.includes(s.name));
        }

        return statuses;
    }, [lead, statuses, auth]);

    const handleStatusChange = (status: string) => {
        // Optimistically update the lead cache
        queryClient.setQueryData(['lead', lead?.id], (oldLead: Lead) => ({
            ...oldLead,
            inquiry_status: status,
        }));

        updateLead({ id: lead?.id || '', updates: { inquiry_status: status as LeadStatus } });

        setOpen(false);
    };

    if (!lead) {
        return;
    }

    return (
        <div className="px-4 py-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Badge
                        variant="secondary"
                        className="flex cursor-pointer items-center gap-1 bg-gray-800 px-2 py-0.5 text-xs text-gray-300 transition-colors hover:bg-gray-700"
                    >
                        <div className="flex items-center gap-2">
                            {lead.inquiry_status === 'new' && (
                                <>
                                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                                    <span className="text-sm font-medium text-yellow-500">New</span>
                                </>
                            )}
                            {lead.inquiry_status === 'contacted' && (
                                <>
                                    <Phone className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm font-medium text-blue-500">Contacted</span>
                                </>
                            )}
                            {lead.inquiry_status === 'qualified' && (
                                <>
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    <span className="text-sm font-medium text-green-500">Qualified</span>
                                </>
                            )}
                            {lead.inquiry_status === 'assigned_to_advisor' && (
                                <>
                                    <UserCheck className="h-4 w-4 text-indigo-500" />
                                    <span className="text-sm font-medium text-indigo-500">Assigned to Advisor</span>
                                </>
                            )}
                            {lead.inquiry_status === 'requalify' && (
                                <>
                                    <RefreshCw className="h-4 w-4 text-orange-500" />
                                    <span className="text-sm font-medium text-orange-500">Requalify</span>
                                </>
                            )}
                            {lead.inquiry_status === 'proposal' && (
                                <>
                                    <FileText className="h-4 w-4 text-purple-500" />
                                    <span className="text-sm font-medium text-purple-500">Proposal</span>
                                </>
                            )}
                            {lead.inquiry_status === 'won' && (
                                <>
                                    <Trophy className="h-4 w-4 text-emerald-500" />
                                    <span className="text-sm font-medium text-emerald-500">Won</span>
                                </>
                            )}
                            {lead.inquiry_status === 'lost' && (
                                <>
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    <span className="text-sm font-medium text-red-500">Lost</span>
                                </>
                            )}
                            {lead.inquiry_status === 'nurturing' && (
                                <>
                                    <Clock className="h-4 w-4 text-orange-500" />
                                    <span className="text-sm font-medium text-orange-500">Nurturing</span>
                                </>
                            )}
                        </div>
                        <ChevronsUpDown className="h-3 w-3 opacity-50" />
                    </Badge>
                </PopoverTrigger>
                <PopoverContent
                    container={portalContainer}
                    className="h-auto max-h-[350px] w-[250px] p-0"
                    align="start"
                    onWheel={(e) => e.stopPropagation()}
                >
                    <Command className="">
                        <CommandInput placeholder="Search statuses..." className="h-9" />
                        <CommandList className="overflow-y-auto">
                            <CommandEmpty>No status found.</CommandEmpty>
                            <CommandGroup className="">
                                {allowedStatuses.map((status: Status) => (
                                    <CommandItem
                                        key={status.id}
                                        value={status.name}
                                        onSelect={(value) => {
                                            if (value === status.name) {
                                                handleStatusChange(value);
                                            }
                                        }}
                                        className="flex cursor-pointer items-center gap-2"
                                    >
                                        <span className="flex-1">{status.name}</span>
                                        <Check
                                            className={cn(
                                                'ml-auto h-4 w-4 flex-shrink-0',
                                                lead.inquiry_status === status.name ? 'opacity-100' : 'opacity-0',
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}

export default LeadStatusCombobox;
