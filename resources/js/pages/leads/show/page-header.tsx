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
    RefreshCw,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAsteriskWebSocket } from '@/contexts/AsteriskWebSocketContext';
import { useOutboundCalls } from '@/hooks/useOutboundCalls';
import { usePage } from '@inertiajs/react';
import { type SharedData, type User } from '@/types';
import type { Lead } from '@/types/lead';
import { toast } from 'sonner';
import { NewNoteSheet } from './new-note-sheet';
import { LeadTaskSheet } from '@/components/lead-task-sheet';
import axios from '@/lib/http';
import PhoneRevealController from '@/actions/App/Http/Controllers/Api/PhoneRevealController';

interface PageHeaderProps {
    lead: Lead;
    users?: User[];
}

function maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '••••';
    const last4 = digits.slice(-4);
    const masked = '•'.repeat(digits.length - 4);
    return masked + last4;
}

function PhoneRevealButton({ lead }: { lead: Lead }) {
    const [revealed, setRevealed] = useState(false);
    const [phone, setPhone] = useState<string | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [loading, setLoading] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const handleReveal = async () => {
        setLoading(true);
        try {
            const res = await axios.post<{ phone: string; duration: number }>(
                PhoneRevealController.reveal.url(lead.id)
            );
            const { phone: revealedPhone, duration } = res.data;
            setPhone(revealedPhone);
            setRevealed(true);
            setSecondsLeft(duration);

            clearTimer();
            timerRef.current = setInterval(() => {
                setSecondsLeft((s) => {
                    if (s <= 1) {
                        clearTimer();
                        setRevealed(false);
                        setPhone(null);
                        return 0;
                    }
                    return s - 1;
                });
            }, 1000);
        } catch {
            toast.error('Could not reveal phone number');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => () => clearTimer(), [clearTimer]);

    if (!lead.phone) return null;

    if (revealed && phone) {
        return (
            <div className="flex items-center gap-1.5">
                <span className="text-sm font-mono tabular-nums">{phone}</span>
                <span className="text-xs text-muted-foreground tabular-nums w-[26px]">{secondsLeft}s</span>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={handleReveal}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 h-8 text-sm font-mono tabular-nums hover:bg-accent transition-colors disabled:opacity-50"
        >
            <Phone className="size-3.5 shrink-0 text-muted-foreground" />
            <span>{maskPhone(lead.phone)}</span>
        </button>
    );
}

export function PageHeader({ lead, users = [] }: PageHeaderProps) {
    const [isFavorite, setIsFavorite] = useState(false);
    const [isCalling, setIsCalling] = useState(false);
    const [noteSheetOpen, setNoteSheetOpen] = useState(false);
    const [taskSheetOpen, setTaskSheetOpen] = useState(false);
    const { state, actions } = useAsteriskWebSocket();
    const { startOutboundCall } = useOutboundCalls();
    const { auth, systemSettings } = usePage<SharedData>().props;
    const callingEnabled = systemSettings?.calling_enabled ?? true;
    const canEdit = auth.permissions.includes('edit leads');

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
                service: lead.service?.data,
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
        <>
            <div className="grid shrink-0 grid-cols-[1fr_1fr] gap-3 overflow-hidden border-b border-border">
                {/* Left column: Lead info */}
                <div className="flex shrink-0 flex-col items-center justify-start gap-1 px-2.5 py-2 w-full">
                    <div className="flex w-full items-center gap-2">
                        <Avatar className="h-8 w-8 shrink-0 sm:h-9 sm:w-9">
                            <AvatarFallback className="bg-primary/10 text-sm text-primary sm:text-base">{lead.name[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-col">
                            <div className="flex items-center gap-2">
                                <span className="truncate text-base font-semibold sm:text-xl">{lead.name}</span>
                                {lead.inquiry_status === 'assigned_to_advisor' && (
                                    <Badge variant="secondary" className="shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                        Assigned to Advisor
                                    </Badge>
                                )}
                                {lead.inquiry_status === 'requalify' && (
                                    <Badge variant="secondary" className="shrink-0 bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                                        <RefreshCw className="mr-1 h-3 w-3" />
                                        Requalify
                                    </Badge>
                                )}
                                {lead.requalified_from_advisor_id && lead.inquiry_status !== 'requalify' && (
                                    <Badge variant="secondary" className="shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                        <RefreshCw className="mr-1 h-3 w-3" />
                                        Requalified
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="hidden shrink-0 sm:flex" onClick={() => setIsFavorite(!isFavorite)}>
                                        <Star className={`h-4 w-4 ${isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Mark as favorite</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                {/* Right column: Actions */}
                {canEdit && (
                <div className="flex shrink-0 flex-col items-end justify-start gap-1 px-2.5 py-2 w-full">
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
                                        <TooltipContent>Send email to {lead.email}</TooltipContent>
                                    </Tooltip>
                                )}
                                {callingEnabled ? (
                                    lead.phone && (
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
                                                {state.connectionStatus !== 'connected' ? 'Call server not connected' : 'Call client'}
                                            </TooltipContent>
                                        </Tooltip>
                                    )
                                ) : (
                                    <PhoneRevealButton lead={lead} />
                                )}
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
                                <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setNoteSheetOpen(true)}>
                                    <FilePlus className="h-4 w-4" />
                                    New Note
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTaskSheetOpen(true)}>
                                    <SquareCheckBig className="h-4 w-4" />
                                    New Task
                                </DropdownMenuItem>
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
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Mobile/Tablet actions */}
                    <div className="flex items-center gap-1 md:hidden">
                        {callingEnabled ? (
                            lead.phone && (
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
                            )
                        ) : (
                            <PhoneRevealButton lead={lead} />
                        )}
                        {lead.email && (
                            <Button variant="outline" size="icon" className="h-9 w-9">
                                <Mail className="h-4 w-4" />
                                <span className="sr-only">Email</span>
                            </Button>
                        )}

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
                                    <Star className={`h-4 w-4 ${isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                                    {isFavorite ? 'Remove favorite' : 'Add to favorites'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setNoteSheetOpen(true)}>
                                    <FilePlus className="h-4 w-4" />
                                    New note
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTaskSheetOpen(true)}>
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
                )}
            </div>

            {canEdit && (
                <>
                    <NewNoteSheet open={noteSheetOpen} onOpenChange={setNoteSheetOpen} leadId={lead.id} onSuccess={() => setNoteSheetOpen(false)} />

                    <LeadTaskSheet
                        open={taskSheetOpen}
                        onOpenChange={setTaskSheetOpen}
                        leadId={lead.id}
                        users={users}
                        currentUserId={auth.user.id}
                        userRole={auth.user.role as any}
                    />
                </>
            )}
        </>
    );
}
