<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\DecisionHistory;
use App\Models\DecisionOption;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $categories = Category::query()
            ->where('user_id', $user->id)
            ->withCount('options')
            ->orderBy('name')
            ->get()
            ->map(fn (Category $category) => $this->categoryPayload($category));

        $options = DecisionOption::query()
            ->whereHas('category', fn ($query) => $query->where('user_id', $user->id))
            ->with('category:id,name')
            ->latest()
            ->get()
            ->map(fn (DecisionOption $option) => $this->optionPayload($option));

        $history = DecisionHistory::query()
            ->where('user_id', $user->id)
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (DecisionHistory $entry) => $this->historyPayload($entry));

        return response()->json([
            'data' => [
                'version' => 1,
                'categories' => $categories,
                'options' => $options,
                'history' => $history,
            ],
            'stats' => [
                'categories' => $user->categories()->count(),
                'options' => DecisionOption::query()
                    ->whereHas('category', fn ($query) => $query->where('user_id', $user->id))
                    ->count(),
                'decisions' => $user->decisionHistories()->count(),
                'favorites' => DecisionOption::query()
                    ->whereHas('category', fn ($query) => $query->where('user_id', $user->id))
                    ->where('is_favorite', true)
                    ->count(),
            ],
        ]);
    }

    public static function categoryPayload(Category $category): array
    {
        return [
            'id' => (string) $category->id,
            'name' => $category->name,
            'description' => $category->description ?? '',
            'createdAt' => $category->created_at?->toISOString(),
            'updatedAt' => $category->updated_at?->toISOString(),
            'optionsCount' => $category->options_count ?? $category->options()->count(),
        ];
    }

    public static function optionPayload(DecisionOption $option): array
    {
        return [
            'id' => (string) $option->id,
            'categoryId' => (string) $option->category_id,
            'categoryName' => $option->category?->name,
            'name' => $option->name,
            'description' => $option->description ?? '',
            'isFavorite' => $option->is_favorite,
            'isExcluded' => $option->is_excluded,
            'createdAt' => $option->created_at?->toISOString(),
            'updatedAt' => $option->updated_at?->toISOString(),
        ];
    }

    public static function historyPayload(DecisionHistory $entry): array
    {
        return [
            'id' => (string) $entry->id,
            'categoryId' => $entry->category_id === null ? null : (string) $entry->category_id,
            'categoryName' => $entry->category_name,
            'selectedOptionId' => $entry->selected_option_id === null ? '' : (string) $entry->selected_option_id,
            'selectedOptionName' => $entry->selected_option_name,
            'status' => $entry->status,
            'createdAt' => $entry->created_at?->toISOString(),
            'aiReason' => $entry->ai_reason,
        ];
    }
}
