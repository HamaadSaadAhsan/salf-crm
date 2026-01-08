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
} from 'lucide-react';
import { useState } from 'react';
import { useAsteriskWebSocket } from '@/contexts/AsteriskWebSocketContext';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { toast } from 'sonner';

type Lead = {
    id: number | string;
    name: string;
    email: string | null;
    phone: string | null;
    status: string;
};

export function PageHeader({ lead }: { lead: Lead }) {
    const [isFavorite, setIsFavorite] = useState(false);
    const [isCalling, setIsCalling] = useState(false);
    const { state, actions } = useAsteriskWebSocket();
    const { auth } = usePage<SharedData>().props;

    console.log(auth.user.extension)

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
            const success = await actions.makeCall({
                extension: auth.user.extension!,
                phoneNumber: lead.phone,
                leadId: lead.id,
            });

            if (success) {
                toast.success(`Calling ${lead.name} at ${lead.phone}...`);
            } else {
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
        <div className="flex items-center justify-between border-b px-6 py-4">
            <h1 className="inline-flex items-center gap-2 text-xl font-semibold">
                <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary">
                        {lead.name[0]?.toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span>{lead.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                        {lead.status}
                    </span>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
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
            </h1>

            <div className="flex items-center gap-2">
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
        </div>
    );
}
