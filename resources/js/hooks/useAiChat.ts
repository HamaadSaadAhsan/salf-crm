import { useCallback, useRef, useState } from 'react';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: Date;
}

interface UseAiChatOptions {
    onError?: (error: string) => void;
}

export function useAiChat(options: UseAiChatOptions = {}) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const sendMessage = useCallback(
        async (content: string) => {
            if (!content.trim() || isStreaming) return;

            setError(null);

            // Add user message
            const userMessage: ChatMessage = {
                id: `user-${Date.now()}`,
                role: 'user',
                content: content.trim(),
                createdAt: new Date(),
            };

            setMessages((prev) => [...prev, userMessage]);
            setIsStreaming(true);

            // Add placeholder assistant message
            const assistantId = `assistant-${Date.now()}`;
            const assistantMessage: ChatMessage = {
                id: assistantId,
                role: 'assistant',
                content: '',
                createdAt: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);

            try {
                abortControllerRef.current = new AbortController();

                const xsrfToken = decodeURIComponent(
                    document.cookie
                        .split('; ')
                        .find((row) => row.startsWith('XSRF-TOKEN='))
                        ?.split('=')[1] || '',
                );

                const response = await fetch('/api/ai-chat/message', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'text/event-stream',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': xsrfToken,
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        message: content.trim(),
                        conversation_id: conversationId,
                    }),
                    signal: abortControllerRef.current.signal,
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => null);
                    throw new Error(errorData?.message || `Request failed with status ${response.status}`);
                }

                const reader = response.body?.getReader();
                if (!reader) throw new Error('No response body');

                const decoder = new TextDecoder();
                let buffer = '';
                let fullText = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith('data: ')) continue;

                        const data = trimmed.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);

                            // Vercel AI SDK protocol: text delta events
                            if (parsed.type === 'text-delta' && parsed.delta) {
                                fullText += parsed.delta;
                                setMessages((prev) =>
                                    prev.map((msg) => (msg.id === assistantId ? { ...msg, content: fullText } : msg)),
                                );
                            }

                            // Capture conversation ID from finish event
                            if (parsed.type === 'finish' && parsed.conversationId) {
                                setConversationId(parsed.conversationId);
                            }
                        } catch {
                            // Skip unparseable lines
                        }
                    }
                }
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') return;

                const errorMessage = err instanceof Error ? err.message : 'An error occurred';
                setError(errorMessage);
                options.onError?.(errorMessage);

                // Remove empty assistant message on error
                setMessages((prev) => prev.filter((msg) => msg.id !== assistantId || msg.content));
            } finally {
                setIsStreaming(false);
                abortControllerRef.current = null;
            }
        },
        [conversationId, isStreaming, options],
    );

    const stopStreaming = useCallback(() => {
        abortControllerRef.current?.abort();
        setIsStreaming(false);
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setConversationId(null);
        setError(null);
    }, []);

    return {
        messages,
        isStreaming,
        conversationId,
        error,
        sendMessage,
        stopStreaming,
        clearMessages,
    };
}
