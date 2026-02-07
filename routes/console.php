<?php

use App\Jobs\CalculateDailyMetricsJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule daily metrics calculation at 2:00 AM every day
Schedule::job(new CalculateDailyMetricsJob)
    ->dailyAt('02:00')
    ->name('calculate-daily-metrics')
    ->withoutOverlapping()
    ->onOneServer();

// Warm up leads cache every 10 minutes
Schedule::command('leads:warm-cache')
    ->everyTenMinutes()
    ->name('warm-leads-cache')
    ->withoutOverlapping()
    ->runInBackground();

// Warm up leads statistics cache every 30 minutes
Schedule::command('leads:warm-cache --stats')
    ->everyThirtyMinutes()
    ->name('warm-leads-stats-cache')
    ->withoutOverlapping()
    ->runInBackground();

// Warm up dashboard caches every 10 minutes
Schedule::command('cache:warm-dashboards')
    ->everyTenMinutes()
    ->name('warm-dashboard-caches')
    ->withoutOverlapping()
    ->runInBackground();
