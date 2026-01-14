'use client';

import * as React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

interface ResponsiveSelectProps {
  /**
   * Whether the select is open
   */
  open: boolean;
  /**
   * Callback when open state changes
   */
  onOpenChange: (open: boolean) => void;
  /**
   * The trigger element that opens the select
   */
  trigger: React.ReactNode;
  /**
   * Title shown in the drawer header on mobile
   */
  title?: string;
  /**
   * The content (typically Command component with search/options)
   */
  children: React.ReactNode;
  /**
   * Custom class name for the content container
   */
  contentClassName?: string;
  /**
   * Alignment for the popover on desktop
   */
  align?: 'start' | 'center' | 'end';
  /**
   * Side for the popover on desktop
   */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /**
   * Whether the popover/drawer should be modal
   */
  modal?: boolean;
}

/**
 * ResponsiveSelect - A wrapper component that renders Popover on desktop
 * and Drawer (bottom sheet) on mobile for a native app-like experience.
 *
 * Use this component for any selection interface that needs to be touch-friendly
 * on mobile devices while maintaining the familiar popover pattern on desktop.
 */
export function ResponsiveSelect({
  open,
  onOpenChange,
  trigger,
  title,
  children,
  contentClassName,
  align = 'start',
  side = 'bottom',
  modal = true,
}: ResponsiveSelectProps) {
  const isMobile = useIsMobile();

  // Mobile: Render as a bottom sheet drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent
          className={cn(
            'max-h-[85vh] rounded-t-2xl',
            // Safe area padding for notched devices
            'pb-[env(safe-area-inset-bottom)]',
            contentClassName,
          )}
        >
          {/* Handle indicator is built into DrawerContent */}
          {title && (
            <DrawerHeader className="border-b border-border px-4 py-3 text-center">
              <DrawerTitle className="text-lg font-semibold">{title}</DrawerTitle>
            </DrawerHeader>
          )}
          {/* Mobile content wrapper with touch-friendly styling */}
          <div className="flex-1 overflow-hidden px-2 py-2">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Render as a popover
  return (
    <Popover open={open} onOpenChange={onOpenChange} modal={modal}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className={cn('w-[min(200px,calc(100vw-2rem))] p-0', contentClassName)}
        align={align}
        side={side}
        avoidCollisions={true}
        collisionPadding={16}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Hook to get responsive select content styles based on device type.
 * Use this to style Command items differently on mobile vs desktop.
 */
export function useResponsiveSelectStyles() {
  const isMobile = useIsMobile();

  return {
    isMobile,
    // Item height: 52px on mobile for better touch targets, auto on desktop
    itemClassName: isMobile
      ? 'min-h-[52px] cursor-pointer px-4 py-3 text-base'
      : 'min-h-[36px] cursor-pointer',
    // List max height
    listClassName: isMobile
      ? 'max-h-[calc(85vh-120px)] overflow-auto touch-pan-y overscroll-contain'
      : 'max-h-[min(300px,50vh)]',
    // Input styling - no border needed, wrapper div already has border-b
    inputClassName: isMobile
      ? 'h-12 text-base px-4 placeholder:text-base'
      : 'h-9',
    // Input wrapper styling - removes default border on mobile since drawer has its own styling
    inputWrapperClassName: isMobile
      ? '[&_[cmdk-input-wrapper]]:border-0 [&_[cmdk-input-wrapper]]:px-4'
      : '',
  };
}
