<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! DB::table('form_templates')->where('id', 1)->exists()) {
            return;
        }

        $exists = DB::table('field_mappings')
            ->where('field_name', 'A14_1')
            ->where('form_template_id', 1)
            ->exists();

        if (! $exists) {
            DB::table('field_mappings')->insert([
                'form_template_id' => 1,
                'field_name' => 'A14_1',
                'canonical_path' => 'main_applicant.has_other_citizenship',
                'value_for_truthy' => 'Yes',
                'transform' => null,
                'notes' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            DB::table('field_mappings')
                ->where('field_name', 'A14_1')
                ->where('form_template_id', 1)
                ->update([
                    'canonical_path' => 'main_applicant.has_other_citizenship',
                    'value_for_truthy' => 'Yes',
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        DB::table('field_mappings')
            ->where('field_name', 'A14_1')
            ->where('canonical_path', 'main_applicant.has_other_citizenship')
            ->delete();
    }
};
