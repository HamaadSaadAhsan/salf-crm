import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/hooks/useAiChat';
import { BotMessageSquare, User } from 'lucide-react';

interface ChatMessageProps {
    message: ChatMessageType;
    isStreaming?: boolean;
}

function formatMarkdown(text: string): string {
    // Process code blocks first (multiline)
    let formatted = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre class="my-3 overflow-x-auto rounded-lg border border-border bg-muted p-3 text-xs"><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
    });

    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">$1</code>');

    // Headings
    formatted = formatted.replace(/^### (.+)$/gm, '<h4 class="mt-4 mb-2 text-sm font-semibold text-foreground">$1</h4>');
    formatted = formatted.replace(/^## (.+)$/gm, '<h3 class="mt-4 mb-2 text-base font-semibold text-foreground">$1</h3>');
    formatted = formatted.replace(/^# (.+)$/gm, '<h2 class="mt-4 mb-2 text-lg font-semibold text-foreground">$1</h2>');

    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');

    // Lists (wrap in ul/ol)
    formatted = formatted.replace(/(?:^- .+$\n?)+/gm, (match) => {
        const items = match.split('\n').filter(Boolean).map(line =>
            line.replace(/^- (.+)$/, '<li class="text-sm leading-relaxed">$1</li>')
        ).join('');
        return `<ul class="my-2 ml-4 list-disc space-y-1">${items}</ul>`;
    });

    formatted = formatted.replace(/(?:^\d+\. .+$\n?)+/gm, (match) => {
        const items = match.split('\n').filter(Boolean).map(line =>
            line.replace(/^\d+\. (.+)$/, '<li class="text-sm leading-relaxed">$1</li>')
        ).join('');
        return `<ol class="my-2 ml-4 list-decimal space-y-1">${items}</ol>`;
    });

    // Line breaks
    formatted = formatted.replace(/\n\n/g, '</p><p class="mt-2">');
    formatted = formatted.replace(/\n/g, '<br />');

    return `<p>${formatted}</p>`;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
    const isUser = message.role === 'user';

    return (
        <div className={cn('flex w-full gap-3', isUser ? 'justify-end' : 'justify-start')}>
            {!isUser && (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BotMessageSquare className="size-4" />
                </div>
            )}
            <div
                className={cn(
                    'flex max-w-[80%] flex-col gap-2 rounded-xl px-4 py-3 text-sm leading-relaxed shadow-sm',
                    isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-card text-card-foreground',
                )}
            >
                {isUser ? (
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                ) : (
                    <div className="prose prose-sm max-w-none dark:prose-invert [&_code]:text-xs [&_h2]:mt-4 [&_h2]:text-base [&_h3]:mt-3 [&_h3]:text-sm [&_h4]:mt-2 [&_h4]:text-sm [&_p]:leading-relaxed [&_pre]:my-3 [&_ul]:my-2 [&_ol]:my-2">
                        {message.content ? (
                            <div dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }} />
                        ) : isStreaming ? (
                            <div className="flex items-center gap-1.5 py-1">
                                <span className="size-2 animate-pulse rounded-full bg-muted-foreground/40" />
                                <span className="size-2 animate-pulse rounded-full bg-muted-foreground/40" style={{ animationDelay: '0.2s' }} />
                                <span className="size-2 animate-pulse rounded-full bg-muted-foreground/40" style={{ animationDelay: '0.4s' }} />
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
            {isUser && (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <User className="size-4" />
                </div>
            )}
        </div>
    );
}
