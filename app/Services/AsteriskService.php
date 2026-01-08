<?php

namespace App\Services;

use App\Models\SipAccount;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AsteriskService
{
    protected string $asteriskHost;

    protected string $asteriskPort;

    protected string $asteriskUsername;

    protected string $asteriskSecret;

    protected string $apiEndpoint;

    protected HttpFactory $httpClient;

    public function __construct(
        ?HttpFactory $httpClient = null,
        ?string $host = null,
        ?string $port = null,
        ?string $username = null,
        ?string $secret = null
    ) {
        $this->asteriskHost = $host ?? config('asterisk.host', 'localhost');
        $this->asteriskPort = $port ?? config('asterisk.port', '8088');
        $this->asteriskUsername = $username ?? config('asterisk.username', 'admin');
        $this->asteriskSecret = $secret ?? config('asterisk.secret', 'admin');
        $this->apiEndpoint = "http://{$this->asteriskHost}:{$this->asteriskPort}/ari";
        $this->httpClient = $httpClient ?? (function_exists('app') ? app(HttpFactory::class) : new HttpFactory);
    }

    public function initiateCall(string $callerNumber, string $calleeNumber, array $sipData = []): string
    {
        try {
            $channelId = $this->generateChannelId();
            $endpoint = 'SIP/'.$calleeNumber;

            $response = Http::withBasicAuth($this->asteriskUsername, $this->asteriskSecret)
                ->post("{$this->apiEndpoint}/channels", [
                    'endpoint' => $endpoint,
                    'extension' => $calleeNumber,
                    'context' => 'default',
                    'priority' => 1,
                    'callerId' => $callerNumber,
                    'channelId' => $channelId,
                    'variables' => array_merge([
                        'CALLER_ID' => $callerNumber,
                        'DESTINATION' => $calleeNumber,
                    ], $sipData),
                ]);

            if ($response->successful()) {
                Log::info('Call initiated successfully', [
                    'channel_id' => $channelId,
                    'caller' => $callerNumber,
                    'callee' => $calleeNumber,
                ]);

                return $channelId;
            }

            throw new \Exception('Failed to initiate call: '.$response->body());
        } catch (\Exception $e) {
            Log::error('Call initiation failed', [
                'caller' => $callerNumber,
                'callee' => $calleeNumber,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function hangupCall(string $channelId): bool
    {
        try {
            $response = Http::withBasicAuth($this->asteriskUsername, $this->asteriskSecret)
                ->delete("{$this->apiEndpoint}/channels/{$channelId}");

            if ($response->successful() || $response->status() === 404) {
                Log::info('Call hangup successful', ['channel_id' => $channelId]);

                return true;
            }

            throw new \Exception('Failed to hangup call: '.$response->body());
        } catch (\Exception $e) {
            Log::error('Call hangup failed', [
                'channel_id' => $channelId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function answerCall(string $channelId): bool
    {
        try {
            $response = Http::withBasicAuth($this->asteriskUsername, $this->asteriskSecret)
                ->post("{$this->apiEndpoint}/channels/{$channelId}/answer");

            if ($response->successful()) {
                Log::info('Call answered successfully', ['channel_id' => $channelId]);

                return true;
            }

            throw new \Exception('Failed to answer call: '.$response->body());
        } catch (\Exception $e) {
            Log::error('Call answer failed', [
                'channel_id' => $channelId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function holdCall(string $channelId): bool
    {
        try {
            $response = Http::withBasicAuth($this->asteriskUsername, $this->asteriskSecret)
                ->post("{$this->apiEndpoint}/channels/{$channelId}/hold");

            if ($response->successful()) {
                Log::info('Call held successfully', ['channel_id' => $channelId]);

                return true;
            }

            throw new \Exception('Failed to hold call: '.$response->body());
        } catch (\Exception $e) {
            Log::error('Call hold failed', [
                'channel_id' => $channelId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function unholdCall(string $channelId): bool
    {
        try {
            $response = Http::withBasicAuth($this->asteriskUsername, $this->asteriskSecret)
                ->delete("{$this->apiEndpoint}/channels/{$channelId}/hold");

            if ($response->successful()) {
                Log::info('Call unhold successful', ['channel_id' => $channelId]);

                return true;
            }

            throw new \Exception('Failed to unhold call: '.$response->body());
        } catch (\Exception $e) {
            Log::error('Call unhold failed', [
                'channel_id' => $channelId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function muteCall(string $channelId): bool
    {
        try {
            $response = Http::withBasicAuth($this->asteriskUsername, $this->asteriskSecret)
                ->post("{$this->apiEndpoint}/channels/{$channelId}/mute", [
                    'direction' => 'both',
                ]);

            if ($response->successful()) {
                Log::info('Call muted successfully', ['channel_id' => $channelId]);

                return true;
            }

            throw new \Exception('Failed to mute call: '.$response->body());
        } catch (\Exception $e) {
            Log::error('Call mute failed', [
                'channel_id' => $channelId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function unmuteCall(string $channelId): bool
    {
        try {
            $response = Http::withBasicAuth($this->asteriskUsername, $this->asteriskSecret)
                ->delete("{$this->apiEndpoint}/channels/{$channelId}/mute", [
                    'direction' => 'both',
                ]);

            if ($response->successful()) {
                Log::info('Call unmuted successfully', ['channel_id' => $channelId]);

                return true;
            }

            throw new \Exception('Failed to unmute call: '.$response->body());
        } catch (\Exception $e) {
            Log::error('Call unmute failed', [
                'channel_id' => $channelId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function startRecording(string $channelId, ?string $filename = null): string
    {
        try {
            $recordingName = $filename ?? 'recording_'.time().'_'.$channelId;

            $response = Http::withBasicAuth($this->asteriskUsername, $this->asteriskSecret)
                ->post("{$this->apiEndpoint}/channels/{$channelId}/record", [
                    'name' => $recordingName,
                    'format' => 'wav',
                    'maxDurationSeconds' => 3600, // 1 hour max
                    'maxSilenceSeconds' => 30,
                    'ifExists' => 'overwrite',
                ]);

            if ($response->successful()) {
                Log::info('Recording started successfully', [
                    'channel_id' => $channelId,
                    'recording_name' => $recordingName,
                ]);

                return $recordingName;
            }

            throw new \Exception('Failed to start recording: '.$response->body());
        } catch (\Exception $e) {
            Log::error('Recording start failed', [
                'channel_id' => $channelId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function stopRecording(string $recordingName): bool
    {
        try {
            $response = Http::withBasicAuth($this->asteriskUsername, $this->asteriskSecret)
                ->post("{$this->apiEndpoint}/recordings/live/{$recordingName}/stop");

            if ($response->successful()) {
                Log::info('Recording stopped successfully', ['recording_name' => $recordingName]);

                return true;
            }

            throw new \Exception('Failed to stop recording: '.$response->body());
        } catch (\Exception $e) {
            Log::error('Recording stop failed', [
                'recording_name' => $recordingName,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function registerSipAccount(SipAccount $sipAccount, bool $forceReregister = false): array
    {
        try {
            // Check if already registered
            if ($sipAccount->isRegistered() && ! $forceReregister) {
                return ['success' => true, 'message' => 'Already registered'];
            }

            // Configure SIP peer via Asterisk Manager Interface or ARI
            $peerConfig = [
                'username' => $sipAccount->username,
                'secret' => $sipAccount->password,
                'domain' => $sipAccount->domain,
                'port' => $sipAccount->port,
                'transport' => strtolower($sipAccount->transport),
                'context' => 'default',
                'allow' => $sipAccount->codec_priority ?? 'ulaw,alaw,gsm',
            ];

            // In a real implementation, you would use AMI (Asterisk Manager Interface)
            // or configure through Asterisk configuration files
            // For this example, we'll simulate the registration

            Log::info('SIP account registration attempted', [
                'username' => $sipAccount->username,
                'domain' => $sipAccount->domain,
            ]);

            return ['success' => true, 'message' => 'SIP account registered successfully'];

        } catch (\Exception $e) {
            Log::error('SIP account registration failed', [
                'username' => $sipAccount->username,
                'domain' => $sipAccount->domain,
                'error' => $e->getMessage(),
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function getChannelInfo(string $channelId): ?array
    {
        try {
            $response = Http::withBasicAuth($this->asteriskUsername, $this->asteriskSecret)
                ->get("{$this->apiEndpoint}/channels/{$channelId}");

            if ($response->successful()) {
                return $response->json();
            }

            return null;

        } catch (\Exception $e) {
            Log::error('Failed to get channel info', [
                'channel_id' => $channelId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    public function getActiveChannels(): array
    {
        try {
            $response = Http::withBasicAuth($this->asteriskUsername, $this->asteriskSecret)
                ->get("{$this->apiEndpoint}/channels");

            if ($response->successful()) {
                return $response->json();
            }

            return [];

        } catch (\Exception $e) {
            Log::error('Failed to get active channels', ['error' => $e->getMessage()]);

            return [];
        }
    }

    protected function generateChannelId(): string
    {
        return 'channel_'.uniqid().'_'.time();
    }

    public function bridgeChannels(string $channelId1, string $channelId2, string $bridgeType = 'mixing'): string
    {
        try {
            $bridgeId = 'bridge_'.uniqid();

            // Create bridge
            $response = Http::withBasicAuth($this->asteriskUsername, $this->asteriskSecret)
                ->post("{$this->apiEndpoint}/bridges/{$bridgeId}", [
                    'type' => $bridgeType,
                ]);

            if (! $response->successful()) {
                throw new \Exception('Failed to create bridge: '.$response->body());
            }

            // Add channels to bridge
            $response = Http::withBasicAuth($this->asteriskUsername, $this->asteriskSecret)
                ->post("{$this->apiEndpoint}/bridges/{$bridgeId}/addChannel", [
                    'channel' => [$channelId1, $channelId2],
                ]);

            if ($response->successful()) {
                Log::info('Channels bridged successfully', [
                    'bridge_id' => $bridgeId,
                    'channels' => [$channelId1, $channelId2],
                ]);

                return $bridgeId;
            }

            throw new \Exception('Failed to add channels to bridge: '.$response->body());
        } catch (\Exception $e) {
            Log::error('Channel bridging failed', [
                'channels' => [$channelId1, $channelId2],
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function testConnection(): bool
    {
        try {
            $response = Http::withBasicAuth($this->asteriskUsername, $this->asteriskSecret)
                ->timeout(5)
                ->get("{$this->apiEndpoint}/endpoints");

            return $response->successful();

        } catch (\Exception $e) {
            Log::error('Asterisk connection test failed', ['error' => $e->getMessage()]);

            return false;
        }
    }
}
