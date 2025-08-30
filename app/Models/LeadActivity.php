<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class LeadActivity extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'lead_id',
        'user_id',
        'type',
        'status',
        'subject',
        'description',
        'metadata',
        'scheduled_at',
        'completed_at',
        'due_at',
        'priority',
        'category',
        'duration_minutes',
        'cost',
        'outcome',
        'notes',
        'attachments',
        'external_id',
        'source_system',
    ];

    protected $casts = [
        'metadata' => 'array',
        'attachments' => 'array',
        'scheduled_at' => 'datetime',
        'completed_at' => 'datetime',
        'due_at' => 'datetime',
        'cost' => 'decimal:2',
        'duration_minutes' => 'integer',
    ];

    protected $attributes = [
        'status' => 'pending',
        'priority' => 'medium',
    ];

    // Boot method for automatic status updates
    protected static function boot(): void
    {
        parent::boot();

        static::saving(function ($activity) {
            // Auto-mark as overdue if due date has passed
            if ($activity->status === 'pending' &&
                $activity->due_at &&
                $activity->due_at->isPast()) {
                $activity->status = 'overdue';
            }
        });

        static::created(function ($activity) {
            // Update lead's pending activities count
            $activity->lead->increment('pending_activities_count');
        });

        static::updated(function ($activity) {
            // Update lead's pending activities count when status changes
            if ($activity->isDirty('status')) {
                $oldStatus = $activity->getOriginal('status');
                $newStatus = $activity->status;

                if ($oldStatus === 'pending' && $newStatus !== 'pending') {
                    $activity->lead->decrement('pending_activities_count');
                } elseif ($oldStatus !== 'pending' && $newStatus === 'pending') {
                    $activity->lead->increment('pending_activities_count');
                }
            }
        });
    }

    // Relationships
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeOverdue($query)
    {
        return $query->where('status', 'pending')
            ->where('due_at', '<', now())
            ->whereNotNull('due_at');
    }

    public function scopeDueToday($query)
    {
        return $query->whereDate('due_at', today())
            ->where('status', 'pending');
    }

    public function scopeScheduledToday($query)
    {
        return $query->whereDate('scheduled_at', today());
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeByPriority($query, $priority)
    {
        return $query->where('priority', $priority);
    }

    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeUpcoming($query, $days = 7)
    {
        return $query->where('scheduled_at', '>=', now())
            ->where('scheduled_at', '<=', now()->addDays($days))
            ->where('status', 'pending');
    }

    public function scopeRecent($query, $days = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    public function scopeWithDuration($query)
    {
        return $query->whereNotNull('duration_minutes');
    }

    // Accessors
    public function getIsOverdueAttribute(): bool
    {
        return $this->status === 'pending' &&
            $this->due_at &&
            $this->due_at->isPast();
    }

    public function getIsCompletedAttribute(): bool
    {
        return $this->status === 'completed';
    }

    public function getIsPendingAttribute(): bool
    {
        return $this->status === 'pending';
    }

    public function getIsUrgentAttribute(): bool
    {
        return $this->priority === 'urgent';
    }

    public function getStatusColorAttribute(): string
    {
        return match($this->status) {
            'pending' => 'yellow',
            'completed' => 'green',
            'overdue' => 'red',
            default => 'gray'
        };
    }

    public function getPriorityColorAttribute(): string
    {
        return match($this->priority) {
            'medium' => 'blue',
            'high' => 'orange',
            'urgent' => 'red',
            default => 'gray'
        };
    }

    public function getFormattedDurationAttribute(): ?string
    {
        if (!$this->duration_minutes) {
            return null;
        }

        $hours = intval($this->duration_minutes / 60);
        $minutes = $this->duration_minutes % 60;

        if ($hours > 0) {
            return $hours . 'h ' . ($minutes > 0 ? $minutes . 'm' : '');
        }

        return $minutes . 'm';
    }

    public function getTimeUntilDueAttribute(): ?string
    {
        if (!$this->due_at) {
            return null;
        }

        return $this->due_at->diffForHumans();
    }

    public function getTimeUntilScheduledAttribute(): ?string
    {
        if (!$this->scheduled_at) {
            return null;
        }

        return $this->scheduled_at->diffForHumans();
    }

    // Methods
    public function markAsCompleted($notes = null, $outcome = null): static
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => now(),
            'notes' => $notes ?: $this->notes,
            'outcome' => $outcome ?: $this->outcome,
        ]);

        // Update lead's last activity
        $this->lead->touch('last_activity_at');

        return $this;
    }

    public function markAsCancelled($reason = null): static
    {
        $this->update([
            'status' => 'cancelled',
            'notes' => $reason ? $this->notes . "\n\nCancellation reason: " . $reason : $this->notes,
        ]);

        return $this;
    }

    public function reschedule(Carbon $newDateTime): static
    {
        $this->update([
            'scheduled_at' => $newDateTime,
            'status' => 'pending',
        ]);

        return $this;
    }

    public function addNote($note): static
    {
        $this->update([
            'notes' => $this->notes ? $this->notes . "\n\n" . $note : $note,
        ]);

        return $this;
    }

    public function setDuration($minutes): static
    {
        $this->update(['duration_minutes' => $minutes]);

        return $this;
    }

    public function setCost($cost): static
    {
        $this->update(['cost' => $cost]);

        return $this;
    }

    public function attachFile($filepath, $filename = null): static
    {
        $attachments = $this->attachments ?: [];
        $attachments[] = [
            'filepath' => $filepath,
            'filename' => $filename ?: basename($filepath),
            'uploaded_at' => now()->toISOString(),
        ];

        $this->update(['attachments' => $attachments]);

        return $this;
    }

    // Static methods
    public static function getTypeOptions(): array
    {
        return [
            'call' => 'Phone Call',
            'email' => 'Email',
            'meeting' => 'Meeting',
            'note' => 'Note',
            'task' => 'Task',
            'follow_up' => 'Follow Up',
            'status_change' => 'Status Change',
            'assignment_change' => 'Assignment Change',
        ];
    }

    public static function getStatusOptions(): array
    {
        return [
            'pending' => 'Pending',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled',
            'overdue' => 'Overdue',
        ];
    }

    public static function getPriorityOptions(): array
    {
        return [
            'low' => 'Low',
            'medium' => 'Medium',
            'high' => 'High',
            'urgent' => 'Urgent',
        ];
    }

    public static function getOutcomeOptions(): array
    {
        return [
            'successful' => 'Successful',
            'no_answer' => 'No Answer',
            'busy' => 'Busy',
            'not_interested' => 'Not Interested',
            'callback_requested' => 'Callback Requested',
            'information_sent' => 'Information Sent',
            'meeting_scheduled' => 'Meeting Scheduled',
        ];
    }

    public static function getTodaysActivities($userId = null)
    {
        $query = static::scheduledToday()
            ->with(['lead', 'user'])
            ->orderBy('scheduled_at');

        if ($userId) {
            $query->byUser($userId);
        }

        return $query->get();
    }

    public static function getOverdueActivities($userId = null)
    {
        $query = static::overdue()
            ->with(['lead', 'user'])
            ->orderBy('due_at');

        if ($userId) {
            $query->byUser($userId);
        }

        return $query->get();
    }

    public static function getUpcomingActivities($userId = null, $days = 7)
    {
        $query = static::upcoming($days)
            ->with(['lead', 'user'])
            ->orderBy('scheduled_at');

        if ($userId) {
            $query->byUser($userId);
        }

        return $query->get();
    }

    public static function createCall($leadId, $userId, $subject, $scheduledAt = null)
    {
        return static::create([
            'lead_id' => $leadId,
            'user_id' => $userId,
            'type' => 'call',
            'subject' => $subject,
            'scheduled_at' => $scheduledAt ?: now(),
            'due_at' => $scheduledAt ? $scheduledAt->addHour() : now()->addHour(),
        ]);
    }

    public static function createFollowUp($leadId, $userId, $subject, $scheduledAt)
    {
        return static::create([
            'lead_id' => $leadId,
            'user_id' => $userId,
            'type' => 'follow_up',
            'subject' => $subject,
            'scheduled_at' => $scheduledAt,
            'due_at' => $scheduledAt->addHours(2),
        ]);
    }

    public static function createNote($leadId, $userId, $subject, $description)
    {
        return static::create([
            'lead_id' => $leadId,
            'user_id' => $userId,
            'type' => 'note',
            'subject' => $subject,
            'description' => $description,
            'status' => 'completed',
            'completed_at' => now(),
        ]);
    }

    public static function createMeeting($leadId, $userId, $subject, $scheduledAt, $durationMinutes = 60)
    {
        return static::create([
            'lead_id' => $leadId,
            'user_id' => $userId,
            'type' => 'meeting',
            'subject' => $subject,
            'scheduled_at' => $scheduledAt,
            'due_at' => $scheduledAt->addMinutes($durationMinutes),
            'duration_minutes' => $durationMinutes,
        ]);
    }
}
