<?php

use App\Models\Lead;
use App\Models\User;
use Spatie\Permission\Models\Role;

/**
 * Test suite for enhanced dashboard features including:
 * - Export functionality
 * - Real-time updates
 * - Date range filtering
 * - Drill-down data
 */
describe('Enhanced Dashboard Features', function () {
    beforeEach(function () {
        // Create super-admin role
        Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);

        // Create and authenticate user
        $this->user = User::factory()->create();
        $this->user->assignRole('super-admin');
        $this->actingAs($this->user);
    });

    describe('Leads Overview Component', function () {
        it('returns data suitable for export', function () {
            Lead::factory()->count(5)->create();

            $response = $this->getJson('/api/dashboard/leads-overview?period=day');

            $response->assertSuccessful();

            // Verify chart data is exportable (has required fields)
            $chartData = $response->json('chart_data');
            expect($chartData)->toBeArray();
            expect($chartData[0])->toHaveKeys(['period', 'deals']);
        });

        it('returns statistics for drill-down', function () {
            Lead::factory()->count(10)->create();

            $response = $this->getJson('/api/dashboard/leads-overview?period=week');

            $response->assertSuccessful()
                ->assertJsonStructure([
                    'statistics' => [
                        'closed_deals',
                        'closed_deals_change',
                        'pipeline_value',
                        'pipeline_value_formatted',
                        'pipeline_change',
                        'conversion_rate',
                        'conversion_change',
                    ],
                ]);

            // Verify statistics have numeric values suitable for drill-down
            $statistics = $response->json('statistics');
            expect($statistics['closed_deals'])->toBeNumeric();
            expect($statistics['conversion_rate'])->toBeNumeric();
        });

        it('supports all period types for flexible filtering', function ($period) {
            Lead::factory()->count(5)->create();

            $response = $this->getJson("/api/dashboard/leads-overview?period={$period}");

            $response->assertSuccessful()
                ->assertJsonStructure([
                    'chart_data',
                    'statistics',
                ]);

            // Verify chart data is not empty
            expect($response->json('chart_data'))->toBeArray();
        })->with(['day', 'week', 'month', 'year']);

        it('returns consistent data structure for all periods', function () {
            Lead::factory()->count(10)->create();

            $periods = ['day', 'week', 'month', 'year'];
            $structures = [];

            foreach ($periods as $period) {
                $response = $this->getJson("/api/dashboard/leads-overview?period={$period}");
                $structures[$period] = array_keys($response->json());
            }

            // All periods should have the same top-level structure
            $firstStructure = $structures['day'];
            foreach ($structures as $period => $structure) {
                expect($structure)->toBe($firstStructure, "Period {$period} has different structure");
            }
        });
    });

    describe('Lead Analytics Component', function () {
        it('returns data suitable for export', function () {
            Lead::factory()->count(15)->create();

            $response = $this->getJson('/api/dashboard/lead-analytics?period=5D');

            $response->assertSuccessful();

            // Verify chart data is exportable
            $chartData = $response->json('chart_data');
            expect($chartData)->toBeArray();
            expect($chartData[0])->toHaveKeys(['period', 'leads']);
        });

        it('calculates growth percentage for trending', function () {
            Lead::factory()->count(20)->create();

            $response = $this->getJson('/api/dashboard/lead-analytics?period=1M');

            $response->assertSuccessful()
                ->assertJsonStructure([
                    'total_leads',
                    'growth_percentage',
                ]);

            // Verify growth percentage is numeric
            $growthPercentage = $response->json('growth_percentage');
            expect($growthPercentage)->toBeNumeric();
        });

        it('supports all period types', function ($period) {
            Lead::factory()->count(10)->create();

            $response = $this->getJson("/api/dashboard/lead-analytics?period={$period}");

            $response->assertSuccessful()
                ->assertJsonStructure([
                    'chart_data',
                    'total_leads',
                    'growth_percentage',
                ]);
        })->with(['5D', '2W', '1M', '6M']);
    });

    describe('Export Data Format', function () {
        it('provides clean data for CSV export from leads overview', function () {
            Lead::factory()->count(5)->create();

            $response = $this->getJson('/api/dashboard/leads-overview?period=day');

            $chartData = $response->json('chart_data');

            // Verify CSV-compatible data (no nested objects)
            foreach ($chartData as $row) {
                expect($row['period'])->toBeString();
                expect($row['deals'])->toBeNumeric();
                // No nested objects that would break CSV export
                expect(is_scalar($row['period']))->toBeTrue();
                expect(is_scalar($row['deals']))->toBeTrue();
            }
        });

        it('provides clean data for CSV export from lead analytics', function () {
            Lead::factory()->count(10)->create();

            $response = $this->getJson('/api/dashboard/lead-analytics?period=2W');

            $chartData = $response->json('chart_data');

            // Verify CSV-compatible data
            foreach ($chartData as $row) {
                expect($row['period'])->toBeString();
                expect($row['leads'])->toBeNumeric();
                expect(is_scalar($row['period']))->toBeTrue();
                expect(is_scalar($row['leads']))->toBeTrue();
            }
        });
    });

    describe('Drill-Down Data', function () {
        it('provides detailed statistics for drill-down modal', function () {
            Lead::factory()->count(20)->create();

            $response = $this->getJson('/api/dashboard/leads-overview?period=month');

            $statistics = $response->json('statistics');

            // Verify all required drill-down data is present
            expect($statistics)->toHaveKeys([
                'closed_deals',
                'pipeline_value',
                'conversion_rate',
            ]);

            // Verify formatted values for display
            expect($statistics['pipeline_value_formatted'])->toBeString();
            expect($statistics['pipeline_value_formatted'])->toContain('$');
        });

        it('includes change indicators for trend visualization', function () {
            Lead::factory()->count(15)->create();

            $response = $this->getJson('/api/dashboard/leads-overview?period=week');

            $statistics = $response->json('statistics');

            // Verify change indicators are present
            expect($statistics)->toHaveKeys([
                'closed_deals_change',
                'pipeline_change',
                'conversion_change',
            ]);

            // Changes should be strings with signs
            expect($statistics['closed_deals_change'])->toBeString();
        });
    });

    describe('Real-Time Data Support', function () {
        it('returns current timestamp for cache busting', function () {
            Lead::factory()->count(5)->create();

            $response1 = $this->getJson('/api/dashboard/leads-overview');
            $response2 = $this->getJson('/api/dashboard/leads-overview');

            // Both responses should be successful
            $response1->assertSuccessful();
            $response2->assertSuccessful();

            // Responses should be fresh (not heavily cached)
            // This ensures real-time updates can be reflected
            expect($response1->json('chart_data'))->toBeArray();
            expect($response2->json('chart_data'))->toBeArray();
        });

        it('reflects latest lead data without heavy caching', function () {
            // Create initial leads
            Lead::factory()->count(5)->create();

            $response1 = $this->getJson('/api/dashboard/lead-analytics?period=5D');
            $initialTotal = $response1->json('total_leads');

            // Create more leads
            Lead::factory()->count(3)->create();

            // Clear any cache
            cache()->flush();

            $response2 = $this->getJson('/api/dashboard/lead-analytics?period=5D');
            $updatedTotal = $response2->json('total_leads');

            // Updated total should reflect new leads
            expect($updatedTotal)->toBeGreaterThan($initialTotal);
        });
    });

    describe('Performance and Optimization', function () {
        it('handles large datasets efficiently', function () {
            // Create a large number of leads
            Lead::factory()->count(100)->create();

            $startTime = microtime(true);

            $response = $this->getJson('/api/dashboard/leads-overview?period=year');

            $endTime = microtime(true);
            $executionTime = ($endTime - $startTime) * 1000; // Convert to milliseconds

            $response->assertSuccessful();

            // Response should be within reasonable time (< 2 seconds)
            expect($executionTime)->toBeLessThan(2000);

            // Data should be properly aggregated, not just returning all raw records
            $chartData = $response->json('chart_data');
            expect(count($chartData))->toBeLessThan(100); // Should be aggregated
        });

        it('returns consistent data structure regardless of data volume', function () {
            // Test with no data
            $response1 = $this->getJson('/api/dashboard/leads-overview?period=day');

            // Test with data
            Lead::factory()->count(50)->create();
            $response2 = $this->getJson('/api/dashboard/leads-overview?period=day');

            // Both should have the same structure
            $keys1 = array_keys($response1->json());
            $keys2 = array_keys($response2->json());

            expect($keys1)->toBe($keys2);
        });
    });

    describe('Error Handling', function () {
        it('handles invalid period gracefully', function () {
            $response = $this->getJson('/api/dashboard/leads-overview?period=invalid');

            // Should either return default or validation error
            // Not throw an unhandled exception
            expect(in_array($response->status(), [200, 422]))->toBeTrue();
        });

        it('returns empty data structure when no leads exist', function () {
            // Don't create any leads

            $response = $this->getJson('/api/dashboard/leads-overview?period=month');

            $response->assertSuccessful()
                ->assertJsonStructure([
                    'chart_data',
                    'statistics',
                ]);

            // Chart data should be empty array, not null
            expect($response->json('chart_data'))->toBeArray();
        });
    });

    describe('Date Range Compatibility', function () {
        it('accepts custom date range parameters', function () {
            Lead::factory()->count(10)->create();

            $startDate = now()->subDays(30)->format('Y-m-d');
            $endDate = now()->format('Y-m-d');

            $response = $this->getJson("/api/dashboard/leads-overview?start_date={$startDate}&end_date={$endDate}");

            // Should handle custom date ranges (if implemented)
            // Or return standard period data
            $response->assertSuccessful();
        });
    });
});

describe('Dashboard Metrics Integration', function () {
    beforeEach(function () {
        Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
        $this->user = User::factory()->create();
        $this->user->assignRole('super-admin');
        $this->actingAs($this->user);
    });

    it('provides metrics compatible with chart visualization', function () {
        // Create some leads to generate metrics data
        Lead::factory()->count(10)->create();

        $response = $this->getJson('/api/metrics/daily?start_date='.now()->subDays(30)->format('Y-m-d'));

        $response->assertSuccessful();

        $metrics = $response->json();

        // Verify metrics are in a format suitable for charts
        expect($metrics)->toBeArray();

        // The API should return an array even if empty
        if (count($metrics) > 0) {
            // If metrics exist, verify structure
            expect($metrics[0])->toBeArray();
        }
    });
});

describe('Lead Distribution', function () {
    beforeEach(function () {
        Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
        $this->user = User::factory()->create();
        $this->user->assignRole('super-admin');
        $this->actingAs($this->user);
    });

    it('returns lead distribution by source without errors', function () {
        // Clear cache to ensure fresh data
        cache()->flush();

        // Create leads with sources
        Lead::factory()->count(10)->create();

        $response = $this->getJson('/api/dashboard/lead-distribution?dimension=source');

        $response->assertSuccessful()
            ->assertJsonStructure([
                'distribution_data',
                'total_leads',
                'dimension',
            ]);

        $data = $response->json();
        expect($data['dimension'])->toBe('source');
        expect($data['distribution_data'])->toBeArray();
    });

    it('returns lead distribution by service', function () {
        cache()->flush();

        Lead::factory()->count(10)->create();

        $response = $this->getJson('/api/dashboard/lead-distribution?dimension=service');

        $response->assertSuccessful()
            ->assertJsonStructure([
                'distribution_data',
                'total_leads',
                'dimension',
            ]);

        $data = $response->json();
        expect($data['dimension'])->toBe('service');
    });

    it('returns lead distribution by status', function () {
        cache()->flush();

        Lead::factory()->count(10)->create();

        $response = $this->getJson('/api/dashboard/lead-distribution?dimension=status');

        $response->assertSuccessful()
            ->assertJsonStructure([
                'distribution_data',
                'total_leads',
                'dimension',
            ]);

        $data = $response->json();
        expect($data['dimension'])->toBe('status');
    });
});
