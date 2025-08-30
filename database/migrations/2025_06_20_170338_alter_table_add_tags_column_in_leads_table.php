<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->jsonb('tags')->nullable()->after('custom_fields');
            $table->index('tags', null, 'gin');
        });

        // Migrate existing tags from custom_fields to the new column
        $this->migrateExistingTags();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // First, move tags back to custom_fields if needed
        $this->moveTagsBackToCustomFields();

        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex(['tags']);
            $table->dropColumn('tags');
        });
    }

    /**
     * Migrate existing tags from custom_fields to the new tags column
     */
    private function migrateExistingTags(): void
    {
        $leads = DB::table('leads')
            ->whereNotNull('custom_fields')
            ->get();

        foreach ($leads as $lead) {
            $customFields = json_decode($lead->custom_fields, true);

            if (!empty($customFields['tags'])) {
                // Get tags from custom_fields
                $tags = $customFields['tags'];

                // Ensure tags are in the correct format (array of objects)
                if (!is_array(reset($tags))) {
                    // If tags are just values, convert to objects
                    $tags = array_map(function ($tagValue) {
                        return $this->findTagObject($tagValue);
                    }, $tags);
                }

                // Update the lead with the new tags column
                DB::table('leads')
                    ->where('id', $lead->id)
                    ->update([
                        'tags' => json_encode(array_values($tags))
                    ]);

                // Remove tags from custom_fields
                unset($customFields['tags']);

                DB::table('leads')
                    ->where('id', $lead->id)
                    ->update([
                        'custom_fields' => empty($customFields) ? null : json_encode($customFields)
                    ]);
            }
        }
    }

    /**
     * Move tags back to custom_fields (for rollback)
     */
    private function moveTagsBackToCustomFields(): void
    {
        $leads = DB::table('leads')
            ->whereNotNull('tags')
            ->get();

        foreach ($leads as $lead) {
            $tags = json_decode($lead->tags, true);
            $customFields = json_decode($lead->custom_fields, true) ?? [];

            if (!empty($tags)) {
                $customFields['tags'] = $tags;

                DB::table('leads')
                    ->where('id', $lead->id)
                    ->update([
                        'custom_fields' => json_encode($customFields)
                    ]);
            }
        }
    }

    /**
     * Helper function to convert tag value to tag object
     */
    private function findTagObject(string $tagValue): array
    {
        $tagDefinitions = [
            'potential' => [
                'label' => 'Potential',
                'value' => 'potential',
                'color' => 'yellow'
            ],
            'non-potential' => [
                'label' => 'Non Potential',
                'value' => 'non-potential',
                'color' => 'red'
            ],
            'meeting-done' => [
                'label' => 'Meeting Done',
                'value' => 'meeting-done',
                'color' => 'green'
            ],
            'not-interested' => [
                'label' => 'Not Interested',
                'value' => 'not-interested',
                'color' => 'gray'
            ],
            'not-responsive' => [
                'label' => 'Not responsive',
                'value' => 'not-responsive',
                'color' => 'gray'
            ],
            'following-up' => [
                'label' => 'Following Up',
                'value' => 'following-up',
                'color' => 'blue'
            ],
        ];

        return $tagDefinitions[$tagValue] ?? [
            'label' => ucwords(str_replace('-', ' ', $tagValue)),
            'value' => $tagValue,
            'color' => 'gray'
        ];
    }
};
