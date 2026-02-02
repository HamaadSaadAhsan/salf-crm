<?php

describe('Health Check Endpoint', function () {
    it('returns healthy status when all services are available', function () {
        $response = $this->getJson('/health');

        $response
            ->assertOk()
            ->assertJsonStructure([
                'status',
                'timestamp',
                'checks' => [
                    'database' => ['status'],
                    'cache' => ['status'],
                ],
                'app' => [
                    'name',
                    'environment',
                    'debug',
                    'php_version',
                    'laravel_version',
                ],
            ])
            ->assertJsonPath('status', 'healthy')
            ->assertJsonPath('checks.database.status', 'healthy')
            ->assertJsonPath('checks.cache.status', 'healthy');
    });

    it('returns correct application info', function () {
        $response = $this->getJson('/health');

        $response
            ->assertOk()
            ->assertJsonPath('app.name', config('app.name'))
            ->assertJsonPath('app.environment', config('app.env'))
            ->assertJsonPath('app.php_version', PHP_VERSION)
            ->assertJsonPath('app.laravel_version', app()->version());
    });

    it('is accessible without authentication', function () {
        // Ensure no auth is required
        $response = $this->getJson('/health');

        $response->assertOk();
    });
});
