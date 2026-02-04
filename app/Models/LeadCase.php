<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadCase extends Model
{
    use HasFactory;

    protected $table = 'lead_cases';

    protected $fillable = [
        'lead_id',
        'advisor_id',
        'initial_payment_at',
        'initial_payment_amount',
        'documents_compiled_at',
        'govt_fee_paid_at',
        'due_diligence_status',
        'result',
        'post_approval_payment_at',
        'passport_delivered_at',
    ];

    protected $casts = [
        'initial_payment_at' => 'datetime',
        'documents_compiled_at' => 'datetime',
        'govt_fee_paid_at' => 'datetime',
        'post_approval_payment_at' => 'datetime',
        'passport_delivered_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function advisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'advisor_id');
    }
}

