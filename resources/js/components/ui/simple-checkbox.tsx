import * as React from 'react';
import { cva, VariantProps } from 'class-variance-authority';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

const simpleCheckboxVariants = cva(
  `
    group inline-flex items-center justify-center shrink-0 rounded-md border border-input bg-background
    ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
    disabled:cursor-not-allowed disabled:opacity-50
    aria-invalid:border-destructive/60 aria-invalid:ring-destructive/10
    dark:aria-invalid:border-destructive dark:aria-invalid:ring-destructive/20
  `,
  {
    variants: {
      size: {
        sm: 'size-4.5 [&_svg]:size-3',
        md: 'size-5 [&_svg]:size-3.5',
        lg: 'size-5.5 [&_svg]:size-4',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

interface SimpleCheckboxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'>,
    VariantProps<typeof simpleCheckboxVariants> {
  checked?: boolean | 'indeterminate';
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * Lightweight checkbox that visually matches the Radix Checkbox
 * but avoids Radix's compose-refs which can cause infinite setState
 * loops in React 19 when many controlled checkboxes re-render together.
 */
function SimpleCheckbox({
  className,
  size,
  checked = false,
  onCheckedChange,
  disabled,
  id,
  ...props
}: SimpleCheckboxProps) {
  const isChecked = checked === true;
  const isIndeterminate = checked === 'indeterminate';
  const state = isIndeterminate ? 'indeterminate' : isChecked ? 'checked' : 'unchecked';

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isIndeterminate ? 'mixed' : isChecked}
      data-state={state}
      data-slot="checkbox"
      id={id}
      disabled={disabled}
      className={cn(
        simpleCheckboxVariants({ size }),
        (isChecked || isIndeterminate) && 'border-primary bg-primary text-primary-foreground',
        className,
      )}
      onClick={() => onCheckedChange?.(!isChecked)}
      {...props}
    >
      {(isChecked || isIndeterminate) && (
        <span className="flex items-center justify-center text-current">
          {isIndeterminate ? <Minus /> : <Check />}
        </span>
      )}
    </button>
  );
}

export { SimpleCheckbox };