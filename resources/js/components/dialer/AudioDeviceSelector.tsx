import React, { useEffect, useState } from 'react';
import { Mic, Volume2, AlertCircle, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AudioDeviceSelectorProps {
  selectedMicrophone?: string;
  selectedSpeaker?: string;
  onMicrophoneChange: (deviceId: string) => void;
  onSpeakerChange: (deviceId: string) => void;
  className?: string;
}

export function AudioDeviceSelector({
  selectedMicrophone,
  selectedSpeaker,
  onMicrophoneChange,
  onSpeakerChange,
  className,
}: AudioDeviceSelectorProps) {
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [isTestingMic, setIsTestingMic] = useState(false);

  // Request audio permissions and enumerate devices
  const requestPermissionsAndEnumerate = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach((track) => track.stop());

      setPermissionGranted(true);
      setPermissionError(null);

      // Enumerate devices
      await enumerateDevices();
    } catch (error) {
      console.error('Failed to get audio permissions:', error);
      setPermissionGranted(false);
      setPermissionError(
        'Microphone access denied. Please enable microphone permissions in your browser settings.'
      );
    }
  };

  // Enumerate available audio devices
  const enumerateDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const audioInputs = devices.filter(
        (device) => device.kind === 'audioinput'
      );
      const audioOutputs = devices.filter(
        (device) => device.kind === 'audiooutput'
      );

      setMicrophones(audioInputs);
      setSpeakers(audioOutputs);

      // Auto-select default devices if none selected
      if (!selectedMicrophone && audioInputs.length > 0) {
        onMicrophoneChange(audioInputs[0].deviceId);
      }
      if (!selectedSpeaker && audioOutputs.length > 0) {
        onSpeakerChange(audioOutputs[0].deviceId);
      }
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      toast.error('Failed to load audio devices', {
        description: 'Please refresh the page and try again',
      });
    }
  };

  // Test microphone and show level
  const testMicrophone = async () => {
    if (!selectedMicrophone) {
      toast.error('No microphone selected');
      return;
    }

    try {
      setIsTestingMic(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: selectedMicrophone } },
      });

      // Create audio context and analyzer
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;

      source.connect(analyzer);

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);

      // Update mic level every 100ms
      const updateLevel = () => {
        if (!isTestingMic) {
          stream.getTracks().forEach((track) => track.stop());
          audioContext.close();
          return;
        }

        analyzer.getByteFrequencyData(dataArray);
        const average =
          dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const level = Math.round((average / 255) * 100);
        setMicLevel(level);

        requestAnimationFrame(updateLevel);
      };

      updateLevel();

      // Stop test after 5 seconds
      setTimeout(() => {
        setIsTestingMic(false);
        stream.getTracks().forEach((track) => track.stop());
        audioContext.close();
        setMicLevel(0);
      }, 5000);
    } catch (error) {
      console.error('Failed to test microphone:', error);
      setIsTestingMic(false);
      toast.error('Failed to test microphone', {
        description: 'Please check your microphone connection',
      });
    }
  };

  // Listen for device changes
  useEffect(() => {
    const handleDeviceChange = () => {
      enumerateDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener(
        'devicechange',
        handleDeviceChange
      );
    };
  }, []);

  // Request permissions on mount
  useEffect(() => {
    requestPermissionsAndEnumerate();
  }, []);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Permission Error Alert */}
      {permissionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{permissionError}</AlertDescription>
        </Alert>
      )}

      {permissionGranted && (
        <>
          {/* Microphone Selection */}
          <div className="space-y-2">
            <Label htmlFor="microphone" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Microphone
            </Label>
            <div className="flex gap-2">
              <Select
                value={selectedMicrophone}
                onValueChange={onMicrophoneChange}
              >
                <SelectTrigger id="microphone" className="flex-1">
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  {microphones.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      <div className="flex items-center gap-2">
                        {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                        {device.deviceId === 'default' && (
                          <Check className="h-3 w-3 text-primary" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={testMicrophone}
                disabled={isTestingMic || !selectedMicrophone}
                variant="outline"
                size="icon"
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Microphone Level Indicator */}
            {isTestingMic && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Testing microphone...</span>
                  <span>{micLevel}%</span>
                </div>
                <Progress value={micLevel} className="h-2" />
              </div>
            )}
          </div>

          {/* Speaker Selection */}
          <div className="space-y-2">
            <Label htmlFor="speaker" className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Speaker / Headphones
            </Label>
            <Select value={selectedSpeaker} onValueChange={onSpeakerChange}>
              <SelectTrigger id="speaker">
                <SelectValue placeholder="Select speaker" />
              </SelectTrigger>
              <SelectContent>
                {speakers.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    <div className="flex items-center gap-2">
                      {device.label || `Speaker ${device.deviceId.slice(0, 5)}`}
                      {device.deviceId === 'default' && (
                        <Check className="h-3 w-3 text-primary" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Refresh Devices Button */}
          <Button
            onClick={enumerateDevices}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Devices
          </Button>

          {/* Device Info */}
          <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
            <p className="font-medium">Device Information:</p>
            <p className="text-muted-foreground">
              {microphones.length} microphone(s) detected
            </p>
            <p className="text-muted-foreground">
              {speakers.length} speaker(s) detected
            </p>
          </div>
        </>
      )}

      {/* Request Permission Button */}
      {!permissionGranted && !permissionError && (
        <Button
          onClick={requestPermissionsAndEnumerate}
          variant="default"
          className="w-full"
        >
          <Mic className="mr-2 h-4 w-4" />
          Grant Microphone Access
        </Button>
      )}
    </div>
  );
}
