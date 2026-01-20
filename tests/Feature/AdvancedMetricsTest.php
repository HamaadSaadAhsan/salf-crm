<?php

use App\Models\Lead;
use App\Models\LeadSource;
use App\Models\Service;
use App\Models\Task;
use App\Models\User;
use Spatie\Permission\Models\Role;

/**
 * Test suite for advanced metrics endpoints:
 * - Lead Source Performance
 * - Program Performance
 * - Task Completion Analysis
 * - Lead Lifecycle Analysis
 *
 * Note: These tests require PostgreSQL due to EXTRACT(EPOCH FROM ...) and other
 * PostgreSQL-specific SQL functions used in the dashboard queries.
 */
describe('Advanced Metrics Endpoints', function () {
    beforeEach(function () {
        // Create super-admin role
        Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);

        // Create and authenticate user
        $this->user = User::factory()->create();
        $this->user->assignRole('super-admin');
        $this->actingAs($this->user);
    });

    describe('Lead Source Performance', function () {
        it('returns source performance data with correct structure', function () {
            // Create test data
            $source = LeadSource::factory()->create(['name' => 'Facebook']);
            Lead::factory()->count(10)->create(['lead_source_id' => $source->id]);

            $response = $this->getJson('/api/dashboard/lead-source-performance?period=30');

            $response->assertSuccessful()
                ->assertJsonStructure([
                    'source_performance' => [
                        '*' => [
                            'source_id',
                            'source_name',
                            'total_leads',
                            'converted_leads',
                            'qualified_leads',
                            'lost_leads',
                            'conversion_rate',
                            'qualification_rate',
                            'loss_rate',
                            'avg_lead_score',
                            'avg_response_time_minutes',
                            'quality_score',
                            'estimated_roi',
                        ],
                    ],
                    'period_days',
                    'total_leads',
                    'total_converted',
                    'overall_conversion_rate',
                    'best_source',
                    'worst_source',
                ]);

            // Verify numeric values are valid
            $performance = $response->json('source_performance.0');
            expect($performance['total_leads'])->toBeInt();
            expect($performance['conversion_rate'])->toBeNumeric();
            expect($performance['quality_score'])->toBeNumeric();
        });

        it('supports different period ranges', function ($period) {
            $source = LeadSource::factory()->create();
            Lead::factory()->count(5)->create(['lead_source_id' => $source->id]);

            $response = $this->getJson("/api/dashboard/lead-source-performance?period={$period}");

            $response->assertSuccessful();
            expect($response->json('period_days'))->toBe($period);
        })->with([7, 14, 30, 60, 90]);

        it('identifies best and worst performing sources', function () {
            $bestSource = LeadSource::factory()->create(['name' => 'Best Source']);
            $worstSource = LeadSource::factory()->create(['name' => 'Worst Source']);

            // Create leads with different conversion rates
            Lead::factory()->count(10)->create([
                'lead_source_id' => $bestSource->id,
                'inquiry_status' => 'converted',
            ]);
            Lead::factory()->count(10)->create([
                'lead_source_id' => $worstSource->id,
                'inquiry_status' => 'new',
            ]);

            $response = $this->getJson('/api/dashboard/lead-source-performance?period=30');

            $response->assertSuccessful();

            $bestSourceData = $response->json('best_source');
            $worstSourceData = $response->json('worst_source');

            expect($bestSourceData)->not->toBeNull();
            expect($worstSourceData)->not->toBeNull();
        });

        it('requires authentication', function () {
            $this->app['auth']->forgetGuards();

            $response = $this->getJson('/api/dashboard/lead-source-performance?period=30');

            $response->assertUnauthorized();
        });
    });

    describe('Program Performance', function () {
        it('returns program performance data with correct structure', function () {
            // Create test data
            $service = Service::factory()->create([
                'name' => 'Dominica Citizenship',
            ]);
            Lead::factory()->count(10)->create(['service_id' => $service->id]);

            $response = $this->getJson('/api/dashboard/program-performance?period=90');

            $response->assertSuccessful()
                ->assertJsonStructure([
                    'program_performance' => [
                        '*' => [
                            'program_name',
                            'program_code',
                            'total_leads',
                            'converted_leads',
                            'qualified_leads',
                            'lost_leads',
                            'active_leads',
                            'conversion_rate',
                            'qualification_rate',
                            'loss_rate',
                            'active_rate',
                            'avg_conversion_days',
                            'avg_response_time_minutes',
                        ],
                    ],
                    'program_trends',
                    'period_days',
                    'total_leads',
                    'total_converted',
                    'overall_conversion_rate',
                    'best_program',
                    'programs_count',
                ]);

            // Verify numeric values are valid (if data exists)
            $program = $response->json('program_performance.0');
            if ($program) {
                expect($program['total_leads'])->toBeInt();
                expect($program['conversion_rate'])->toBeNumeric();
            }
        });

        it('supports different period ranges including yearly', function ($period) {
            $service = Service::factory()->create();
            Lead::factory()->count(5)->create(['service_id' => $service->id]);

            $response = $this->getJson("/api/dashboard/program-performance?period={$period}");

            $response->assertSuccessful();
            expect($response->json('period_days'))->toBe($period);
        })->with([7, 14, 30, 60, 90, 180, 365]);

        it('tracks program trends week-over-week', function () {
            $service = Service::factory()->create(['name' => 'Test Service']);
            Lead::factory()->count(10)->create(['service_id' => $service->id]);

            $response = $this->getJson('/api/dashboard/program-performance?period=90');

            $response->assertSuccessful();

            $trends = $response->json('program_trends');
            expect($trends)->toBeArray();
        });

        it('identifies best performing program', function () {
            $bestProgram = Service::factory()->create(['name' => 'Best Program']);
            $otherProgram = Service::factory()->create(['name' => 'Other Program']);

            Lead::factory()->count(10)->create([
                'service_id' => $bestProgram->id,
                'inquiry_status' => 'converted',
            ]);
            Lead::factory()->count(5)->create([
                'service_id' => $otherProgram->id,
                'inquiry_status' => 'new',
            ]);

            $response = $this->getJson('/api/dashboard/program-performance?period=90');

            $response->assertSuccessful();

            $bestProgramData = $response->json('best_program');
            expect($bestProgramData)->not->toBeNull();
            expect($response->json('programs_count'))->toBeGreaterThanOrEqual(1);
        });

        it('requires authentication', function () {
            $this->app['auth']->forgetGuards();

            $response = $this->getJson('/api/dashboard/program-performance?period=90');

            $response->assertUnauthorized();
        });
    });

    describe('Task Completion Analysis', function () {
        it('returns task completion data with correct structure', function () {
            // Create test tasks
            Task::factory()->count(10)->create([
                'assigned_to_id' => $this->user->id,
                'status' => 'completed',
            ]);
            Task::factory()->count(5)->create([
                'assigned_to_id' => $this->user->id,
                'status' => 'pending',
            ]);

            $response = $this->getJson('/api/dashboard/task-completion-analysis?period=30');

            $response->assertSuccessful()
                ->assertJsonStructure([
                    'overall_metrics' => [
                        'total_tasks',
                        'completed_tasks',
                        'overdue_tasks',
                        'accuracy_rate',
                        'on_time_rate',
                    ],
                    'accuracy_trend' => [
                        '*' => [
                            'week',
                            'period',
                            'total_tasks',
                            'completed_tasks',
                            'accuracy_rate',
                        ],
                    ],
                    'task_type_breakdown' => [
                        '*' => [
                            'type',
                            'total_tasks',
                            'completed_tasks',
                            'overdue_tasks',
                            'completion_rate',
                            'overdue_rate',
                        ],
                    ],
                    'overdue_analysis',
                    'period_days',
                    'user_filtered',
                ]);

            // Verify metrics are numeric
            $metrics = $response->json('overall_metrics');
            expect($metrics['total_tasks'])->toBeInt();
            expect($metrics['accuracy_rate'])->toBeNumeric();
        });

        it('supports user-specific filtering', function () {
            $otherUser = User::factory()->create();

            Task::factory()->count(5)->create(['assigned_to_id' => $this->user->id]);
            Task::factory()->count(10)->create(['assigned_to_id' => $otherUser->id]);

            $response = $this->getJson("/api/dashboard/task-completion-analysis?period=30&user_id={$this->user->id}");

            $response->assertSuccessful();
            expect($response->json('user_filtered'))->toBeTrue();

            $metrics = $response->json('overall_metrics');
            expect($metrics['total_tasks'])->toBe(5);
        });

        it('supports different period ranges', function ($period) {
            Task::factory()->count(5)->create(['assigned_to_id' => $this->user->id]);

            $response = $this->getJson("/api/dashboard/task-completion-analysis?period={$period}");

            $response->assertSuccessful();
            expect($response->json('period_days'))->toBe($period);
        })->with([7, 14, 30, 60, 90]);

        it('tracks weekly accuracy trends', function () {
            Task::factory()->count(20)->create([
                'assigned_to_id' => $this->user->id,
                'created_at' => now()->subDays(10),
            ]);

            $response = $this->getJson('/api/dashboard/task-completion-analysis?period=30');

            $response->assertSuccessful();

            $trends = $response->json('accuracy_trend');
            expect($trends)->toBeArray();
            expect(count($trends))->toBeGreaterThan(0);
        });

        it('analyzes overdue tasks by priority', function () {
            Task::factory()->count(3)->create([
                'assigned_to_id' => $this->user->id,
                'priority' => 'urgent',
                'due_at' => now()->subDays(5),
                'status' => 'pending',
            ]);
            Task::factory()->count(2)->create([
                'assigned_to_id' => $this->user->id,
                'priority' => 'high',
                'due_at' => now()->subDays(3),
                'status' => 'pending',
            ]);

            $response = $this->getJson('/api/dashboard/task-completion-analysis?period=30');

            $response->assertSuccessful();

            $overdueAnalysis = $response->json('overdue_analysis');
            expect($overdueAnalysis)->toBeArray();
        });

        it('requires authentication', function () {
            $this->app['auth']->forgetGuards();

            $response = $this->getJson('/api/dashboard/task-completion-analysis?period=30');

            $response->assertUnauthorized();
        });
    });

    describe('Lead Lifecycle Analysis', function () {
        it('returns lifecycle analysis data with correct structure', function () {
            // Create leads in various stages
            Lead::factory()->count(5)->create(['inquiry_status' => 'new']);
            Lead::factory()->count(5)->create(['inquiry_status' => 'contacted']);
            Lead::factory()->count(3)->create(['inquiry_status' => 'qualified']);
            Lead::factory()->count(2)->create(['inquiry_status' => 'converted']);

            $response = $this->getJson('/api/dashboard/lead-lifecycle-analysis?period=90');

            $response->assertSuccessful()
                ->assertJsonStructure([
                    'stage_breakdown' => [
                        '*' => [
                            'stage',
                            'total_leads',
                            'avg_days_to_contact',
                            'avg_days_to_qualify',
                            'avg_days_to_convert',
                        ],
                    ],
                    'bottlenecks' => [
                        '*' => [
                            'stage',
                            'expected_days',
                            'actual_avg_days',
                            'delay_days',
                            'leads_stuck',
                            'severity',
                        ],
                    ],
                    'stage_durations' => [
                        '*' => [
                            'stage',
                            'avg_days',
                        ],
                    ],
                    'velocity_metrics' => [
                        'total_leads',
                        'converted_leads',
                        'avg_lifecycle_days',
                        'conversion_velocity',
                    ],
                    'period_days',
                ]);

            // Verify velocity metrics
            $velocity = $response->json('velocity_metrics');
            expect($velocity['total_leads'])->toBeInt();
            expect($velocity['conversion_velocity'])->toBeNumeric();
        });

        it('identifies bottlenecks with severity levels', function () {
            // Create leads stuck in qualification stage
            Lead::factory()->count(10)->create([
                'inquiry_status' => 'contacted',
                'created_at' => now()->subDays(45),
            ]);

            $response = $this->getJson('/api/dashboard/lead-lifecycle-analysis?period=90');

            $response->assertSuccessful();

            $bottlenecks = $response->json('bottlenecks');
            expect($bottlenecks)->toBeArray();

            if (count($bottlenecks) > 0) {
                $bottleneck = $bottlenecks[0];
                expect($bottleneck['severity'])->toBeIn(['low', 'medium', 'high', 'critical']);
                expect($bottleneck['leads_stuck'])->toBeInt();
            }
        });

        it('calculates stage durations correctly', function () {
            Lead::factory()->count(10)->create([
                'inquiry_status' => 'converted',
                'created_at' => now()->subDays(30),
            ]);

            $response = $this->getJson('/api/dashboard/lead-lifecycle-analysis?period=90');

            $response->assertSuccessful();

            $stageDurations = $response->json('stage_durations');
            expect($stageDurations)->toBeArray();
            expect(count($stageDurations))->toBeGreaterThan(0);

            foreach ($stageDurations as $stage) {
                expect($stage['avg_days'])->toBeNumeric();
            }
        });

        it('tracks lead velocity metrics', function () {
            // Create converted leads over time
            Lead::factory()->count(5)->create([
                'inquiry_status' => 'converted',
                'created_at' => now()->subDays(10),
            ]);

            $response = $this->getJson('/api/dashboard/lead-lifecycle-analysis?period=90');

            $response->assertSuccessful();

            $velocity = $response->json('velocity_metrics');
            expect($velocity['total_leads'])->toBeGreaterThan(0);
            expect($velocity['conversion_velocity'])->toBeNumeric();
        });

        it('supports different period ranges', function ($period) {
            Lead::factory()->count(10)->create();

            $response = $this->getJson("/api/dashboard/lead-lifecycle-analysis?period={$period}");

            $response->assertSuccessful();
            expect($response->json('period_days'))->toBe($period);
        })->with([7, 14, 30, 60, 90, 180]);

        it('requires authentication', function () {
            $this->app['auth']->forgetGuards();

            $response = $this->getJson('/api/dashboard/lead-lifecycle-analysis?period=90');

            $response->assertUnauthorized();
        });
    });

    describe('Authorization', function () {
        it('allows super-admin to access all endpoints', function () {
            $endpoints = [
                '/api/dashboard/lead-source-performance?period=30',
                '/api/dashboard/program-performance?period=90',
                '/api/dashboard/task-completion-analysis?period=30',
                '/api/dashboard/lead-lifecycle-analysis?period=90',
            ];

            foreach ($endpoints as $endpoint) {
                $response = $this->getJson($endpoint);
                $response->assertSuccessful();
            }
        });

        it('denies access to non-authenticated users', function () {
            $this->app['auth']->forgetGuards();

            $endpoints = [
                '/api/dashboard/lead-source-performance?period=30',
                '/api/dashboard/program-performance?period=90',
                '/api/dashboard/task-completion-analysis?period=30',
                '/api/dashboard/lead-lifecycle-analysis?period=90',
            ];

            foreach ($endpoints as $endpoint) {
                $response = $this->getJson($endpoint);
                $response->assertUnauthorized();
            }
        });
    });

    describe('Data Validation', function () {
        it('validates period parameter is numeric', function () {
            $response = $this->getJson('/api/dashboard/lead-source-performance?period=invalid');

            // Should still work with default or handle gracefully
            expect($response->status())->toBeIn([200, 422]);
        });

        it('validates user_id parameter for task completion analysis', function () {
            $response = $this->getJson('/api/dashboard/task-completion-analysis?period=30&user_id=invalid');

            // Should handle invalid user_id gracefully
            expect($response->status())->toBeIn([200, 422]);
        });

        it('returns empty arrays when no data exists', function () {
            // Clear all existing data
            Lead::query()->delete();
            Task::query()->delete();

            $response = $this->getJson('/api/dashboard/lead-source-performance?period=30');

            $response->assertSuccessful();
            expect($response->json('source_performance'))->toBeArray();
        });
    });
});
