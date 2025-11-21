import React from 'react';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Trash2,
  Info,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export interface CallLog {
  id: string;
  contact_name: string;
  contact_number: string;
  contact_avatar?: string;
  direction: 'inbound' | 'outbound';
  status: 'completed' | 'missed' | 'rejected' | 'busy';
  duration?: number;
  created_at: string;
}

interface RecentCallsListProps {
  calls: CallLog[];
  onCallBack: (call: CallLog) => void;
  onDelete?: (callId: string) => void;
  onViewDetails?: (call: CallLog) => void;
  filter?: 'all' | 'missed' | 'outgoing' | 'incoming';
  className?: string;
}

export function RecentCallsList({
  calls,
  onCallBack,
  onDelete,
  onViewDetails,
  filter = 'all',
  className,
}: RecentCallsListProps) {
  // Filter calls based on selected filter
  const filteredCalls = calls.filter((call) => {
    if (filter === 'all') {
      return true;
    }
    if (filter === 'missed') {
      return call.status === 'missed';
    }
    if (filter === 'outgoing') {
      return call.direction === 'outbound';
    }
    if (filter === 'incoming') {
      return call.direction === 'inbound' && call.status !== 'missed';
    }
    return true;
  });

  // Format call duration
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  // Get call icon based on direction and status
  const getCallIcon = (call: CallLog) => {
    if (call.status === 'missed') {
      return <PhoneMissed className="h-4 w-4 text-red-500" />;
    }
    if (call.direction === 'inbound') {
      return <PhoneIncoming className="h-4 w-4 text-blue-500" />;
    }
    return <PhoneOutgoing className="h-4 w-4 text-green-500" />;
  };

  // Get initials from name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (filteredCalls.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-12 text-center',
          className
        )}
      >
        <Phone className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
        <p className="text-sm text-muted-foreground">
          {filter === 'all' ? 'No recent calls' : `No ${filter} calls`}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Your call history will appear here
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {filteredCalls.map((call) => (
        <div
          key={call.id}
          className={cn(
            'flex items-center gap-3 p-3',
            'rounded-lg border border-border/50',
            'hover:bg-muted/50 transition-colors',
            'group'
          )}
        >
          {/* Avatar */}
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={call.contact_avatar} alt={call.contact_name} />
            <AvatarFallback className="text-xs">
              {getInitials(call.contact_name)}
            </AvatarFallback>
          </Avatar>

          {/* Call Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getCallIcon(call)}
              <p className="font-medium truncate">{call.contact_name}</p>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{call.contact_number}</span>
              {call.duration && call.status === 'completed' && (
                <>
                  <span>•</span>
                  <span>{formatDuration(call.duration)}</span>
                </>
              )}
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-2 mt-1">
              {call.status === 'missed' && (
                <Badge variant="destructive" className="text-xs h-5">
                  Missed
                </Badge>
              )}
              {call.status === 'rejected' && (
                <Badge variant="secondary" className="text-xs h-5">
                  Rejected
                </Badge>
              )}
              {call.status === 'busy' && (
                <Badge variant="secondary" className="text-xs h-5">
                  Busy
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(call.created_at), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Call Back Button */}
            <Button
              onClick={() => onCallBack(call)}
              variant="ghost"
              size="icon"
              className="h-9 w-9"
            >
              <Phone className="h-4 w-4" />
            </Button>

            {/* View Details Button */}
            {onViewDetails && (
              <Button
                onClick={() => onViewDetails(call)}
                variant="ghost"
                size="icon"
                className="h-9 w-9"
              >
                <Info className="h-4 w-4" />
              </Button>
            )}

            {/* Delete Button */}
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete call log?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this call log? This
                      action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(call.id)}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
