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
use Illuminate\Support\Arr;
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

    /**
     * Returns canonical data as a nested array for PDF field resolution.
     * The Python forms service resolves canonical paths via nested traversal,
     * so flat dot-notation keys are expanded using Arr::set().
     *
     * Any ISO date value (YYYY-MM-DD) automatically generates three derived paths:
     *   {path}_day   → zero-padded day   (DD)
     *   {path}_month → zero-padded month (MM)
     *   {path}_year  → four-digit year   (YYYY)
     * This allows PDF field mappings to target individual date components
     * (e.g. A5_1 → main_applicant.dob_day) without storing them separately.
     */
    public function canonicalData(): array
    {
        $data = $this->data ?? [];

        // Backwards-compat aliases for data entered before canonical key rename
        $aliases = [
            'main_applicant.first_name' => 'main_applicant.given_name',
            'main_applicant.date_of_birth' => 'main_applicant.dob',
            'main_applicant.phone_number' => 'main_applicant.phone_mobile',
            'main_applicant.country_of_issue' => 'main_applicant.passport_1.country_of_issue',
        ];

        // Resolve aliases first so derived paths use the canonical key
        $resolved = [];
        foreach ($data as $path => $value) {
            $resolved[$aliases[$path] ?? $path] = $value;
        }

        // Auto-derive _day / _month / _year / _dmy (DD/MM/YYYY) from any ISO date (YYYY-MM-DD)
        $derived = [];
        foreach ($resolved as $path => $value) {
            if (is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
                [$year, $month, $day] = explode('-', $value);
                $derived["{$path}_day"] = $day;
                $derived["{$path}_month"] = $month;
                $derived["{$path}_year"] = $year;
                $derived["{$path}_dmy"] = "{$day}/{$month}/{$year}";
            }
        }

        $nested = [];
        foreach (array_merge($resolved, $derived) as $path => $value) {
            Arr::set($nested, $path, $value);
        }

        // Inject passport column under its canonical path (don't overwrite if already in data)
        if ($this->main_applicant_passport) {
            Arr::set($nested, 'main_applicant.passport_1.number',
                Arr::get($nested, 'main_applicant.passport_1.number') ?? $this->main_applicant_passport
            );
        }

        // D1 Part D declarations (D75–D91): default to "No" when not explicitly set.
        // The Python filler compares this string against each widget's on-state ("/Yes" or "/No"),
        // so supplying "No" selects the No checkbox for every unanswered declaration.
        for ($n = 75; $n <= 91; $n++) {
            $path = "main_applicant.declarations.d{$n}";
            if (! Arr::get($nested, $path)) {
                Arr::set($nested, $path, 'No');
            }
        }

        // D3 health questionnaire: all "No" checkboxes default to checked.
        // Each No box is mapped to this path with value_for_truthy = "Yes".
        Arr::set($nested, 'main_applicant.health_all_no', 'Yes');

        // Derive combined date_and_place_of_issue for each passport (used by D3)
        for ($n = 1; $n <= 2; $n++) {
            $date = trim((string) Arr::get($nested, "main_applicant.passport_{$n}.date_of_issue", ''));
            $place = trim((string) Arr::get($nested, "main_applicant.passport_{$n}.place_of_issue", ''));
            if ($date || $place) {
                $combined = implode(', ', array_filter([$date, $place]));
                Arr::set($nested, "main_applicant.passport_{$n}.date_and_place_of_issue", $combined);
            }
        }

        // Derive full_name from given_name + surname if not explicitly set
        if (! Arr::get($nested, 'main_applicant.full_name')) {
            $given = trim(Arr::get($nested, 'main_applicant.given_name', ''));
            $middle = trim(Arr::get($nested, 'main_applicant.middle_name', ''));
            $surname = trim(Arr::get($nested, 'main_applicant.surname', ''));
            $parts = array_filter([$given, $middle, $surname]);
            if ($parts) {
                Arr::set($nested, 'main_applicant.full_name', implode(' ', $parts));
            }
        }

        // Derive gender flags for checkbox/radio fields across all templates
        $gender = Arr::get($nested, 'main_applicant.gender');
        if ($gender === 'Male') {
            Arr::set($nested, 'main_applicant.gender_is_male', 'Yes');
            // D1 A6 radio group: Male child exports "Yes", Female child exports "No"
            Arr::set($nested, 'main_applicant.gender_yes_no', 'Yes');
        } elseif ($gender === 'Female') {
            Arr::set($nested, 'main_applicant.gender_is_female', 'Yes');
            // D1 A6 radio group: Female child exports "No"
            Arr::set($nested, 'main_applicant.gender_yes_no', 'No');
        }

        // Derive spouse full_name and relationship for D4 family table
        $spouseGiven = trim((string) Arr::get($nested, 'main_applicant.spouse.given_names', ''));
        $spouseSurname = trim((string) Arr::get($nested, 'main_applicant.spouse.surname', ''));
        if ($spouseGiven || $spouseSurname) {
            if (! Arr::get($nested, 'main_applicant.spouse.full_name')) {
                Arr::set($nested, 'main_applicant.spouse.full_name', trim("{$spouseGiven} {$spouseSurname}"));
            }
            if (! Arr::get($nested, 'main_applicant.spouse.relationship')) {
                Arr::set($nested, 'main_applicant.spouse.relationship', 'Spouse');
            }
        }

        // Derive child_N full_name and relationship for D4 family table
        for ($n = 1; $n <= 6; $n++) {
            $childGiven = trim((string) Arr::get($nested, "main_applicant.child_{$n}.given_names", ''));
            $childSurname = trim((string) Arr::get($nested, "main_applicant.child_{$n}.surname", ''));
            if ($childGiven || $childSurname) {
                if (! Arr::get($nested, "main_applicant.child_{$n}.full_name")) {
                    Arr::set($nested, "main_applicant.child_{$n}.full_name", trim("{$childGiven} {$childSurname}"));
                }
                if (! Arr::get($nested, "main_applicant.child_{$n}.relationship")) {
                    Arr::set($nested, "main_applicant.child_{$n}.relationship", 'Dependent Child');
                }
            }
        }

        return $nested;
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
