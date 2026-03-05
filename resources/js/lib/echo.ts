import { configureEcho } from '@laravel/echo-react';

// Configure Echo for Reverb (which uses the Pusher protocol)
configureEcho({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    // Prevent rapid reconnect storms when Reverb is unreachable
    activityTimeout: 30000,
    pongTimeout: 10000,
    unavailableTimeout: 15000,
    authorizer: (channel: any) => {
        return {
            authorize: (socketId: string, callback: Function) => {
                // Use Laravel's broadcasting authorization endpoint
                fetch('/broadcasting/auth', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        socket_id: socketId,
                        channel_name: channel.name,
                    }),
                })
                    .then((response) => response.json())
                    .then((data) => callback(null, data))
                    .catch((error) => callback(error));
            },
        };
    },
});

export default configureEcho;
