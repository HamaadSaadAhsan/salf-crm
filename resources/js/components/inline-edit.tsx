import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';

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
  onSave,
  format,
}: InlineEditProps) {
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

    return (
      <Popover
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          // If closing the popover without selection, exit editing mode
          if (!isOpen) {
            setEditing(false);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn('h-6 w-auto justify-between px-2 py-0 text-sm', className)}
          >
            {selectedOption ? selectedOption.label : placeholder}
            <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search..." className="h-9" />
            <CommandList>
              <CommandEmpty>No option found.</CommandEmpty>
              <CommandGroup>
                {options.map(opt => (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={(currentValue) => {
                      setLocal(currentValue);
                      setOpen(false);
                      setEditing(false);
                      void commit(currentValue);
                    }}
                  >
                    {opt.label}
                    <Check
                      className={cn(
                        'ml-auto h-4 w-4',
                        local === opt.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
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
