import { Badge } from '@/components/ui/badge';
import { Lightbulb } from 'lucide-react';

interface ChatSuggestionsProps {
    suggestions: string[];
    onSelect: (suggestion: string) => void;
    disabled?: boolean;
}

export function ChatSuggestions({ suggestions, onSelect, disabled }: ChatSuggestionsProps) {
    if (suggestions.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
                <button
                    key={suggestion}
                    type="button"
                    onClick={() => onSelect(suggestion)}
                    disabled={disabled}
                    className="group inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground shadow-sm transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <Lightbulb className="size-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
                    <span>{suggestion}</span>
                </button>
            ))}
        </div>
    );
}
