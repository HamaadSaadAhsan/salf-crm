import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { ResponsiveSelect, useResponsiveSelectStyles } from '@/components/responsive-select';

type TagObject = {
  value?: string;
  label?: string;
  color?: string;
};

type InlineEditProps = {
  value: string | null | undefined | TagObject;
  placeholder?: string;
  className?: string;
  type?: 'text' | 'textarea' | 'select';
  readonly?: boolean;
  // For select type
  options?: { value: string; label: string }[];
  /**
   * Title shown in the drawer header on mobile (for select type)
   */
  selectTitle?: string;
  onSave: (nextValue: string) => Promise<void> | void;
  format?: (v: string) => string;
};

export function InlineEdit({
  value,
  placeholder = '—',
  className,
  type = 'text',
  readonly = false,
  options = [],
  selectTitle,
  onSave,
  format,
}: InlineEditProps) {
  // Get responsive styles for mobile/desktop
  const { isMobile, itemClassName, listClassName, inputClassName, inputWrapperClassName } = useResponsiveSelectStyles();
  // Helper to normalize value to string
  const normalizeValue = (val: string | null | undefined | TagObject): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      // Handle objects like {color, label, value}
      return val.value || val.label || '';
    }
    return String(val);
  };

  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState<string>(normalizeValue(value));
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setLocal(normalizeValue(value));
  }, [value]);

  useEffect(() => {
    if (editing) {
      if (type === 'select') {
        // For select type, open the combobox
        setOpen(true);
      } else {
        // For text/textarea, focus the input
        const t = setTimeout(() => {
          inputRef.current?.focus();
          if (inputRef.current instanceof HTMLInputElement) {
            inputRef.current.select();
          }
        });
        return () => clearTimeout(t);
      }
    }
  }, [editing, type]);

  const commit = async (next: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    let display = (local.trim() ? (format ? format(local) : local) : placeholder);
    if (type === 'select' && local && options?.length) {
      const found = options.find(o => o.value === local);
      if (found) {
        // prefer label
        display = found.label;
      }
    }

    if (readonly) {
      return (
        <span className={cn('inline-block rounded px-1 py-0.5', className)}>
          {display}
        </span>
      );
    }

    return (
      <span
        className={cn('inline-block cursor-pointer hover:bg-accent/40 rounded px-1 py-0.5', className)}
        onClick={() => setEditing(true)}
        aria-busy={saving}
      >
        {display}
      </span>
    );
  }

  if (type === 'textarea') {
    return (
      <Textarea
        ref={(el) => {
          inputRef.current = el;
        }}
        value={local}
        placeholder={placeholder}
        rows={3}
        className={cn('min-h-[72px]', className)}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => void commit(local)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setEditing(false);
            setLocal(normalizeValue(value));
          } else if ((e.metaKey && e.key === 'Enter') || (e.ctrlKey && e.key === 'Enter')) {
            void commit(local);
          }
        }}
      />
    );
  }

  if (type === 'select') {
    const selectedOption = options.find(opt => opt.value === local);

    // Trigger button used for both mobile and desktop
    const triggerButton = (
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn(
          'justify-between truncate px-2 py-0 text-sm',
          // Mobile: larger touch target
          isMobile ? 'h-10 max-w-none' : 'h-6 w-auto max-w-[180px] sm:max-w-none',
          className,
        )}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
      </Button>
    );

    return (
      <ResponsiveSelect
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          // If closing the select without selection, exit editing mode
          if (!isOpen) {
            setEditing(false);
          }
        }}
        trigger={triggerButton}
        title={selectTitle}
        contentClassName={isMobile ? 'w-full' : 'w-[min(200px,calc(100vw-2rem))]'}
        modal={true}
      >
        <Command shouldFilter={true} className={inputWrapperClassName}>
          <CommandInput
            placeholder="Search..."
            className={inputClassName}
          />
          <CommandList className={cn(listClassName, 'touch-pan-y overscroll-contain')}>
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {options.map(opt => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    setLocal(opt.value);
                    setOpen(false);
                    setEditing(false);
                    void commit(opt.value);
                  }}
                  className={itemClassName}
                >
                  {opt.label}
                  <Check
                    className={cn(
                      'ml-auto h-4 w-4',
                      local === opt.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </ResponsiveSelect>
    );
  }

  return (
    <Input
      ref={(el) => {
        inputRef.current = el;
      }}
      value={local}
      placeholder={placeholder}
      className={cn('h-7 w-auto text-sm', className)}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => void commit(local)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          void commit(local);
        } else if (e.key === 'Escape') {
          setEditing(false);
          setLocal(normalizeValue(value));
        }
      }}
    />
  );
}
