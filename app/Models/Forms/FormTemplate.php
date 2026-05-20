<?php

namespace App\Models\Forms;

use App\Enums\Forms\FileType;
use App\Enums\Forms\MappingMode;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FormTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'program_id',
        'code',
        'name',
        'file_path',
        'file_type',
        'file_hash',
        'mapping_mode',
        'page_count',
        'field_count',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'file_type' => FileType::class,
            'mapping_mode' => MappingMode::class,
            'is_active' => 'boolean',
        ];
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    public function templateFields(): HasMany
    {
        return $this->hasMany(TemplateField::class);
    }

    public function fieldMappings(): HasMany
    {
        return $this->hasMany(FieldMapping::class);
    }

    public function activeMappings(): HasMany
    {
        return $this->hasMany(FieldMapping::class);
    }
}
