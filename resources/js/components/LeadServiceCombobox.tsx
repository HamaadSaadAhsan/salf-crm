import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Lead, Service } from "@/types/lead";
import { CommandList } from "cmdk";
import { useServices } from "@/lib/useServices";
import { usePortalContainer } from "@/contexts/PortalContainerContext";
import { useOptimisticLeadUpdate } from "@/hooks/useLead";
import { useQueryClient } from "@tanstack/react-query";

const LeadServiceCombobox = ({ lead }: { lead: Lead | null | undefined }) => {
    const [open, setOpen] = useState(false);
    const serviceColor = useMemo(() => `hsl(${Math.random() * 360}, 70%, 50%)`, []);
    const { services, loading, error } = useServices();
    const portalContainer = usePortalContainer();
    const { mutate: updateLead } = useOptimisticLeadUpdate();
    const queryClient = useQueryClient();

    const handleServiceSelect = (service: Service) => {

        // Optimistically update the lead cache
        queryClient.setQueryData(['lead', lead?.id], (oldLead: Lead) => ({
            ...oldLead,
            service: service
        }));

        // onServiceChange(service);
        updateLead({id: lead?.id || "", updates: {service}});

        setOpen(false); // Close the popover after selection
    };
    if(!lead){
        return;
    }
    if (loading) return <div>Loading services...</div>;
    if (error) return <div>Error loading services</div>;

    return (
        <div className="flex items-center gap-3">
            <span className="text-sm text-gray-300 w-20 flex-shrink-0">Service</span>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: serviceColor }}></div>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Badge
                            variant="secondary"
                            className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 cursor-pointer hover:bg-gray-700 transition-colors flex items-center gap-1"
                        >
                            {lead.service?.name || "Select Service"}
                            <ChevronsUpDown className="h-3 w-3 opacity-50" />
                        </Badge>
                    </PopoverTrigger>
                    <PopoverContent
                        container={portalContainer}
                        className="w-[250px] h-[350px] p-0"
                        align="start"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        <Command className="bg-gray-900 text-white">
                            <CommandInput placeholder="Search services..." className="h-9 " />
                            <CommandList className="bg-gray-900 text-white border-gray-800 overflow-y-auto">
                                <CommandEmpty>No service found.</CommandEmpty>
                                <CommandGroup className="">
                                    {services.map((service: Service) => (
                                        <CommandItem
                                            key={service.id}
                                            value={service.name}
                                            onSelect={() => handleServiceSelect(service)}
                                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-900 "
                                        >
                                            <span className="flex-1 ">{service.name}</span>
                                            <Check
                                                className={cn(
                                                    "ml-auto h-4 w-4 flex-shrink-0",
                                                    lead.service?.id === service.id ? "opacity-100" : "opacity-0"
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

            {lead.service && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-400"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // onServiceRemove();
                    }}
                >
                    <X className="h-3 w-3" />
                </Button>
            )}
        </div>
    );
};

export default LeadServiceCombobox;
