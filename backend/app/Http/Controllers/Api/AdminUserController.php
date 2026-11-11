<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query()->orderByDesc('created_at');

        if ($search = trim((string) $request->query('search', ''))) {
            $term = '%'.mb_strtolower($search).'%';
            $query->where(fn ($builder) => $builder
                ->whereRaw('LOWER(name) LIKE ?', [$term])
                ->orWhereRaw('LOWER(email) LIKE ?', [$term]));
        }

        $users = $query->paginate(min(max((int) $request->query('per_page', 50), 1), 100));

        return response()->json([
            'data' => $users->getCollection()->map(fn (User $user) => $this->userPayload($user)),
            'meta' => [
                'currentPage' => $users->currentPage(),
                'lastPage' => $users->lastPage(),
                'perPage' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        abort_if($user->isAdmin(), 422, 'Administrator accounts cannot be deactivated from user management.');

        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $user->forceFill($validated)->save();

        return response()->json(['data' => $this->userPayload($user->refresh())]);
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'isActive' => $user->is_active,
            'createdAt' => $user->created_at?->toISOString(),
        ];
    }
}
