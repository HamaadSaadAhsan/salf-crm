import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Pause,
  Play,
  Volume2,
  Hash,
  PhoneForwarded,
  Plus,
  Speaker,
  Headphones,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface CallControlsProps {
  isMuted: boolean;
  isOnHold: boolean;
  isSpeakerOn: boolean;
  onMuteToggle: () => void;
  onHoldToggle: () => void;
  onHangup: () => void;
  onSpeakerToggle: () => void;
  onKeypadToggle?: () => void;
  onTransfer?: () => void;
  onAddCall?: () => void;
  showKeypadToggle?: boolean;
  showTransfer?: boolean;
  showAddCall?: boolean;
  disabled?: boolean;
  className?: string;
}

export function CallControls({
  isMuted,
  isOnHold,
  isSpeakerOn,
  onMuteToggle,
  onHoldToggle,
  onHangup,
  onSpeakerToggle,
  onKeypadToggle,
  onTransfer,
  onAddCall,
  showKeypadToggle = true,
  showTransfer = false,
  showAddCall = false,
  disabled = false,
  className,
}: CallControlsProps) {
  return (
    <TooltipProvider>
      <div className={cn('flex flex-col gap-4', className)}>
        {/* Primary Controls Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Mute/Unmute */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onMuteToggle}
                disabled={disabled}
                variant={isMuted ? 'default' : 'outline'}
                size="lg"
                className={cn(
                  'h-16 flex-col gap-1',
                  isMuted &&
                    'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700'
                )}
              >
                {isMuted ? (
                  <MicOff className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
                <span className="text-xs">{isMuted ? 'Unmute' : 'Mute'}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isMuted ? 'Unmute microphone' : 'Mute microphone'}</p>
            </TooltipContent>
          </Tooltip>

          {/* Hold/Resume */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onHoldToggle}
                disabled={disabled}
                variant={isOnHold ? 'default' : 'outline'}
                size="lg"
                className={cn(
                  'h-16 flex-col gap-1',
                  isOnHold &&
                    'bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700'
                )}
              >
                {isOnHold ? (
                  <Play className="h-6 w-6" />
                ) : (
                  <Pause className="h-6 w-6" />
                )}
                <span className="text-xs">{isOnHold ? 'Resume' : 'Hold'}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isOnHold ? 'Resume call' : 'Put call on hold'}</p>
            </TooltipContent>
          </Tooltip>

          {/* Speaker Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onSpeakerToggle}
                disabled={disabled}
                variant={isSpeakerOn ? 'default' : 'outline'}
                size="lg"
                className="h-16 flex-col gap-1"
              >
                {isSpeakerOn ? (
                  <Speaker className="h-6 w-6" />
                ) : (
                  <Headphones className="h-6 w-6" />
                )}
                <span className="text-xs">
                  {isSpeakerOn ? 'Speaker' : 'Earpiece'}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {isSpeakerOn
                  ? 'Switch to earpiece'
                  : 'Switch to speaker'}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Secondary Controls Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Keypad Toggle */}
          {showKeypadToggle && onKeypadToggle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onKeypadToggle}
                  disabled={disabled}
                  variant="outline"
                  size="lg"
                  className="h-14 flex-col gap-1"
                >
                  <Hash className="h-5 w-5" />
                  <span className="text-xs">Keypad</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Show keypad</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Transfer */}
          {showTransfer && onTransfer && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onTransfer}
                  disabled={disabled}
                  variant="outline"
                  size="lg"
                  className="h-14 flex-col gap-1"
                >
                  <PhoneForwarded className="h-5 w-5" />
                  <span className="text-xs">Transfer</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Transfer call</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Add Call */}
          {showAddCall && onAddCall && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onAddCall}
                  disabled={disabled}
                  variant="outline"
                  size="lg"
                  className="h-14 flex-col gap-1"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-xs">Add</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add call (conference)</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Hangup Button - Always prominent */}
        <Button
          onClick={onHangup}
          disabled={disabled}
          size="lg"
          className={cn(
            'h-14 w-full mt-2',
            'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700',
            'text-white font-semibold',
            'shadow-lg hover:shadow-xl',
            'transition-all duration-200',
            'active:scale-95'
          )}
        >
          <PhoneOff className="mr-2 h-5 w-5" />
          End Call
        </Button>
      </div>
    </TooltipProvider>
  );
}
