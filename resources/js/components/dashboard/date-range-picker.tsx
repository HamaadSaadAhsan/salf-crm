import React, { useState } from 'react';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

const presets = [
  { label: 'Last 7 days', getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: 'Last 30 days', getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: 'Last 90 days', getValue: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
  { label: 'This month', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Last month', getValue: () => {
    const lastMonth = subMonths(new Date(), 1);
    return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
  }},
  { label: 'This year', getValue: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
];

export function DateRangePicker({
  value,
  onChange,
  className,
  align = 'start',
}: DateRangePickerProps) {
  const [date, setDate] = useState<DateRange | undefined>(value);
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (range: DateRange | undefined) => {
    setDate(range);
    onChange?.(range);
  };

  const handlePresetSelect = (presetValue: string) => {
    const preset = presets.find(p => p.label === presetValue);
    if (preset) {
      const range = preset.getValue();
      handleSelect(range);
      setIsOpen(false);
    }
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              'justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y')} -{' '}
                  {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <div className="flex">
            <div className="border-r p-3 space-y-2">
              <div className="text-sm font-medium mb-2">Quick Select</div>
              <Select onValueChange={handlePresetSelect}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select preset" />
                </SelectTrigger>
                <SelectContent className="z-[250]">
                  {presets.map((preset) => (
                    <SelectItem key={preset.label} value={preset.label}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleSelect}
              numberOfMonths={2}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
