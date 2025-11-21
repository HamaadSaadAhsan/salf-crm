import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePortalContainer } from '@/contexts/PortalContainerContext';
import { useOptimisticLeadUpdate } from '@/hooks/useLead';
import { useStatuses } from '@/lib/useStatus';
import { cn } from '@/lib/utils';
import { Lead, LeadStatus, Status } from '@/types/lead';
import { useQueryClient } from '@tanstack/react-query';
import { CommandList } from 'cmdk';
import { AlertCircle, Check, CheckCircle2, ChevronsUpDown, Clock, FileText, Phone, Trophy, XCircle } from 'lucide-react';
import { useState } from 'react';

type Props = {
    lead: Lead | null | undefined;
};

function LeadStatusCombobox({ lead }: Props) {
    const portalContainer = usePortalContainer();
    const [open, setOpen] = useState(false);
    const { statuses, loading, error } = useStatuses();
    const { mutate: updateLead } = useOptimisticLeadUpdate();
    const queryClient = useQueryClient();

    const handleStatusChange = (status: string) => {
        // Optimistically update the lead cache
        queryClient.setQueryData(['lead', lead?.id], (oldLead: Lead) => ({
            ...oldLead,
            inquiry_status: status,
        }));

        // onServiceChange(service);
        updateLead({ id: lead?.id || '', updates: { inquiry_status: status as LeadStatus } });

        setOpen(false); // Close the popover after selection
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
                                {statuses.map((status: Status) => (
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
