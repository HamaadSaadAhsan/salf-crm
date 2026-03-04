<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\StorageAccount;
use App\Services\GoogleDriveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

class GoogleDriveController extends Controller
{
    public function __construct(private GoogleDriveService $driveService) {}

    public function redirect(): RedirectResponse
    {
        /** @var \Laravel\Socialite\Two\GoogleProvider $driver */
        $driver = Socialite::driver('google_drive');

        return $driver
            ->scopes([
                'https://www.googleapis.com/auth/drive.readonly',
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile',
            ])
            ->with(['access_type' => 'offline', 'prompt' => 'consent'])
            ->redirect();
    }

    public function callback(): RedirectResponse
    {
        try {
            /** @var \Laravel\Socialite\Two\GoogleProvider $driver */
            $driver = Socialite::driver('google_drive');
            $socialiteUser = $driver->user();

            StorageAccount::updateOrCreate(
                [
                    'user_id' => Auth::id(),
                    'provider' => 'google_drive',
                    'provider_account_email' => $socialiteUser->getEmail(),
                ],
                [
                    'provider_account_name' => $socialiteUser->getName(),
                    'access_token' => $socialiteUser->token,
                    'refresh_token' => $socialiteUser->refreshToken ?? null,
                    'token_expires_at' => $socialiteUser->expiresIn
                        ? now()->addSeconds($socialiteUser->expiresIn)
                        : null,
                    'is_active' => true,
                ]
            );

            return redirect()->route('settings.storage-accounts')
                ->with('success', 'Google Drive connected successfully.');
        } catch (\Exception $e) {
            return redirect()->route('settings.storage-accounts')
                ->with('error', 'Failed to connect Google Drive: '.$e->getMessage());
        }
    }

    public function disconnect(StorageAccount $storageAccount): RedirectResponse
    {
        abort_unless($storageAccount->user_id === Auth::id(), 403);

        $this->driveService->revokeToken($storageAccount);

        $storageAccount->leadGoogleDriveFiles()->delete();
        $storageAccount->delete();

        return redirect()->route('settings.storage-accounts')
            ->with('success', 'Google Drive disconnected.');
    }

    public function files(StorageAccount $storageAccount, Request $request): JsonResponse
    {
        abort_unless($storageAccount->user_id === Auth::id(), 403);

        $result = $this->driveService->listFiles(
            $storageAccount,
            $request->query('folder_id'),
            $request->query('query'),
            $request->query('page_token'),
        );

        return response()->json($result);
    }

    public function download(StorageAccount $storageAccount, string $fileId): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        abort_unless($storageAccount->user_id === Auth::id(), 403);

        $fileMeta = $this->driveService->getFile($storageAccount, $fileId);
        $response = $this->driveService->downloadFile($storageAccount, $fileId);

        return response()->streamDownload(function () use ($response) {
            echo $response->body();
        }, $fileMeta['name'] ?? 'download', [
            'Content-Type' => $fileMeta['mimeType'] ?? 'application/octet-stream',
        ]);
    }
}
