<?php

use Illuminate\Support\Facades\DB;

/**
 * The D1–D4 field-mapping data migrations insert/upsert rows that reference a
 * seeded form_templates row (ids 1/3/4). On a fresh database with no seeded
 * templates (e.g. RefreshDatabase test runs), those inserts used to fail with a
 * foreign-key violation. Each insert/upsert is now guarded by a template
 * existence check, so the migrations no-op cleanly when the parent is absent.
 *
 * RefreshDatabase has already run every migration before this test; if any of
 * them threw an FK violation the suite could not boot, so reaching these
 * assertions at all proves the guards work.
 */
it('runs the field-mapping data migrations without a seeded form template', function () {
    expect(DB::table('form_templates')->count())->toBe(0);
    expect(DB::table('field_mappings')->count())->toBe(0);
});
