import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Star,
    SquareCheckBig,
    FilePlus,
    FileCheck2,
    BarChart2,
    Download,
    Share,
    Info,
    Phone,
    Mail,
    MoreVertical,
} from 'lucide-react';
import { useState } from 'react';
import { useAsteriskWebSocket } from '@/contexts/AsteriskWebSocketContext';
import { useOutboundCalls } from '@/hooks/useOutboundCalls';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import type { Lead } from '@/types/lead';
import { toast } from 'sonner';

export function PageHeader({ lead }: { lead: Lead }) {
    const [isFavorite, setIsFavorite] = useState(false);
    const [isCalling, setIsCalling] = useState(false);
    const { state, actions } = useAsteriskWebSocket();
    const { startOutboundCall } = useOutboundCalls();
    const { auth } = usePage<SharedData>().props;

    const handleCall = async () => {
        if (!lead.phone) {
            toast.error('No phone number available for this lead');
            return;
        }

        if (!auth.user.extension) {
            toast.error('Extension not configured. Please update your profile.');
            return;
        }

        if (state.connectionStatus !== 'connected') {
            toast.warning('Not connected to call server. Please check your connection.');
            return;
        }

        setIsCalling(true);

        try {
            // Trigger outbound call notification immediately with full lead data
            startOutboundCall(lead.phone, lead.id, {
                id: String(lead.id),
                name: lead.name,
                phone: lead.phone,
                email: lead.email,
                city: lead.city,
                country: lead.country,
                service: lead.service,
                inquiry_status: lead.inquiry_status,
                priority: lead.priority,
                detail: lead.detail,
                budget: lead.budget,
            });

            const success = await actions.makeCall({
                extension: auth.user.extension!,
                phoneNumber: lead.phone,
                leadId: lead.id,
            });

            if (!success) {
                toast.error('Failed to initiate call. Please try again.');
            }
        } catch (error) {
            console.error('Call error:', error);
            toast.error('An error occurred while trying to make the call');
        } finally {
            // Reset calling state after a short delay
            setTimeout(() => setIsCalling(false), 2000);
        }
    };

    return (
        <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4">
            {/* Lead info section */}
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <Avatar className="h-8 w-8 shrink-0 sm:h-9 sm:w-9">
                    <AvatarFallback className="bg-primary/10 text-sm text-primary sm:text-base">
                        {lead.name[0]?.toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                    <div className="flex items-center gap-2">
                        <span className="truncate text-base font-semibold sm:text-xl">
                            {lead.name}
                        </span>
                        {lead.inquiry_status === 'assigned_to_advisor' && (
                            <Badge variant="secondary" className="shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                Assigned to Advisor
                            </Badge>
                        )}
                    </div>
                    {lead.inquiry_status !== 'assigned_to_advisor' && (
                        <span className="truncate text-xs capitalize text-muted-foreground">
                            {lead.inquiry_status?.replace(/_/g, ' ')}
                        </span>
                    )}
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="hidden shrink-0 sm:flex"
                                onClick={() => setIsFavorite(!isFavorite)}
                            >
                                <Star
                                    className={`h-4 w-4 ${
                                        isFavorite
                                            ? 'fill-yellow-500 text-yellow-500'
                                            : ''
                                    }`}
                                />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Mark as favorite</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Desktop actions */}
            <div className="hidden items-center gap-2 md:flex">
                <TooltipProvider>
                    <div className="flex items-center gap-1">
                        {lead.email && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Mail className="h-4 w-4" />
                                        Email
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Send email to {lead.email}
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {lead.phone && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCall}
                                        disabled={isCalling || state.connectionStatus !== 'connected'}
                                    >
                                        <Phone className={`h-4 w-4 ${isCalling ? 'animate-pulse' : ''}`} />
                                        {isCalling ? 'Calling...' : 'Call'}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {state.connectionStatus !== 'connected'
                                        ? 'Call server not connected'
                                        : 'Call client'}
                                </TooltipContent>
                            </Tooltip>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <FilePlus className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>New note</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <SquareCheckBig className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>New task</TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <FileCheck2 className="h-4 w-4" />
                            Actions
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[230px]">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <BarChart2 className="h-4 w-4" />
                            Generate Report
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Download className="h-4 w-4" />
                            Export as CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Share className="h-4 w-4" />
                            Share Lead
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-muted-foreground">
                            <Info className="h-4 w-4" />
                            Learn more
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Mobile/Tablet actions */}
            <div className="flex items-center gap-1 md:hidden">
                {/* Primary actions visible on mobile */}
                {lead.phone && (
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={handleCall}
                        disabled={isCalling || state.connectionStatus !== 'connected'}
                    >
                        <Phone className={`h-4 w-4 ${isCalling ? 'animate-pulse' : ''}`} />
                        <span className="sr-only">Call</span>
                    </Button>
                )}
                {lead.email && (
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                    >
                        <Mail className="h-4 w-4" />
                        <span className="sr-only">Email</span>
                    </Button>
                )}

                {/* More actions dropdown for mobile */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">More actions</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                        <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsFavorite(!isFavorite)}>
                            <Star
                                className={`h-4 w-4 ${
                                    isFavorite ? 'fill-yellow-500 text-yellow-500' : ''
                                }`}
                            />
                            {isFavorite ? 'Remove favorite' : 'Add to favorites'}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <FilePlus className="h-4 w-4" />
                            New note
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <SquareCheckBig className="h-4 w-4" />
                            New task
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>More</DropdownMenuLabel>
                        <DropdownMenuItem>
                            <BarChart2 className="h-4 w-4" />
                            Generate Report
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Download className="h-4 w-4" />
                            Export as CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Share className="h-4 w-4" />
                            Share Lead
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
