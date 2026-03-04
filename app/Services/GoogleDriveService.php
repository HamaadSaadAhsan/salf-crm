<?php

namespace App\Services;

use App\Models\StorageAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleDriveService
{
    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    private const FILES_URL = 'https://www.googleapis.com/drive/v3/files';

    /**
     * @return array{files: array<int, array<string, mixed>>, nextPageToken: string|null}
     */
    public function listFiles(StorageAccount $account, ?string $folderId = null, ?string $query = null, ?string $pageToken = null): array
    {
        $this->refreshTokenIfNeeded($account);

        $params = [
            'pageSize' => 50,
            'fields' => 'nextPageToken,files(id,name,mimeType,size,iconLink,webViewLink,thumbnailLink,createdTime,modifiedTime,parents)',
            'orderBy' => 'folder,name',
        ];

        if ($pageToken) {
            $params['pageToken'] = $pageToken;
        }

        $qParts = ['trashed = false'];

        if ($folderId) {
            $qParts[] = "'{$folderId}' in parents";
        } elseif (! $query) {
            $qParts[] = "'root' in parents";
        }

        if ($query) {
            $qParts[] = "name contains '".addslashes($query)."'";
        }

        $params['q'] = implode(' and ', $qParts);

        $response = Http::withToken($account->access_token)
            ->get(self::FILES_URL, $params);

        if ($response->failed()) {
            Log::error('Google Drive API list files failed', [
                'status' => $response->status(),
                'body' => $response->body(),
                'account_id' => $account->id,
            ]);
            $response->throw();
        }

        return [
            'files' => $response->json('files', []),
            'nextPageToken' => $response->json('nextPageToken'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getFile(StorageAccount $account, string $fileId): array
    {
        $this->refreshTokenIfNeeded($account);

        $response = Http::withToken($account->access_token)
            ->get(self::FILES_URL.'/'.$fileId, [
                'fields' => 'id,name,mimeType,size,iconLink,webViewLink,thumbnailLink,createdTime,modifiedTime',
            ]);

        if ($response->failed()) {
            Log::error('Google Drive API get file failed', [
                'status' => $response->status(),
                'file_id' => $fileId,
                'account_id' => $account->id,
            ]);
            $response->throw();
        }

        return $response->json();
    }

    /**
     * @return \Illuminate\Http\Client\Response
     */
    public function downloadFile(StorageAccount $account, string $fileId)
    {
        $this->refreshTokenIfNeeded($account);

        return Http::withToken($account->access_token)
            ->withOptions(['stream' => true])
            ->get(self::FILES_URL.'/'.$fileId, [
                'alt' => 'media',
            ]);
    }

    public function refreshTokenIfNeeded(StorageAccount $account): void
    {
        if (! $account->isTokenExpired()) {
            return;
        }

        if (! $account->refresh_token) {
            Log::warning('Google Drive account has expired token but no refresh token', [
                'account_id' => $account->id,
            ]);

            return;
        }

        $response = Http::asForm()->post(self::TOKEN_URL, [
            'client_id' => config('services.google_drive.client_id'),
            'client_secret' => config('services.google_drive.client_secret'),
            'refresh_token' => $account->refresh_token,
            'grant_type' => 'refresh_token',
        ]);

        if ($response->failed()) {
            Log::error('Google Drive token refresh failed', [
                'status' => $response->status(),
                'body' => $response->body(),
                'account_id' => $account->id,
            ]);
            $response->throw();
        }

        $data = $response->json();

        $account->update([
            'access_token' => $data['access_token'],
            'token_expires_at' => now()->addSeconds($data['expires_in'] ?? 3600),
        ]);
    }

    public function revokeToken(StorageAccount $account): void
    {
        try {
            Http::post('https://oauth2.googleapis.com/revoke', [
                'token' => $account->access_token,
            ]);
        } catch (\Exception $e) {
            Log::warning('Failed to revoke Google Drive token', [
                'account_id' => $account->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
