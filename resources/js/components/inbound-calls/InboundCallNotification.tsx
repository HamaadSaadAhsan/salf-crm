import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ActiveCall } from '@/hooks/useInboundCalls';
import { Building, MapPin, Phone, PhoneIncoming, Tag, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface InboundCallNotificationProps {
    call: ActiveCall;
    onOpenLeadDialog?: () => void;
    onOpenNewLeadDialog?: () => void;
    onDismiss?: () => void;
}

export function InboundCallNotification({
    call,
    onOpenLeadDialog,
    onOpenNewLeadDialog,
    onDismiss,
}: InboundCallNotificationProps) {
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - call.startTime.getTime()) / 1000);
            setDuration(elapsed);
        }, 1000);

        return () => clearInterval(interval);
    }, [call.startTime]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const eventColors = {
        ring: 'bg-blue-500',
        connect: 'bg-green-500',
        disconnect: 'bg-gray-500',
        hangup: 'bg-red-500',
    };

    return (
        <Card className="fixed bottom-4 right-4 z-50 w-96 animate-in slide-in-from-bottom-4 shadow-2xl">
            <div className="flex flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className={`absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full ${eventColors[call.event]}`} />
                            <Avatar className="h-12 w-12 border-2 border-primary/20">
                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                                    {call.lead ? getInitials(call.lead.name) : <PhoneIncoming className="h-5 w-5" />}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm font-medium">
                                    {call.lead ? call.lead.name : 'Incoming Call'}
                                </p>
                            </div>
                            <p className="text-xs text-muted-foreground">Extension: {call.exten}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onDismiss}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Lead Info or New Caller */}
                {call.lead ? (
                    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <h3 className="font-semibold">{call.lead.name}</h3>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary" className="text-xs">
                                        {call.lead.inquiry_status}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                        {call.lead.priority}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {call.lead.city && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{call.lead.city}</span>
                                {call.lead.country && <span>, {call.lead.country}</span>}
                            </div>
                        )}

                        {call.lead.service && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Building className="h-3 w-3" />
                                <span>{call.lead.service.name}</span>
                            </div>
                        )}

                        {call.lead.tags && Array.isArray(call.lead.tags) && call.lead.tags.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Tag className="h-3 w-3 text-muted-foreground" />
                                <div className="flex flex-wrap gap-1">
                                    {call.lead.tags.slice(0, 3).map((tag: any, index: number) => (
                                        <Badge key={index} variant="outline" className="text-xs">
                                            {tag.label || tag}
                                        </Badge>
                                    ))}
                                    {call.lead.tags.length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                            +{call.lead.tags.length - 3}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 p-4 text-center">
                        <p className="text-sm text-muted-foreground">New Caller</p>
                        <p className="text-xs text-muted-foreground/70">No existing lead found</p>
                    </div>
                )}

                {/* Call Status */}
                <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2">
                    <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 animate-pulse rounded-full ${eventColors[call.event]}`} />
                        <span className="text-xs font-medium capitalize">{call.event}</span>
                    </div>
                    <span className="font-mono text-sm font-semibold tabular-nums">{formatDuration(duration)}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    {call.lead ? (
                        <Button className="flex-1" onClick={onOpenLeadDialog}>
                            View Lead & Take Notes
                        </Button>
                    ) : (
                        <Button className="flex-1" onClick={onOpenNewLeadDialog}>
                            Create Lead
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
}
