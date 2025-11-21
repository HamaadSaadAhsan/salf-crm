import React, { useEffect, useCallback } from 'react';
import { Phone, Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DialPadProps {
  dialedNumber: string;
  onDigitPress: (digit: string) => void;
  onBackspace: () => void;
  onCall: () => void;
  disabled?: boolean;
  className?: string;
}

const DIAL_PAD_BUTTONS = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '' },
];

// DTMF tone frequencies (for future audio implementation)
const DTMF_FREQUENCIES: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
};

export function DialPad({
  dialedNumber,
  onDigitPress,
  onBackspace,
  onCall,
  disabled = false,
  className,
}: DialPadProps) {
  // Keyboard support
  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) {
        return;
      }

      const key = event.key;

      // Handle digits and special characters
      if (/^[0-9*#]$/.test(key)) {
        onDigitPress(key);
      } else if (key === 'Backspace') {
        event.preventDefault();
        onBackspace();
      } else if (key === 'Enter' && dialedNumber.length > 0) {
        event.preventDefault();
        onCall();
      }
    },
    [disabled, dialedNumber, onDigitPress, onBackspace, onCall]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Play DTMF tone (placeholder for future implementation)
  const playTone = (digit: string) => {
    // TODO: Implement actual DTMF tone playback using Web Audio API
    // const frequencies = DTMF_FREQUENCIES[digit];
    // if (frequencies) {
    //   // Play dual-tone using oscillators
    // }
  };

  const handleDigitClick = (digit: string) => {
    if (!disabled) {
      playTone(digit);
      onDigitPress(digit);
    }
  };

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Number Display */}
      <div className="relative mb-2">
        <div
          className={cn(
            'min-h-16 px-4 py-3',
            'flex items-center justify-center',
            'bg-muted/50 dark:bg-muted/30 rounded-lg',
            'border border-border/50'
          )}
        >
          <span
            className={cn(
              'text-2xl font-medium tracking-wider',
              dialedNumber.length === 0 && 'text-muted-foreground'
            )}
          >
            {dialedNumber || 'Enter number'}
          </span>
        </div>

        {/* Backspace Button */}
        {dialedNumber.length > 0 && (
          <Button
            onClick={onBackspace}
            disabled={disabled}
            variant="ghost"
            size="icon"
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2',
              'h-10 w-10 rounded-full',
              'hover:bg-muted'
            )}
            aria-label="Delete last digit"
          >
            <Delete className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Dial Pad Grid */}
      <div className="grid grid-cols-3 gap-3">
        {DIAL_PAD_BUTTONS.map(({ digit, letters }) => (
          <Button
            key={digit}
            onClick={() => handleDigitClick(digit)}
            disabled={disabled}
            variant="outline"
            className={cn(
              'h-16 w-full relative',
              'flex flex-col items-center justify-center',
              'bg-background hover:bg-muted/50',
              'border-2 border-border/50 hover:border-border',
              'transition-all duration-150',
              'active:scale-95',
              'focus-visible:ring-2 focus-visible:ring-primary',
              'group',
              letters && 'gap-1' // Add gap between number and letters
            )}
          >
            <span className="text-2xl font-semibold">{digit}</span>
            {letters && (
              <span className="text-[10px] text-muted-foreground tracking-wider">
                {letters}
              </span>
            )}
            {/* Ripple effect */}
            <span className="absolute inset-0 rounded-md bg-primary/10 opacity-0 group-active:opacity-100 transition-opacity" />
          </Button>
        ))}
      </div>

      {/* Call Button */}
      <Button
        onClick={onCall}
        disabled={disabled || dialedNumber.length === 0}
        size="lg"
        className={cn(
          'mt-2 h-14 w-full',
          'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700',
          'text-white font-semibold text-lg',
          'shadow-lg hover:shadow-xl',
          'transition-all duration-200',
          'active:scale-95',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <Phone className="mr-2 h-5 w-5" />
        Call
      </Button>
    </div>
  );
}
