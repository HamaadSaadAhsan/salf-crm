<?php

namespace App\Services;

use App\Models\GmailIntegration;
use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GmailService
{
    private string $clientId;

    private string $clientSecret;

    public function __construct()
    {
        $this->clientId = config('services.gmail.client_id');
        $this->clientSecret = config('services.gmail.client_secret');
    }

    /**
     * Send an email via the Gmail API.
     *
     * @param  array{to: string[], cc: string[], subject: string, body: string, from_name: string, from_email: string}  $payload
     */
    public function sendEmail(GmailIntegration $integration, array $payload): bool
    {
        $accessToken = $this->getValidAccessToken($integration);

        $mime = $this->buildMimeMessage($payload);
        $raw = rtrim(strtr(base64_encode($mime), '+/', '-_'), '=');

        $response = Http::withToken($accessToken)
            ->post('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', [
                'raw' => $raw,
            ]);

        if (! $response->successful()) {
            Log::error('Gmail send failed', ['response' => $response->body()]);

            return false;
        }

        return true;
    }

    /**
     * Refresh the access token if expired, return a valid one.
     */
    public function getValidAccessToken(GmailIntegration $integration): string
    {
        if (! $integration->isTokenExpired()) {
            return $integration->access_token;
        }

        if (! $integration->refresh_token) {
            throw new Exception('Gmail token expired and no refresh token available.');
        }

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'refresh_token' => $integration->refresh_token,
            'grant_type' => 'refresh_token',
        ]);

        if (! $response->successful()) {
            throw new Exception('Failed to refresh Gmail token: '.$response->body());
        }

        $data = $response->json();

        $integration->update([
            'access_token' => $data['access_token'],
            'token_expires_at' => now()->addSeconds($data['expires_in'] ?? 3600),
        ]);

        return $data['access_token'];
    }

    /**
     * Exchange an authorization code for tokens.
     */
    public function exchangeCodeForTokens(string $code, string $redirectUri): array
    {
        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'code' => $code,
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'redirect_uri' => $redirectUri,
            'grant_type' => 'authorization_code',
        ]);

        if (! $response->successful()) {
            throw new Exception('Failed to exchange Gmail code for tokens: '.$response->body());
        }

        return $response->json();
    }

    /**
     * Get the authenticated Google account email.
     */
    public function getAccountEmail(string $accessToken): string
    {
        $response = Http::withToken($accessToken)
            ->get('https://www.googleapis.com/oauth2/v2/userinfo');

        if (! $response->successful()) {
            throw new Exception('Failed to fetch Google user info.');
        }

        return $response->json('email');
    }

    /**
     * List Gmail message IDs received after a given timestamp.
     *
     * @return string[]
     */
    public function listInboxMessageIds(GmailIntegration $integration, \Carbon\Carbon $since): array
    {
        $accessToken = $this->getValidAccessToken($integration);

        $response = Http::withToken($accessToken)
            ->get('https://gmail.googleapis.com/gmail/v1/users/me/messages', [
                'q' => "in:inbox after:{$since->timestamp}",
                'maxResults' => 50,
            ]);

        if (! $response->successful()) {
            Log::error('Gmail list messages failed', ['response' => $response->body()]);

            return [];
        }

        return collect($response->json('messages', []))->pluck('id')->all();
    }

    /**
     * Fetch and parse a single Gmail message into a structured array.
     *
     * @return array{gmail_id: string, subject: string, body: string, from_name: string, from_email: string, sent_at: \Carbon\Carbon}|null
     */
    public function getMessageDetail(GmailIntegration $integration, string $gmailMessageId): ?array
    {
        $accessToken = $this->getValidAccessToken($integration);

        $response = Http::withToken($accessToken)
            ->get("https://gmail.googleapis.com/gmail/v1/users/me/messages/{$gmailMessageId}", [
                'format' => 'full',
            ]);

        if (! $response->successful()) {
            return null;
        }

        $data = $response->json();
        $headers = collect($data['payload']['headers'] ?? []);

        $subject = $headers->firstWhere('name', 'Subject')['value'] ?? '(no subject)';
        $fromRaw = $headers->firstWhere('name', 'From')['value'] ?? '';
        $dateRaw = $headers->firstWhere('name', 'Date')['value'] ?? null;

        [$fromName, $fromEmail] = $this->parseFrom($fromRaw);
        $body = $this->extractBody($data['payload'] ?? []);

        return [
            'gmail_id' => $data['id'],
            'subject' => $subject,
            'body' => $body,
            'from_name' => $fromName,
            'from_email' => $fromEmail,
            'sent_at' => $dateRaw ? \Carbon\Carbon::parse($dateRaw) : now(),
        ];
    }

    private function parseFrom(string $from): array
    {
        if (preg_match('/^(.*?)\s*<([^>]+)>/', $from, $m)) {
            return [trim($m[1], '"\'') ?: $m[2], $m[2]];
        }

        return [$from, $from];
    }

    private function extractBody(array $payload): string
    {
        if (! empty($payload['body']['data'])) {
            return quoted_printable_decode(base64_decode(strtr($payload['body']['data'], '-_', '+/')));
        }

        foreach ($payload['parts'] ?? [] as $part) {
            if ($part['mimeType'] === 'text/plain' && ! empty($part['body']['data'])) {
                return quoted_printable_decode(base64_decode(strtr($part['body']['data'], '-_', '+/')));
            }
        }

        foreach ($payload['parts'] ?? [] as $part) {
            if ($part['mimeType'] === 'text/html' && ! empty($part['body']['data'])) {
                return strip_tags(base64_decode(strtr($part['body']['data'], '-_', '+/')));
            }
        }

        return '';
    }

    /**
     * Build a MIME email message string.
     */
    private function buildMimeMessage(array $payload): string
    {
        $to = implode(', ', $payload['to']);
        $cc = ! empty($payload['cc']) ? implode(', ', $payload['cc']) : '';
        $from = sprintf('%s <%s>', $payload['from_name'], $payload['from_email']);
        $subject = $payload['subject'];
        $body = $payload['body'];

        $headers = "From: {$from}\r\n";
        $headers .= "To: {$to}\r\n";
        if ($cc) {
            $headers .= "Cc: {$cc}\r\n";
        }
        $headers .= "Subject: {$subject}\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $headers .= "Content-Transfer-Encoding: quoted-printable\r\n";

        return $headers."\r\n".$body;
    }
}
