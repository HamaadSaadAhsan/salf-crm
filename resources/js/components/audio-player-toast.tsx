import { Button } from '@/components/ui/button';
import { Slider, SliderThumb } from '@/components/ui/slider';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface AudioPlayerToastProps {
    audioUrl: string;
    title?: string;
    className?: string;
}

export function AudioPlayerToast({ audioUrl, title = 'Recording', className }: AudioPlayerToastProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
            setIsLoading(false);
        };

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        const handleError = () => {
            setIsLoading(false);
            console.error('Failed to load audio');
        };

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);

        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
            audio.pause();
            audioRef.current = null;
        };
    }, [audioUrl]);

    const togglePlayPause = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (value: number[]) => {
        if (!audioRef.current) return;
        const newTime = value[0];
        // Guard against non-finite values (NaN, Infinity)
        if (!isFinite(newTime) || newTime < 0) return;
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const handleVolumeChange = (value: number[]) => {
        if (!audioRef.current) return;
        const newVolume = value[0];
        audioRef.current.volume = newVolume;
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
    };

    const toggleMute = () => {
        if (!audioRef.current) return;

        if (isMuted) {
            audioRef.current.volume = volume || 0.5;
            setIsMuted(false);
        } else {
            audioRef.current.volume = 0;
            setIsMuted(true);
        }
    };

    const formatTime = (seconds: number) => {
        if (!isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className={`flex w-full flex-col gap-3 ${className || ''}`}>
            {/* Title */}
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Play className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight">{title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {isLoading ? 'Loading...' : 'Call Recording'}
                    </p>
                </div>
            </div>

            {/* Progress Bar with Time */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                        {formatTime(currentTime)}
                    </span>
                    <Slider
                        value={[isFinite(currentTime) ? currentTime : 0]}
                        max={isFinite(duration) && duration > 0 ? duration : 100}
                        step={0.1}
                        onValueChange={handleSeek}
                        disabled={isLoading || !isFinite(duration) || duration <= 0}
                        className="flex-1"
                    >
                        <SliderThumb />
                    </Slider>
                    <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                        {formatTime(duration)}
                    </span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {/* Play/Pause Button */}
                    <Button
                        size="sm"
                        onClick={togglePlayPause}
                        disabled={isLoading}
                        className="h-9 w-9 shrink-0 rounded-full p-0"
                    >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
                    </Button>

                    {/* Volume Control */}
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={toggleMute}
                            className="h-8 w-8 shrink-0 p-0"
                        >
                            {isMuted || volume === 0 ? (
                                <VolumeX className="h-4 w-4" />
                            ) : (
                                <Volume2 className="h-4 w-4" />
                            )}
                        </Button>
                        <Slider
                            value={[isMuted ? 0 : volume]}
                            max={1}
                            step={0.01}
                            onValueChange={handleVolumeChange}
                            className="w-20"
                        >
                            <SliderThumb />
                        </Slider>
                    </div>
                </div>

                {/* Progress Indicator */}
                <div className="shrink-0 rounded-md bg-muted px-2 py-1">
                    <span className="text-xs font-medium tabular-nums">
                        {isLoading ? '...' : `${Math.round(progress)}%`}
                    </span>
                </div>
            </div>
        </div>
    );
}
