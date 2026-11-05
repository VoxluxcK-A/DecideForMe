<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'category_id',
    'category_name',
    'selected_option_id',
    'selected_option_name',
    'status',
    'ai_reason',
])]
class DecisionHistory extends Model
{
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function selectedOption(): BelongsTo
    {
        return $this->belongsTo(DecisionOption::class, 'selected_option_id');
    }
}
