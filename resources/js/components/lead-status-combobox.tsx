import { Lead, LeadStatus, Status } from '@/types/lead'
import { AlertCircle, CheckCircle2, Clock, FileText, Phone, Trophy, XCircle } from 'lucide-react'
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandList } from "cmdk";
import { usePortalContainer } from "@/contexts/PortalContainerContext";
import { useStatuses } from '@/lib/useStatus';
import {useOptimisticLeadUpdate} from "@/hooks/useLead";
import {useQueryClient} from "@tanstack/react-query";

type Props = {
    lead: Lead | null | undefined
}

function LeadStatusCombobox({ lead }: Props) {
    const portalContainer = usePortalContainer();
    const [open, setOpen] = useState(false);
    const { statuses, loading, error } = useStatuses()
    const { mutate: updateLead } = useOptimisticLeadUpdate();
    const queryClient = useQueryClient();

    const handleStatusChange = (status: string) => {
        // Optimistically update the lead cache
        queryClient.setQueryData(['lead', lead?.id], (oldLead: Lead) => ({
            ...oldLead,
            inquiry_status: status
        }));

        // onServiceChange(service);
        updateLead({id: lead?.id || "", updates: {inquiry_status: status as LeadStatus}});

        setOpen(false); // Close the popover after selection
    };

    if(!lead){
        return;
    }

    return (
        <div className="px-4 py-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Badge
                        variant="secondary"
                        className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 cursor-pointer hover:bg-gray-700 transition-colors flex items-center gap-1"
                    >
                        <div className="flex items-center gap-2">
                            {lead.inquiry_status === "new" && (
                                <>
                                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                                    <span className="text-sm text-yellow-500 font-medium">New</span>
                                </>
                            )}
                            {lead.inquiry_status === "contacted" && (
                                <>
                                    <Phone className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm text-blue-500 font-medium">Contacted</span>
                                </>
                            )}
                            {lead.inquiry_status === "qualified" && (
                                <>
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    <span className="text-sm text-green-500 font-medium">Qualified</span>
                                </>
                            )}
                            {lead.inquiry_status === "proposal" && (
                                <>
                                    <FileText className="h-4 w-4 text-purple-500" />
                                    <span className="text-sm text-purple-500 font-medium">Proposal</span>
                                </>
                            )}
                            {lead.inquiry_status === "won" && (
                                <>
                                    <Trophy className="h-4 w-4 text-emerald-500" />
                                    <span className="text-sm text-emerald-500 font-medium">Won</span>
                                </>
                            )}
                            {lead.inquiry_status === "lost" && (
                                <>
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    <span className="text-sm text-red-500 font-medium">Lost</span>
                                </>
                            )}
                            {lead.inquiry_status === "nurturing" && (
                                <>
                                    <Clock className="h-4 w-4 text-orange-500" />
                                    <span className="text-sm text-orange-500 font-medium">Nurturing</span>
                                </>
                            )}
                        </div>
                        <ChevronsUpDown className="h-3 w-3 opacity-50" />
                    </Badge>
                </PopoverTrigger>
                <PopoverContent
                    container={portalContainer}
                    className="w-[250px] h-auto max-h-[350px] p-0"
                    align="start"
                    onWheel={(e) => e.stopPropagation()}
                >
                    <Command className="">
                        <CommandInput placeholder="Search statuses..." className="h-9 " />
                        <CommandList className=" overflow-y-auto">
                            <CommandEmpty>No status found.</CommandEmpty>
                            <CommandGroup className="">
                                {statuses.map((status: Status) => (
                                    <CommandItem
                                        key={status.id}
                                        value={status.name}
                                        onSelect={(value) => {
                                            if(value === status.name){
                                                handleStatusChange(value)
                                            }
                                        }}
                                        className="flex items-center gap-2 cursor-pointer"
                                    >
                                        <span className="flex-1 ">{status.name}</span>
                                        <Check
                                            className={cn(
                                                "ml-auto h-4 w-4 flex-shrink-0",
                                                lead.inquiry_status === status.name ? "opacity-100" : "opacity-0"
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
    )
}

export default LeadStatusCombobox
