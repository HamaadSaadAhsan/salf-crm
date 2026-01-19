import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Minimize2, Maximize2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { CallControls } from './CallControls';

interface ActiveCallWidgetProps {
  contactName: string;
  contactAvatar?: string;
  duration: number;
  status: 'ringing' | 'connecting' | 'active' | 'on_hold';
  isMuted: boolean;
  isOnHold: boolean;
  isSpeakerOn: boolean;
  onMuteToggle: () => void;
  onHoldToggle: () => void;
  onHangup: () => void;
  onSpeakerToggle: () => void;
  onKeypadToggle?: () => void;
  className?: string;
}

const STORAGE_KEY = 'active-call-widget-position';
const SNAP_THRESHOLD = 50; // Distance from edge to trigger snap

export function ActiveCallWidget({
  contactName,
  contactAvatar,
  duration,
  status,
  isMuted,
  isOnHold,
  isSpeakerOn,
  onMuteToggle,
  onHoldToggle,
  onHangup,
  onSpeakerToggle,
  onKeypadToggle,
  className,
}: ActiveCallWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  // Load saved position from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const savedPosition = JSON.parse(saved);
        setPosition(savedPosition);
      } catch (error) {
        console.error('Failed to load widget position:', error);
      }
    }
  }, []);

  // Save position to localStorage
  const savePosition = useCallback((pos: { x: number; y: number }) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  }, []);

  // Format duration (seconds to MM:SS)
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle drag start (mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!widgetRef.current) {
      return;
    }
    const rect = widgetRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  // Handle drag start (touch)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!widgetRef.current) {
      return;
    }
    const touch = e.touches[0];
    const rect = widgetRef.current.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    });
    setIsDragging(true);
  };

  // Handle dragging (mouse)
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !widgetRef.current) {
        return;
      }

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Get widget dimensions
      const rect = widgetRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;

      // Constrain to screen bounds
      const constrainedX = Math.max(0, Math.min(newX, maxX));
      const constrainedY = Math.max(0, Math.min(newY, maxY));

      setPosition({ x: constrainedX, y: constrainedY });
    },
    [isDragging, dragOffset]
  );

  // Handle dragging (touch)
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !widgetRef.current) {
        return;
      }

      const touch = e.touches[0];
      const newX = touch.clientX - dragOffset.x;
      const newY = touch.clientY - dragOffset.y;

      const rect = widgetRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;

      const constrainedX = Math.max(0, Math.min(newX, maxX));
      const constrainedY = Math.max(0, Math.min(newY, maxY));

      setPosition({ x: constrainedX, y: constrainedY });
    },
    [isDragging, dragOffset]
  );

  // Handle drag end with snap to edges
  const handleDragEnd = useCallback(() => {
    if (!isDragging) {
      return;
    }

    setIsDragging(false);

    // Snap to edges if close enough
    let finalX = position.x;
    let finalY = position.y;

    if (widgetRef.current) {
      const rect = widgetRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;

      // Snap to left edge
      if (position.x < SNAP_THRESHOLD) {
        finalX = 20;
      }
      // Snap to right edge
      else if (position.x > maxX - SNAP_THRESHOLD) {
        finalX = maxX - 20;
      }

      // Snap to top edge
      if (position.y < SNAP_THRESHOLD) {
        finalY = 20;
      }
      // Snap to bottom edge
      else if (position.y > maxY - SNAP_THRESHOLD) {
        finalY = maxY - 20;
      }

      const finalPosition = { x: finalX, y: finalY };
      setPosition(finalPosition);
      savePosition(finalPosition);
    }
  }, [isDragging, position, savePosition]);

  // Add/remove event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleDragEnd);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleTouchMove, handleDragEnd]);

  return (
    <div
      ref={widgetRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 60,
      }}
      className={cn(
        'transition-all duration-200 ease-out',
        isDragging && 'cursor-grabbing',
        !isDragging && 'cursor-grab',
        className
      )}
    >
      <div
        className={cn(
          'backdrop-blur-xl bg-background/95 border-2 border-border',
          'rounded-2xl shadow-2xl',
          'overflow-hidden',
          isExpanded ? 'w-80' : 'w-72',
          isDragging && 'scale-105'
        )}
      >
        {/* Header - Always visible */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className={cn(
            'p-4 flex items-center gap-3',
            'border-b border-border/50',
            'select-none'
          )}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={contactAvatar} alt={contactName} />
            <AvatarFallback className="bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{contactName}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {status === 'ringing' && (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  Ringing...
                </span>
              )}
              {status === 'connecting' && <span>Connecting...</span>}
              {status === 'active' && (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                  {formatDuration(duration)}
                </span>
              )}
              {status === 'on_hold' && (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
                  On Hold
                </span>
              )}
            </div>
          </div>

          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-4">
            <CallControls
              isMuted={isMuted}
              isOnHold={isOnHold}
              isSpeakerOn={isSpeakerOn}
              onMuteToggle={onMuteToggle}
              onHoldToggle={onHoldToggle}
              onHangup={onHangup}
              onSpeakerToggle={onSpeakerToggle}
              onKeypadToggle={onKeypadToggle}
              showKeypadToggle={true}
              showTransfer={false}
              showAddCall={false}
            />
          </div>
        )}

        {/* Minimized Quick Actions */}
        {!isExpanded && (
          <div className="px-4 pb-4 flex gap-2">
            <Button
              onClick={onMuteToggle}
              variant={isMuted ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </Button>
            <Button
              onClick={onHangup}
              variant="destructive"
              size="sm"
              className="flex-1"
            >
              End
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
