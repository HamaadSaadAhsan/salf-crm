<?php

namespace App\Models\Forms;

use App\Enums\Forms\ApplicationStatus;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class Application extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'program_id',
        'lead_id',
        'application_code',
        'main_applicant_name',
        'main_applicant_passport',
        'status',
        'data',
        'created_by_user_id',
        'assigned_to_user_id',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => ApplicationStatus::class,
            'data' => 'array',
            'submitted_at' => 'datetime',
        ];
    }

    public static function generateApplicationCode(): string
    {
        return DB::transaction(function () {
            $prefix = config('forms.application_code_prefix', 'APP');
            $yearCode = now()->format(config('forms.application_code_year_format', 'Y'));
            $pattern = "{$prefix}-{$yearCode}-%";

            $last = self::withTrashed()
                ->where('application_code', 'like', $pattern)
                ->lockForUpdate()
                ->orderByDesc('application_code')
                ->first();

            $sequence = $last
                ? (int) substr($last->application_code, strrpos($last->application_code, '-') + 1) + 1
                : 1;

            return sprintf('%s-%s-%05d', $prefix, $yearCode, $sequence);
        });
    }

    public function canonicalData(): array
    {
        return $this->data ?? [];
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_user_id');
    }

    public function generations(): HasMany
    {
        return $this->hasMany(ApplicationGeneration::class);
    }
}
