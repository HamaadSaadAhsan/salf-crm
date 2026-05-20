<?php

use App\Models\Forms\Application;
use App\Models\Forms\Program;
use App\Models\User;
use Illuminate\Support\Facades\DB;

it('generates APP-{year}-00001 on first call', function () {
    $code = Application::generateApplicationCode();
    $year = now()->year;

    expect($code)->toBe("APP-{$year}-00001");
});

it('increments sequence on subsequent calls', function () {
    $year = now()->year;
    $user = User::factory()->create(['email_verified_at' => now()]);
    $program = Program::factory()->create();

    Application::factory()->create([
        'program_id' => $program->id,
        'application_code' => "APP-{$year}-00001",
        'created_by_user_id' => $user->id,
    ]);

    $code = Application::generateApplicationCode();

    expect($code)->toBe("APP-{$year}-00002");
});

it('pads sequence to 5 digits', function () {
    $code = Application::generateApplicationCode();

    expect($code)->toMatch('/^APP-\d{4}-\d{5}$/');
});

it('is safe to call inside a DB transaction', function () {
    $code = DB::transaction(function () {
        return Application::generateApplicationCode();
    });

    expect($code)->toStartWith('APP-');
});
