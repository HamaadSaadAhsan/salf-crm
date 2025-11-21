<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class EncryptString extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'encrypt:string {value? : The string to encrypt}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Encrypt a string value';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $value = $this->argument('value') ?? $this->ask('Enter the string to encrypt');

        if (empty($value)) {
            $this->error('No string provided to encrypt.');

            return self::FAILURE;
        }

        $encrypted = encrypt($value);

        $this->info('Encrypted value:');
        $this->line($encrypted);

        return self::SUCCESS;
    }
}
