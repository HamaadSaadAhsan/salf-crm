import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAiChat } from '@/hooks/useAiChat';
import { AlertCircle, BotMessageSquare, CornerDownLeft, Plus, Sparkles, Square, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatMessage } from './chat-message';
import { ChatSuggestions } from './chat-suggestions';

export function AiChatSheet() {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const { messages, isStreaming, error, sendMessage, stopStreaming, clearMessages } = useAiChat();

    // Fetch suggestions on mount
    useEffect(() => {
        if (!open) return;

        fetch('/api/ai-chat/suggestions', {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'include',
        })
            .then((res) => res.json())
            .then((data) => setSuggestions(data.suggestions || []))
            .catch(() => {});
    }, [open]);

    // Auto-scroll on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Focus input when sheet opens
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    const handleSubmit = useCallback(
        (e?: React.FormEvent) => {
            e?.preventDefault();
            if (!input.trim() || isStreaming) return;
            sendMessage(input);
            setInput('');
        },
        [input, isStreaming, sendMessage],
    );

    const handleSuggestionSelect = useCallback(
        (suggestion: string) => {
            sendMessage(suggestion);
        },
        [sendMessage],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
            }
        },
        [handleSubmit],
    );

    const handleNewChat = useCallback(() => {
        clearMessages();
        inputRef.current?.focus();
    }, [clearMessages]);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" mode="icon" size="md" className="relative">
                    <BotMessageSquare className="size-5" />
                </Button>
            </SheetTrigger>

            <SheetContent side="right" close={false} className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-5 py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Sparkles className="size-4.5" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-semibold leading-none">AI Assistant</SheetTitle>
                            <p className="mt-1 text-xs text-muted-foreground">Powered by your CRM data</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNewChat}
                            className="gap-1.5"
                            disabled={messages.length === 0}
                        >
                            <Plus className="size-3.5" />
                            New
                        </Button>
                        <Button
                            variant="ghost"
                            mode="icon"
                            size="sm"
                            onClick={() => setOpen(false)}
                        >
                            <X className="size-4" />
                        </Button>
                    </div>
                </div>

                {/* Messages Area */}
                <ScrollArea className="flex-1">
                    <div className="px-5 py-6">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center gap-6 pt-8">
                                <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary shadow-sm">
                                    <BotMessageSquare className="size-8" />
                                </div>
                                <div className="space-y-2 text-center">
                                    <h3 className="text-base font-semibold text-foreground">
                                        Welcome to your CRM Assistant
                                    </h3>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        Ask questions about leads, performance metrics,<br />
                                        tasks, calls, or get insights from your data.
                                    </p>
                                </div>
                                {suggestions.length > 0 && (
                                    <div className="w-full space-y-3">
                                        <Separator />
                                        <div className="space-y-2.5">
                                            <p className="text-xs font-medium text-muted-foreground">Try asking:</p>
                                            <ChatSuggestions
                                                suggestions={suggestions}
                                                onSelect={handleSuggestionSelect}
                                                disabled={isStreaming}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {messages.map((message, i) => (
                                    <ChatMessage
                                        key={message.id}
                                        message={message}
                                        isStreaming={isStreaming && i === messages.length - 1 && message.role === 'assistant'}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Error State */}
                {error && (
                    <div className="mx-5 mb-4 flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-sm text-destructive">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        <div className="flex-1 leading-relaxed">{error}</div>
                    </div>
                )}

                {/* Input Footer */}
                <div className="shrink-0 border-t border-border bg-muted/30 px-5 py-4">
                    <form onSubmit={handleSubmit} className="relative flex">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask a question..."
                            rows={1}
                            disabled={isStreaming}
                            className="w-full resize-none rounded-lg border border-input bg-background py-2.5 pl-3.5 pr-11 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60"
                            style={{ maxHeight: '120px' }}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                            }}
                        />
                        <div className="absolute top-1.5 right-1.5 bottom-1.5 flex items-center">
                            {isStreaming ? (
                                <Button
                                    type="button"
                                    mode="icon"
                                    size="sm"
                                    variant="outline"
                                    onClick={stopStreaming}
                                >
                                    <Square className="size-3.5" />
                                </Button>
                            ) : (
                                <Button
                                    type="submit"
                                    mode="icon"
                                    size="sm"
                                    disabled={!input.trim()}
                                >
                                    <CornerDownLeft className="size-3.5" />
                                </Button>
                            )}
                        </div>
                    </form>
                    <p className="mt-2 text-xs text-muted-foreground">
                        <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[0.625rem]">Enter</kbd> to send, <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[0.625rem]">Shift+Enter</kbd> for new line
                    </p>
                </div>
            </SheetContent>
        </Sheet>
    );
}
