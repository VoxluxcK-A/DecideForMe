<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['category_id', 'name', 'description', 'is_favorite', 'is_excluded'])]
class DecisionOption extends Model
{
    protected function casts(): array
    {
        return [
            'is_favorite' => 'boolean',
            'is_excluded' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function histories(): HasMany
    {
        return $this->hasMany(DecisionHistory::class, 'selected_option_id');
    }
}
