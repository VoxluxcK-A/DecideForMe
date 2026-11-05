<?php

namespace App\Policies;

use App\Models\DecisionOption;
use App\Models\User;

class DecisionOptionPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, DecisionOption $option): bool
    {
        return $user->id === $option->category->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, DecisionOption $option): bool
    {
        return $user->id === $option->category->user_id;
    }

    public function delete(User $user, DecisionOption $option): bool
    {
        return $user->id === $option->category->user_id;
    }
}
