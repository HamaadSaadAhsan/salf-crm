import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown } from 'lucide-react';

interface AttributeChange {
    field: string;
    field_name: string;
    old_value: string;
    new_value: string;
}

function formatValue(raw: string): string {
    if (!raw || raw === 'null' || raw === 'undefined') return 'Not set';
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            if ('amount' in parsed && 'currency' in parsed) {
                const amount = Number(parsed.amount);
                return isNaN(amount) ? raw : `${parsed.currency} ${amount.toLocaleString()}`;
            }
            if ('label' in parsed) return String(parsed.label);
            if ('name' in parsed) return String(parsed.name);
            if ('value' in parsed) return String(parsed.value);
            return JSON.stringify(parsed);
        }
        return String(parsed);
    } catch {
        return raw;
    }
}

interface AttributeChangePopoverProps {
    changes: AttributeChange[];
    subject: string;
}

export function AttributeChangePopover({ changes, subject }: AttributeChangePopoverProps) {
    if (changes.length === 1) {
        return (
            <span className="font-semibold text-sm">
                {subject}
                <span className="text-muted-foreground font-normal ml-1">
                    from <span className="font-medium text-foreground">{formatValue(changes[0].old_value)}</span> to{' '}
                    <span className="font-medium text-foreground">{formatValue(changes[0].new_value)}</span>
                </span>
            </span>
        );
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="inline-flex items-center gap-0.5 font-semibold text-sm text-primary hover:underline cursor-pointer"
                >
                    {changes.length} attributes
                    <ChevronDown className="size-3" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-0">
                <div className="px-3 py-2 border-b">
                    <p className="text-xs font-medium text-muted-foreground">
                        {changes.length} attributes changed
                    </p>
                </div>
                <div className="divide-y">
                    {changes.map((change) => (
                        <div key={change.field} className="px-3 py-2 space-y-0.5">
                            <p className="text-xs font-medium text-muted-foreground">
                                {change.field_name}
                            </p>
                            <div className="flex items-center gap-1.5 text-sm">
                                <span className="text-muted-foreground line-through truncate max-w-[120px]">
                                    {formatValue(change.old_value)}
                                </span>
                                <span className="text-muted-foreground shrink-0">&rarr;</span>
                                <span className="font-medium truncate max-w-[120px]">
                                    {formatValue(change.new_value)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
