<?php

namespace App\Jobs;

use App\Events\SipAccountRegistered;
use App\Events\SipAccountRegistrationFailed;
use App\Models\SipAccount;
use App\Services\AsteriskService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class RegisterSipAccount implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;

    public $timeout = 60;

    public function __construct(
        public SipAccount $sipAccount,
        public bool $forceReregister = false
    ) {}

    public function handle(AsteriskService $asteriskService): void
    {
        try {
            if (! $this->sipAccount->is_enabled) {
                return;
            }

            $result = $asteriskService->registerSipAccount(
                $this->sipAccount,
                $this->forceReregister
            );

            if ($result['success']) {
                $this->sipAccount->update([
                    'status' => 'registered',
                    'last_registered_at' => now(),
                ]);

                SipAccountRegistered::dispatch($this->sipAccount);
            } else {
                throw new \Exception($result['error'] ?? 'Unknown registration error');
            }

        } catch (\Exception $e) {
            $this->sipAccount->update([
                'status' => 'unregistered',
            ]);

            SipAccountRegistrationFailed::dispatch($this->sipAccount, $e->getMessage());

            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        $this->sipAccount->update([
            'status' => 'inactive',
        ]);

        SipAccountRegistrationFailed::dispatch($this->sipAccount, $exception->getMessage());
    }
}
