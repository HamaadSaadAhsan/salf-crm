'use client';

import axios from "@/lib/axios";
import { configureEcho } from "@laravel/echo-react";

const useReverbConnection = (session: any, status: any) => {
    const wsPort = process.env.NEXT_PUBLIC_REVERB_PORT ? Number(process.env.NEXT_PUBLIC_REVERB_PORT) : 80;
    const wssPort = process.env.NEXT_PUBLIC_REVERB_PORT ? Number(process.env.NEXT_PUBLIC_REVERB_PORT) : 443;
  
    configureEcho({
        broadcaster: "reverb",
        key: process.env.NEXT_PUBLIC_REVERB_APP_KEY,
        wsHost: process.env.NEXT_PUBLIC_REVERB_HOST,
        wssHost: process.env.NEXT_PUBLIC_REVERB_HOST,
        wsPort,
        wssPort,
        forceTLS: (process.env.NEXT_PUBLIC_REVERB_SCHEME ?? 'https') === 'https',
        enabledTransports: ['ws', 'wss'],
        authorizer: (channel, options) => {
            if (!session?.accessToken) {
                return {
                    authorize: (socketId, callback) => {
                        callback(new Error('No access token available'), null);
                    }
                };
            }

            return {
                authorize: (socketId, callback) => {
                    axios.post('/api/broadcasting/auth', {
                        socket_id: socketId,
                        channel_name: channel.name
                    }, {
                        headers: {
                            Authorization: `Bearer ${session.accessToken}`,
                            'X-XSRF-TOKEN': (typeof document !== 'undefined' && document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1]) || '',
                        }
                    })
                    .then(response => {
                        callback(null, response.data);
                    })
                    .catch(error => {
                        callback(error, null);
                    });
                }
            };
        },
    });
};

export default useReverbConnection;