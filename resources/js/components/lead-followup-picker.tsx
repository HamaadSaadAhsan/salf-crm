import * as React from "react"
import { X, CalendarIcon, Check } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { usePortalContainer } from "@/contexts/PortalContainerContext"
import { Lead } from "@/types/lead"
import {useOptimisticLeadUpdate} from "@/hooks/useLead";
import {useQueryClient} from "@tanstack/react-query";

export default function LeadFollowupPicker({lead}: {lead: Lead | null | undefined}) {
    const [open, setOpen] = React.useState(false)
    const [date, setDate] = React.useState<Date | undefined>(
        lead?.next_follow_up_at ? new Date(lead?.next_follow_up_at) : undefined
    )
    const [time, setTime] = React.useState<string>(
        lead?.next_follow_up_at ? format(new Date(lead?.next_follow_up_at), "HH:mm") : format(new Date(), "HH:mm")
    )
    const portalContainer = usePortalContainer();
    const { mutate: updateLead } = useOptimisticLeadUpdate();
    const queryClient = useQueryClient();

    const handleDateSelect = (selectedDate: Date | undefined) => {
        if (selectedDate) {
            const now = new Date()
            now.setHours(0, 0, 0, 0)
            if (selectedDate < now) {
                return
            }
            setDate(selectedDate)
        }
    }

    const getDisplayDateTime = () => {
        if (!date) return "No date"
        const [hours, minutes] = time.split(":")
        const dateTime = new Date(date)
        dateTime.setHours(parseInt(hours), parseInt(minutes))
        return format(dateTime, "MMM d, yyyy h:mm a")
    }

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = e.target.value
        if (newTime) {
            setTime(newTime)
        }
    }

    const handleFollowUpUpdate = () => {
        if (!date) return;

        // Combine date and time into a single Date object
        const [hours, minutes] = time.split(":");
        const followUpDateTime = new Date(date);
        followUpDateTime.setHours(parseInt(hours), parseInt(minutes));

        // Convert to ISO string for the API
        const followUpDateTimeISO = followUpDateTime.toLocaleString('en-US', {hour12: false});

        // Optimistically update the lead cache
        queryClient.setQueryData(['lead', lead?.id], (oldLead: Lead) => ({
            ...oldLead,
            next_follow_up_at: followUpDateTimeISO
        }));

        // Update the lead using the mutation
        updateLead({
            id: lead?.id || "",
            updates: {
                next_follow_up_at: followUpDateTimeISO
            }
        });

        // Close the popover
        setOpen(false);
    };

    const handleClearFollowUp = () => {
        // Optimistically update the lead cache to clear the follow-up date
        queryClient.setQueryData(['lead', lead?.id], (oldLead: Lead) => ({
            ...oldLead,
            next_follow_up_at: undefined
        }));

        // Update the lead to clear the follow-up date
        updateLead({
            id: lead?.id || "",
            updates: {
                next_follow_up_at: undefined
            }
        });

        // Reset local state
        setDate(undefined);
        setTime(format(new Date(), "HH:mm"));
        setOpen(false);
    };

    return (
        <div className="flex items-center gap-3">
            <span className="text-sm text-gray-300 w-26 flex-shrink-0">Next Follow Up</span>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        size="sm"
                        id="date"
                        className="justify-between font-normal bg-gray-800 text-gray-300 px-2 py-0.5 cursor-pointer hover:bg-gray-700 transition-colors flex"
                    >
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-white">{getDisplayDateTime()}</span>
                        </div>
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    container={portalContainer}
                    className="w-auto overflow-hidden p-0"
                    align="start"
                >
                    <div className="space-y-3 p-3">
                        <Calendar
                            className=""
                            mode="single"
                            selected={date}
                            captionLayout="dropdown"
                            onSelect={handleDateSelect}
                            disabled={(date) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return date < today;
                            }}
                            startMonth={new Date()}
                            endMonth={new Date(new Date().getFullYear() + 10, 11, 31)}
                        />

                        <Input
                            type="time"
                            id="time"
                            step="1"
                            value={time}
                            onChange={handleTimeChange}
                            className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                        />

                        <div className="flex gap-2">
                            <Button
                                onClick={handleFollowUpUpdate}
                                disabled={!date}
                                size="sm"
                                className="flex-1"
                            >
                                <Check className="h-4 w-4 mr-2" />
                                Set Follow-up
                            </Button>
                            <Button
                                onClick={handleClearFollowUp}
                                variant="outline"
                                size="sm"
                                className="flex-1"
                            >
                                Clear
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            <Button
                onClick={handleClearFollowUp}
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-400"
            >
                <X className="h-3 w-3" />
            </Button>
        </div>
    )
}
