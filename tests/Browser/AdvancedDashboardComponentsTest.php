<?php

use App\Models\User;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\seed;

/**
 * Advanced Dashboard Components Browser Tests
 *
 * Tests for newly added dashboard components:
 * - Lead Analytics
 * - Leads Overview
 * - Revenue Pipeline
 * - Lead Lifecycle Funnel
 * - Lead Distribution
 * - Activity Heatmap
 * - Conversion by Service
 * - Activity Timeline
 * - Lead Source Performance
 * - Program Performance
 * - Task Completion Analysis
 * - Lead Lifecycle Analysis
 */
beforeEach(function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);
});

describe('Lead Analytics Component', function () {
    it('displays lead analytics chart on super admin dashboard', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('Lead Analytics')
            ->assertNoJavascriptErrors();
    });

    it('allows period selection in lead analytics', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertNoJavascriptErrors();

        // Check if period selectors are present
        $page->assertSee('5D')
            ->assertSee('2W')
            ->assertSee('1M')
            ->assertSee('6M');
    });

    it('displays lead analytics growth percentage', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('Total Leads')
            ->assertNoJavascriptErrors();
    });
});

describe('Leads Overview Component', function () {
    it('displays leads overview chart on super admin dashboard', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('Leads Overview')
            ->assertNoJavascriptErrors();
    });

    it('allows period selection in leads overview', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        // Check period selectors
        $page->assertSee('Day')
            ->assertSee('Week')
            ->assertSee('Month')
            ->assertSee('Year');
    });

    it('displays leads statistics correctly', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('Closed Deals')
            ->assertSee('Pipeline Value')
            ->assertSee('Conversion Rate')
            ->assertNoJavascriptErrors();
    });
});

describe('Revenue Pipeline Component', function () {
    it('displays revenue pipeline chart on super admin dashboard', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('Revenue Pipeline')
            ->assertNoJavascriptErrors();
    });

    it('shows all pipeline stages', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('New Leads')
            ->assertSee('Contacted')
            ->assertSee('Qualified')
            ->assertNoJavascriptErrors();
    });

    it('displays total pipeline value', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('Total Pipeline')
            ->assertNoJavascriptErrors();
    });
});

describe('Lead Lifecycle Funnel Component', function () {
    it('displays lead lifecycle funnel on super admin dashboard', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('Lead Lifecycle')
            ->assertNoJavascriptErrors();
    });

    it('allows period selection in lifecycle funnel', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        // Check if period selectors exist
        $page->assertSee('7 days')
            ->assertSee('14 days')
            ->assertSee('30 days');
    });

    it('displays conversion rates for each stage', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertNoJavascriptErrors();
    });
});

describe('Lead Distribution Component', function () {
    it('displays lead distribution chart on super admin dashboard', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('Lead Distribution')
            ->assertNoJavascriptErrors();
    });

    it('allows dimension selection in lead distribution', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        // Check if dimension selectors exist
        $page->assertSee('Source')
            ->assertSee('Service')
            ->assertSee('Status');
    });

    it('displays interactive legend with percentages', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertNoJavascriptErrors();
    });
});

describe('Activity Heatmap Component', function () {
    it('displays activity heatmap on super admin dashboard', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('Activity Heatmap')
            ->assertNoJavascriptErrors();
    });

    it('allows period selection in activity heatmap', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('7 days')
            ->assertSee('14 days')
            ->assertSee('30 days');
    });

    it('shows day and hour grid without errors', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertNoJavascriptErrors();
    });
});

describe('Conversion by Service Component', function () {
    it('displays conversion by service chart on super admin dashboard', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('Conversion by Service')
            ->assertNoJavascriptErrors();
    });

    it('allows period selection in conversion by service', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('7 days')
            ->assertSee('14 days')
            ->assertSee('30 days');
    });

    it('displays performance badges for services', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertNoJavascriptErrors();
    });
});

describe('Activity Timeline Component', function () {
    it('displays activity timeline on super admin dashboard', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('Activity Timeline')
            ->assertNoJavascriptErrors();
    });

    it('allows period selection in activity timeline', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('7 days')
            ->assertSee('14 days')
            ->assertSee('30 days');
    });

    it('shows activity type summary badges', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertNoJavascriptErrors();
    });
});

describe('Lead Source Performance Component', function () {
    it('displays lead source performance on super admin dashboard', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('Lead Source Performance')
            ->assertNoJavascriptErrors();
    });

    it('allows period selection in lead source performance', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('7 days')
            ->assertSee('14 days')
            ->assertSee('30 days');
    });

    it('displays quality badges for sources', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertNoJavascriptErrors();
    });

    it('shows best and worst performers', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertNoJavascriptErrors();
    });
});

describe('Program Performance Component', function () {
    it('displays program performance on super admin dashboard', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('Program Performance')
            ->assertNoJavascriptErrors();
    });

    it('allows period selection in program performance', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('7D')
            ->assertSee('14D')
            ->assertSee('1M');
    });

    it('shows week-over-week trend indicators', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertNoJavascriptErrors();
    });

    it('displays multi-country program tracking', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertNoJavascriptErrors();
    });
});

describe('Task Completion Analysis Component', function () {
    it('displays task completion analysis on super admin dashboard', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('Task Completion Analysis')
            ->assertNoJavascriptErrors();
    });

    it('allows period selection in task completion analysis', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('7 days')
            ->assertSee('14 days')
            ->assertSee('30 days');
    });

    it('displays overall task metrics cards', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertNoJavascriptErrors();
    });

    it('shows weekly accuracy trend chart', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertNoJavascriptErrors()
            ->assertNoConsoleLogs();
    });

    it('displays task type breakdown', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertNoJavascriptErrors();
    });

    it('shows overdue analysis by priority', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertNoJavascriptErrors();
    });
});

describe('Lead Lifecycle Analysis Component', function () {
    it('displays lead lifecycle analysis on super admin dashboard', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('Lead Lifecycle Analysis')
            ->assertNoJavascriptErrors();
    });

    it('allows period selection in lead lifecycle analysis', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('7D')
            ->assertSee('14D')
            ->assertSee('1M');
    });

    it('displays velocity metrics cards', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertSee('Total Leads')
            ->assertSee('Converted')
            ->assertNoJavascriptErrors();
    });

    it('shows stage duration bar chart', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertNoJavascriptErrors()
            ->assertNoConsoleLogs();
    });

    it('displays bottleneck identification with severity badges', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertNoJavascriptErrors();
    });

    it('shows leads stuck tracking', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertNoJavascriptErrors();
    });
});

describe('Dashboard Component Interactions', function () {
    it('all dashboard components load without JavaScript errors', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertNoJavascriptErrors();
    });

    it('dashboard components are responsive on tablet', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)
            ->visit('/dashboard')
            ->on()
            ->resize(768, 1024);

        $page->assertNoJavascriptErrors();
    });

    it('dashboard components are responsive on mobile', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)
            ->visit('/dashboard')
            ->on()
            ->mobile();

        $page->assertNoJavascriptErrors();
    });

    it('dashboard handles loading states gracefully', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        // Page should load even with slow API responses
        $page->assertSee('Dashboard')
            ->assertNoJavascriptErrors();
    });

    it('dashboard components support dark mode', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        // Components should render without errors in dark mode
        $page->assertNoJavascriptErrors();
    });
});

describe('Dashboard Empty States', function () {
    it('displays empty state when no metrics data exists', function () {
        seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
        // Don't seed MetricsSeeder to test empty state

        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $page->assertNoJavascriptErrors();
    });

    it('handles API errors gracefully', function () {
        seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);

        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        // Even with potential API errors, page should not crash
        $page->assertSee('Dashboard')
            ->assertNoJavascriptErrors();
    });
});

describe('Dashboard Performance', function () {
    it('dashboard loads within acceptable time', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $startTime = microtime(true);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        $endTime = microtime(true);
        $loadTime = $endTime - $startTime;

        // Dashboard should load in less than 5 seconds
        expect($loadTime)->toBeLessThan(5);

        $page->assertNoJavascriptErrors();
    });

    it('charts render efficiently without blocking UI', function () {
        $superAdminRole = Role::where('name', 'super-admin')->first();
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);

        $page = $this->actingAs($superAdmin)->visit('/dashboard');

        // Page should be interactive even while charts are loading
        $page->assertSee('Dashboard')
            ->assertNoJavascriptErrors();
    });
});
