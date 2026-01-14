'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ActionOption {
  /**
   * Unique value identifier for the option
   */
  value: string;
  /**
   * Display label for the option
   */
  label: string;
  /**
   * Optional icon to display before the label
   */
  icon?: React.ReactNode;
  /**
   * Whether this option is destructive (displays in red)
   */
  destructive?: boolean;
  /**
   * Whether this option is disabled
   */
  disabled?: boolean;
}

interface MobileActionSheetProps {
  /**
   * Whether the action sheet is open
   */
  open: boolean;
  /**
   * Callback when open state changes
   */
  onOpenChange: (open: boolean) => void;
  /**
   * Title displayed at the top of the sheet
   */
  title: string;
  /**
   * Optional description below the title
   */
  description?: string;
  /**
   * Array of options to display
   */
  options: ActionOption[];
  /**
   * Currently selected value (shows check indicator)
   */
  selectedValue?: string;
  /**
   * Callback when an option is selected
   */
  onSelect: (value: string) => void;
  /**
   * Whether to show cancel button at the bottom
   * @default true
   */
  showCancel?: boolean;
  /**
   * Cancel button text
   * @default 'Cancel'
   */
  cancelText?: string;
}

/**
 * MobileActionSheet - A full-width bottom sheet for simple option selection.
 *
 * Features:
 * - 56px height per option for comfortable touch targets
 * - Visual indicator for selected option
 * - Cancel button at bottom
 * - Swipe-to-dismiss via Drawer
 * - Safe area padding for notched devices
 *
 * Use this component for simple, single-select option lists like status selection,
 * priority selection, or action menus.
 */
export function MobileActionSheet({
  open,
  onOpenChange,
  title,
  description,
  options,
  selectedValue,
  onSelect,
  showCancel = true,
  cancelText = 'Cancel',
}: MobileActionSheetProps) {
  const handleSelect = React.useCallback(
    (value: string) => {
      onSelect(value);
      onOpenChange(false);
    },
    [onSelect, onOpenChange],
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className={cn(
          'max-h-[85vh] rounded-t-2xl',
          // Safe area padding for notched devices
          'pb-[env(safe-area-inset-bottom)]',
        )}
      >
        {/* Title section */}
        <DrawerHeader className="border-b border-border px-4 py-4 text-center">
          <DrawerTitle className="text-lg font-semibold">{title}</DrawerTitle>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </DrawerHeader>

        {/* Options list */}
        <div className="flex-1 overflow-auto">
          <div className="divide-y divide-border">
            {options.map((option) => {
              const isSelected = option.value === selectedValue;
              const isDisabled = option.disabled;

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    // Base styles
                    'flex w-full items-center gap-3 px-4 transition-colors duration-100',
                    // Height: 56px for comfortable touch
                    'min-h-[56px]',
                    // Interactive states
                    'active:bg-accent/80',
                    !isDisabled && 'hover:bg-accent/50',
                    // Focus styles
                    'outline-none focus-visible:bg-accent/50',
                    // Disabled state
                    isDisabled && 'cursor-not-allowed opacity-50',
                    // Destructive variant
                    option.destructive && 'text-destructive',
                  )}
                >
                  {/* Selection indicator (radio-style circle or check) */}
                  <div
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/30',
                      option.destructive && isSelected && 'border-destructive bg-destructive',
                    )}
                  >
                    {isSelected && (
                      <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                    )}
                  </div>

                  {/* Icon (if provided) */}
                  {option.icon && (
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center',
                        option.destructive ? 'text-destructive' : 'text-muted-foreground',
                      )}
                    >
                      {option.icon}
                    </span>
                  )}

                  {/* Label */}
                  <span
                    className={cn(
                      'flex-1 text-left text-base font-normal',
                      !option.destructive && 'text-foreground',
                    )}
                  >
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cancel button */}
        {showCancel && (
          <DrawerFooter className="border-t border-border p-4">
            <DrawerClose asChild>
              <Button
                variant="outline"
                size="lg"
                className="h-12 w-full text-base font-medium"
              >
                {cancelText}
              </Button>
            </DrawerClose>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Helper type for creating option arrays
 */
export type { ActionOption, MobileActionSheetProps };