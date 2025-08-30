<?php

namespace App\Observers;

use App\Models\Lead;
use App\Models\LeadActivity;
use Illuminate\Support\Facades\Auth;

class LeadObserver
{
    /**
     * Handle the Lead "updated" event.
     */
    public function updated(Lead $lead): void
    {
        $this->trackFieldChanges($lead);
    }

    /**
     * Track field changes and create activities
     */
    private function trackFieldChanges(Lead $lead): void
    {
        $changes = $lead->getDirty();
        $original = $lead->getOriginal();
        $userId = Auth::id() ?? 1; // Fallback to system user if not authenticated

        foreach ($changes as $field => $newValue) {
            $oldValue = $original[$field] ?? null;

            // Skip certain fields that shouldn't create activities
            if (in_array($field, ['updated_at', 'last_activity_at', 'lead_score', 'pending_activities_count'])) {
                continue;
            }

            $this->createFieldChangeActivity($lead, $field, $oldValue, $newValue, $userId);
        }
    }

    /**
     * Create activity for field changes
     */
    private function createFieldChangeActivity(Lead $lead, string $field, $oldValue, $newValue, int $userId): void
    {
        $fieldName = $this->getFieldDisplayName($field);

        // Handle special field types
        if ($field === 'inquiry_status') {
            $this->createStatusChangeActivity($lead, $oldValue, $newValue, $userId);
            return;
        }

        if ($field === 'assigned_to') {
            $this->createAssignmentChangeActivity($lead, $oldValue, $newValue, $userId);
            return;
        }

        // Handle tags separately
        if ($field === 'tags') {
            $this->createTagsChangeActivity($lead, $oldValue, $newValue, $userId);
            return;
        }


        // Create general field change activity
        $subject = "Updated {$fieldName}";
        $description = $this->buildChangeDescription($field, $fieldName, $oldValue, $newValue);

        LeadActivity::create([
            'lead_id' => $lead->id,
            'user_id' => $userId,
            'type' => 'note',
            'status' => 'completed',
            'subject' => $subject,
            'description' => $description,
            'completed_at' => now(),
            'category' => 'system',
            'metadata' => [
                'field' => $field,
                'old_value' => $oldValue,
                'new_value' => $newValue,
                'change_type' => 'field_update'
            ]
        ]);
    }

    /**
     * Create activity for tags changes
     */
    private function createTagsChangeActivity(Lead $lead, $oldTags, $newTags, int $userId): void
    {
        // Parse tags if they're JSON strings
        $oldTagsArray = is_string($oldTags) ? json_decode($oldTags, true) : $oldTags;
        $newTagsArray = is_string($newTags) ? json_decode($newTags, true) : $newTags;

        $oldTagsArray = is_array($oldTagsArray) ? $oldTagsArray : [];
        $newTagsArray = is_array($newTagsArray) ? $newTagsArray : [];

        // Get tag values for comparison
        $oldTagValues = collect($oldTagsArray)->pluck('value')->toArray();
        $newTagValues = collect($newTagsArray)->pluck('value')->toArray();

        // Find added and removed tags
        $addedTags = array_diff($newTagValues, $oldTagValues);
        $removedTags = array_diff($oldTagValues, $newTagValues);

        // Create activity for added tags
        if (!empty($addedTags)) {
            $addedTagsDetails = collect($newTagsArray)
                ->whereIn('value', $addedTags)
                ->pluck('label')
                ->toArray();

            LeadActivity::create([
                'lead_id' => $lead->id,
                'user_id' => $userId,
                'type' => 'note',
                'status' => 'completed',
                'subject' => 'Added tags',
                'description' => 'Added tags: ' . implode(', ', $addedTagsDetails),
                'completed_at' => now(),
                'category' => 'tag_change',
                'metadata' => [
                    'field' => 'tags',
                    'action' => 'added',
                    'tags' => $addedTags,
                    'tag_details' => collect($newTagsArray)->whereIn('value', $addedTags)->values()->toArray(),
                    'change_type' => 'tags_added'
                ]
            ]);
        }

        // Create activity for removed tags
        if (!empty($removedTags)) {
            $removedTagsDetails = collect($oldTagsArray)
                ->whereIn('value', $removedTags)
                ->pluck('label')
                ->toArray();

            LeadActivity::create([
                'lead_id' => $lead->id,
                'user_id' => $userId,
                'type' => 'note',
                'status' => 'completed',
                'subject' => 'Removed tags',
                'description' => 'Removed tags: ' . implode(', ', $removedTagsDetails),
                'completed_at' => now(),
                'category' => 'tag_change',
                'metadata' => [
                    'field' => 'tags',
                    'action' => 'removed',
                    'tags' => $removedTags,
                    'tag_details' => collect($oldTagsArray)->whereIn('value', $removedTags)->values()->toArray(),
                    'change_type' => 'tags_removed'
                ]
            ]);
        }

        // Create summary activity if multiple changes
        if (!empty($addedTags) && !empty($removedTags)) {
            LeadActivity::create([
                'lead_id' => $lead->id,
                'user_id' => $userId,
                'type' => 'note',
                'status' => 'completed',
                'subject' => 'Tags updated',
                'description' => sprintf(
                    'Tags were updated. Added: %s. Removed: %s.',
                    implode(', ', collect($newTagsArray)->whereIn('value', $addedTags)->pluck('label')->toArray()),
                    implode(', ', collect($oldTagsArray)->whereIn('value', $removedTags)->pluck('label')->toArray())
                ),
                'completed_at' => now(),
                'category' => 'tag_change',
                'metadata' => [
                    'field' => 'tags',
                    'action' => 'updated',
                    'added_tags' => $addedTags,
                    'removed_tags' => $removedTags,
                    'old_tags' => $oldTagsArray,
                    'new_tags' => $newTagsArray,
                    'change_type' => 'tags_updated'
                ]
            ]);
        }
    }

    /**
     * Create status change activity
     */
    private function createStatusChangeActivity(Lead $lead, $oldStatus, $newStatus, int $userId): void
    {
        $statusOptions = Lead::getStatusOptions();
        $oldStatusLabel = $statusOptions[$oldStatus] ?? $oldStatus;
        $newStatusLabel = $statusOptions[$newStatus] ?? $newStatus;

        LeadActivity::create([
            'lead_id' => $lead->id,
            'user_id' => $userId,
            'type' => 'status_change',
            'status' => 'completed',
            'subject' => "Status changed from {$oldStatusLabel} to {$newStatusLabel}",
            'description' => "Lead status was updated from '{$oldStatusLabel}' to '{$newStatusLabel}'.",
            'completed_at' => now(),
            'category' => 'system',
            'metadata' => [
                'field' => 'inquiry_status',
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'old_status_label' => $oldStatusLabel,
                'new_status_label' => $newStatusLabel,
                'change_type' => 'status_change'
            ]
        ]);

        // Create a follow-up activity for certain status changes
        $this->createFollowUpForStatusChange($lead, $newStatus, $userId);
    }

    /**
     * Create assignment change activity
     */
    private function createAssignmentChangeActivity(Lead $lead, $oldUserId, $newUserId, int $userId): void
    {
        $oldUser = $oldUserId ? \App\Models\User::find($oldUserId) : null;
        $newUser = $newUserId ? \App\Models\User::find($newUserId) : null;

        $oldUserName = $oldUser ? $oldUser->name : 'Unassigned';
        $newUserName = $newUser ? $newUser->name : 'Unassigned';

        LeadActivity::create([
            'lead_id' => $lead->id,
            'user_id' => $userId,
            'type' => 'assignment_change',
            'status' => 'completed',
            'subject' => "Lead reassigned from {$oldUserName} to {$newUserName}",
            'description' => "Lead assignment was changed from '{$oldUserName}' to '{$newUserName}'.",
            'completed_at' => now(),
            'category' => 'system',
            'metadata' => [
                'field' => 'assigned_to',
                'old_user_id' => $oldUserId,
                'new_user_id' => $newUserId,
                'old_user_name' => $oldUserName,
                'new_user_name' => $newUserName,
                'change_type' => 'assignment_change'
            ]
        ]);

        // Create task for new assignee
        if ($newUserId && $newUserId !== $userId) {
            LeadActivity::create([
                'lead_id' => $lead->id,
                'user_id' => $newUserId,
                'type' => 'task',
                'status' => 'pending',
                'subject' => 'New lead assigned - Follow up required',
                'description' => "You have been assigned a new lead: {$lead->name}. Please review and follow up.",
                'scheduled_at' => now()->addHour(),
                'due_at' => now()->addDay(),
                'priority' => $lead->priority === 'urgent' ? 'urgent' : 'medium',
                'category' => 'follow_up',
                'metadata' => [
                    'change_type' => 'assignment_task',
                    'assigned_by' => $userId
                ]
            ]);
        }
    }

    /**
     * Create follow-up activities for status changes
     */
    private function createFollowUpForStatusChange(Lead $lead, string $newStatus, int $userId): void
    {
        $assignedUserId = $lead->assigned_to ?? $userId;

        switch ($newStatus) {
            case 'contacted':
                LeadActivity::create([
                    'lead_id' => $lead->id,
                    'user_id' => $assignedUserId,
                    'type' => 'follow_up',
                    'status' => 'pending',
                    'subject' => 'Follow up on contacted lead',
                    'description' => 'Lead has been contacted. Schedule follow-up call or meeting.',
                    'scheduled_at' => now()->addDays(2),
                    'due_at' => now()->addDays(3),
                    'priority' => 'medium',
                    'category' => 'follow_up'
                ]);
                break;

            case 'qualified':
                LeadActivity::create([
                    'lead_id' => $lead->id,
                    'user_id' => $assignedUserId,
                    'type' => 'task',
                    'status' => 'pending',
                    'subject' => 'Prepare proposal for qualified lead',
                    'description' => 'Lead has been qualified. Prepare and send proposal.',
                    'scheduled_at' => now()->addDay(),
                    'due_at' => now()->addDays(2),
                    'priority' => 'high',
                    'category' => 'sales'
                ]);
                break;

            case 'proposal':
                LeadActivity::create([
                    'lead_id' => $lead->id,
                    'user_id' => $assignedUserId,
                    'type' => 'follow_up',
                    'status' => 'pending',
                    'subject' => 'Follow up on proposal',
                    'description' => 'Proposal has been sent. Follow up for feedback and next steps.',
                    'scheduled_at' => now()->addDays(3),
                    'due_at' => now()->addDays(5),
                    'priority' => 'high',
                    'category' => 'sales'
                ]);
                break;

            case 'nurturing':
                LeadActivity::create([
                    'lead_id' => $lead->id,
                    'user_id' => $assignedUserId,
                    'type' => 'follow_up',
                    'status' => 'pending',
                    'subject' => 'Nurture lead - Monthly check-in',
                    'description' => 'Lead is in nurturing phase. Schedule monthly check-in.',
                    'scheduled_at' => now()->addMonth(),
                    'due_at' => now()->addMonth()->addDays(2),
                    'priority' => 'low',
                    'category' => 'nurturing'
                ]);
                break;
        }
    }

    /**
     * Build description for field changes
     */
    private function buildChangeDescription(string $field, string $fieldName, $oldValue, $newValue): string
    {
        $oldDisplay = $this->formatValueForDisplay($field, $oldValue);
        $newDisplay = $this->formatValueForDisplay($field, $newValue);

        return "{$fieldName} was changed from {$oldDisplay} to {$newDisplay}. ";
    }

    /**
     * Format value for display
     */
    private function formatValueForDisplay(string $field, $value): string
    {
        if (is_null($value)) {
            return 'Not set';
        }

        if (is_array($value)) {
            return json_encode($value);
        }

        if (is_bool($value)) {
            return $value ? 'Yes' : 'No';
        }

        // Handle timestamp/datetime fields
        if (str_contains($field, '_at') || str_contains($field, 'date')) {
            return $value ? date('M j, Y g:i A', strtotime($value)) : 'Not set';
        }

        // Handle relationship fields
        if (str_ends_with($field, '_id')) {
            $model = match ($field) {
                'service_id' => \App\Models\Service::find($value),
                'lead_source_id' => \App\Models\LeadSource::find($value),
                'assigned_to' => \App\Models\User::find($value),
                default => null
            };

            return $model?->name ?? "ID: {$value}";
        }

        // Handle special field formatting
        if ($field === 'priority') {
            $priorities = Lead::getPriorityOptions();
            return $priorities[$value] ?? $value;
        }

        if ($field === 'inquiry_type') {
            $types = Lead::getInquiryTypeOptions();
            return $types[$value] ?? $value;
        }

        return (string)$value;
    }

    /**
     * Get display name for field
     */
    private function getFieldDisplayName(string $field): string
    {
        $fieldNames = [
            'name' => 'Name',
            'email' => 'Email',
            'phone' => 'Phone',
            'occupation' => 'Occupation',
            'address' => 'Address',
            'country' => 'Country',
            'city' => 'City',
            'service_id' => 'Service',
            'lead_source_id' => 'Lead Source',
            'detail' => 'Details',
            'budget' => 'Budget',
            'custom_fields' => 'Custom Fields',
            'inquiry_status' => 'Status',
            'priority' => 'Priority',
            'inquiry_type' => 'Inquiry Type',
            'inquiry_country' => 'Inquiry Country',
            'assigned_to' => 'Assigned To',
            'ticket_id' => 'Ticket ID',
            'next_follow_up_at' => 'Next Follow Up',
            'latitude' => 'Latitude',
            'longitude' => 'Longitude',
        ];

        return $fieldNames[$field] ?? ucwords(str_replace('_', ' ', $field));
    }
}
