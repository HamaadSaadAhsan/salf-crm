<?php

namespace App\Console\Commands;

use App\Models\LeadActivity;
use Illuminate\Console\Command;

class UpdateCustomFieldsActivityDescriptions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'leads:update-custom-fields-activities';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update existing custom fields activity descriptions to human-readable format';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting to update custom fields activity descriptions...');

        // Find all activities related to custom fields changes
        $activities = LeadActivity::where('subject', 'Updated Custom Fields')
            ->whereNotNull('metadata')
            ->get();

        if ($activities->isEmpty()) {
            $this->info('No custom fields activities found to update.');

            return self::SUCCESS;
        }

        $this->info("Found {$activities->count()} activities to update.");

        $bar = $this->output->createProgressBar($activities->count());
        $bar->start();

        $updated = 0;
        $skipped = 0;

        foreach ($activities as $activity) {
            if (! isset($activity->metadata['old_value']) || ! isset($activity->metadata['new_value'])) {
                $skipped++;
                $bar->advance();

                continue;
            }

            $oldValue = $activity->metadata['old_value'];
            $newValue = $activity->metadata['new_value'];

            // Format the values
            $oldDisplay = $this->formatCustomFieldsForDisplay($oldValue);
            $newDisplay = $this->formatCustomFieldsForDisplay($newValue);

            // Update the description
            $activity->description = "Custom Fields was changed from {$oldDisplay} to {$newDisplay}. ";
            $activity->save();

            $updated++;
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        $this->info("✓ Updated {$updated} activity descriptions.");
        if ($skipped > 0) {
            $this->warn("⚠ Skipped {$skipped} activities due to missing metadata.");
        }

        return self::SUCCESS;
    }

    /**
     * Format custom fields array for human-readable display
     */
    private function formatCustomFieldsForDisplay($customFields): string
    {
        // Handle null or empty values
        if (is_null($customFields) || (is_array($customFields) && empty($customFields))) {
            return 'Not set';
        }

        // Ensure we have an array
        if (is_string($customFields)) {
            $customFields = json_decode($customFields, true);
        }

        if (! is_array($customFields)) {
            return 'Invalid data';
        }

        $formatted = [];

        foreach ($customFields as $key => $value) {
            // Convert snake_case to Title Case
            $label = ucwords(str_replace('_', ' ', $key));

            // Format the value based on type
            if (is_array($value)) {
                // Handle array values (like multi-select fields)
                $formattedValue = implode(', ', array_map(function ($item) {
                    return is_array($item) ? json_encode($item) : (string) $item;
                }, $value));
            } elseif (is_bool($value)) {
                $formattedValue = $value ? 'Yes' : 'No';
            } elseif (is_null($value)) {
                $formattedValue = 'Not set';
            } else {
                $formattedValue = (string) $value;
            }

            $formatted[] = "{$label}: {$formattedValue}";
        }

        return implode(', ', $formatted);
    }
}
