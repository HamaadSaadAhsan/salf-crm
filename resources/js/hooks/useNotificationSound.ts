import { useCallback, useRef, useState } from 'react';
import { toAbsoluteUrl } from '@/lib/helpers';

export type NotificationSoundType = 'urgent' | 'high' | 'normal' | 'overdue';

interface UseNotificationSoundOptions {
    enabled?: boolean;
    volume?: number;
}

interface UseNotificationSoundReturn {
    play: (soundType: NotificationSoundType) => Promise<void>;
    stop: () => void;
    isPlaying: boolean;
    hasPermission: boolean;
    requestPermission: () => Promise<boolean>;
}

const SOUND_PATHS: Record<NotificationSoundType, string> = {
    urgent: toAbsoluteUrl('/sounds/urgent.mp3'),
    high: toAbsoluteUrl('/sounds/high.mp3'),
    normal: toAbsoluteUrl('/sounds/normal.mp3'),
    overdue: toAbsoluteUrl('/sounds/overdue.mp3'),
};

export function useNotificationSound(
    options: UseNotificationSoundOptions = {}
): UseNotificationSoundReturn {
    const { enabled = true, volume = 0.7 } = options;
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasPermission, setHasPermission] = useState(
        typeof Notification !== 'undefined' && Notification.permission === 'granted'
    );
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioCache = useRef<Map<NotificationSoundType, HTMLAudioElement>>(new Map());

    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (typeof Notification === 'undefined') {
            return false;
        }

        if (Notification.permission === 'granted') {
            setHasPermission(true);
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            const granted = permission === 'granted';
            setHasPermission(granted);
            return granted;
        }

        return false;
    }, []);

    const getOrCreateAudio = useCallback(
        (soundType: NotificationSoundType): HTMLAudioElement => {
            if (audioCache.current.has(soundType)) {
                return audioCache.current.get(soundType)!;
            }

            const audio = new Audio(SOUND_PATHS[soundType]);
            audio.volume = volume;
            audioCache.current.set(soundType, audio);
            return audio;
        },
        [volume]
    );

    const play = useCallback(
        async (soundType: NotificationSoundType): Promise<void> => {
            if (!enabled) {
                console.log('Sound disabled');
                return;
            }

            try {
                // Stop any currently playing sound
                if (audioRef.current && !audioRef.current.paused) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                }

                const audio = getOrCreateAudio(soundType);
                audioRef.current = audio;

                // Reset to start if already played
                audio.currentTime = 0;

                setIsPlaying(true);

                audio.onended = () => {
                    setIsPlaying(false);
                    audioRef.current = null;
                };

                audio.onerror = (e) => {
                    setIsPlaying(false);
                    audioRef.current = null;
                    console.error(`Failed to play notification sound: ${soundType}`, e);
                };

                await audio.play();
                console.log('Sound playing successfully');
            } catch (error) {
                setIsPlaying(false);
                audioRef.current = null;

                // Check if it's an autoplay restriction
                if (error instanceof DOMException && error.name === 'NotAllowedError') {
                    console.warn('Autoplay blocked by browser. User interaction required first.');
                }
            }
        },
        [enabled, getOrCreateAudio]
    );

    const stop = useCallback(() => {
        if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
            audioRef.current = null;
        }
    }, []);

    return {
        play,
        stop,
        isPlaying,
        hasPermission,
        requestPermission,
    };
}
