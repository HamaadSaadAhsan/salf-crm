import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePortalContainer } from '@/contexts/PortalContainerContext';
import { useOptimisticLeadUpdate } from '@/hooks/useLead';
import { useServices } from '@/lib/useServices';
import { cn } from '@/lib/utils';
import { Lead, Service } from '@/types/lead';
import { useQueryClient } from '@tanstack/react-query';
import { CommandList } from 'cmdk';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { useMemo, useState } from 'react';

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
            service: service,
        }));

        // onServiceChange(service);
        updateLead({ id: lead?.id || '', updates: { service } });

        setOpen(false); // Close the popover after selection
    };
    if (!lead) {
        return;
    }
    if (loading) return <div>Loading services...</div>;
    if (error) return <div>Error loading services</div>;

    return (
        <div className="flex items-center gap-3">
            <span className="w-20 flex-shrink-0 text-sm text-gray-300">Service</span>
            <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded" style={{ backgroundColor: serviceColor }}></div>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Badge
                            variant="secondary"
                            className="flex cursor-pointer items-center gap-1 bg-gray-800 px-2 py-0.5 text-xs text-gray-300 transition-colors hover:bg-gray-700"
                        >
                            {lead.service?.name || 'Select Service'}
                            <ChevronsUpDown className="h-3 w-3 opacity-50" />
                        </Badge>
                    </PopoverTrigger>
                    <PopoverContent
                        container={portalContainer}
                        className="h-[350px] w-[250px] p-0"
                        align="start"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        <Command className="bg-gray-900 text-white">
                            <CommandInput placeholder="Search services..." className="h-9" />
                            <CommandList className="overflow-y-auto border-gray-800 bg-gray-900 text-white">
                                <CommandEmpty>No service found.</CommandEmpty>
                                <CommandGroup className="">
                                    {services.map((service: Service) => (
                                        <CommandItem
                                            key={service.id}
                                            value={service.name}
                                            onSelect={() => handleServiceSelect(service)}
                                            className="flex cursor-pointer items-center gap-2 hover:bg-gray-900"
                                        >
                                            <span className="flex-1">{service.name}</span>
                                            <Check
                                                className={cn(
                                                    'ml-auto h-4 w-4 flex-shrink-0',
                                                    lead.service?.id === service.id ? 'opacity-100' : 'opacity-0',
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
