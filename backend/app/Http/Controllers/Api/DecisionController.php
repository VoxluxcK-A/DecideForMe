<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RandomDecisionRequest;
use App\Models\DecisionHistory;
use App\Models\DecisionOption;
use App\Services\DecisionReasonException;
use App\Services\DecisionReasonService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DecisionController extends Controller
{
    public function random(RandomDecisionRequest $request): JsonResponse
    {
        $user = $request->user();
        $favoritesOnly = $request->boolean('favorites_only');
        $category = null;

        if ($favoritesOnly) {
            $options = DecisionOption::query()
                ->whereHas('category', fn ($query) => $query->where('user_id', $user->id))
                ->where('is_favorite', true)
                ->where('is_excluded', false);
        } else {
            if ($request->filled('category_id')) {
                $category = $user->categories()->findOrFail($request->integer('category_id'));
                $options = $category->options()->where('is_excluded', false);
            } else {
                $options = DecisionOption::query()
                    ->whereHas('category', fn ($query) => $query->where('user_id', $user->id))
                    ->where('is_excluded', false);
            }
        }

        $picked = $options->inRandomOrder()->first();
        if (! $picked) {
            return response()->json([
                'message' => $favoritesOnly
                    ? 'There are no available favorite options.'
                    : 'There are no available options in this category.',
            ], 422);
        }

        $picked->load('category:id,name');
        $history = DB::transaction(fn () => $user->decisionHistories()->create([
            'category_id' => $picked->category_id,
            'category_name' => $picked->category?->name ?? 'Uncategorized',
            'selected_option_id' => $picked->id,
            'selected_option_name' => $picked->name,
            'status' => 'pending',
        ]));

        return response()->json([
            'data' => [
                'option' => DashboardController::optionPayload($picked),
                'history' => DashboardController::historyPayload($history),
            ],
        ], 201);
    }

    public function replace(Request $request, DecisionHistory $history): JsonResponse
    {
        abort_unless($history->user_id === $request->user()->id, 404);

        $validated = $request->validate([
            'option_id' => ['required', 'integer', 'min:1'],
            'favorites_only' => ['required', 'boolean'],
        ]);

        $user = $request->user();
        $result = DB::transaction(function () use ($history, $user, $validated) {
            $options = DecisionOption::query()
                ->where('is_excluded', false)
                ->whereHas('category', fn ($query) => $query->where('user_id', $user->id));

            if ($validated['favorites_only']) {
                $options->where('is_favorite', true);
            } else {
                $options->where('category_id', $history->category_id);
            }

            $option = $options->lockForUpdate()->find($validated['option_id']);
            if (! $option || $option->id === $history->selected_option_id) {
                abort(422, 'Choose another available option.');
            }

            $option->load('category:id,name');
            $history->refresh();
            if ($history->status === 'pending') {
                $history->update(['status' => 'skipped']);
            }

            $newHistory = $user->decisionHistories()->create([
                'category_id' => $option->category_id,
                'category_name' => $option->category?->name ?? 'Uncategorized',
                'selected_option_id' => $option->id,
                'selected_option_name' => $option->name,
                'status' => 'pending',
            ]);

            return [
                'option' => $option,
                'history' => $newHistory,
                'replaced_history' => $history->fresh(),
            ];
        });

        return response()->json([
            'data' => [
                'option' => DashboardController::optionPayload($result['option']),
                'history' => DashboardController::historyPayload($result['history']),
                'replacedHistory' => DashboardController::historyPayload($result['replaced_history']),
            ],
        ], 201);
    }

    public function history(Request $request): JsonResponse
    {
        $query = $request->user()->decisionHistories()->latest();

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->query('category_id'));
        }
        if ($request->filled('status')) {
            $request->validate(['status' => ['in:pending,completed,skipped']]);
            $query->where('status', $request->query('status'));
        }
        if ($search = trim((string) $request->query('search', ''))) {
            $term = '%'.mb_strtolower($search).'%';
            $query->where(fn ($builder) => $builder
                ->whereRaw('LOWER(selected_option_name) LIKE ?', [$term])
                ->orWhereRaw('LOWER(category_name) LIKE ?', [$term]));
        }

        $history = $query->paginate(min(max((int) $request->query('per_page', 50), 1), 100));

        return response()->json([
            'data' => $history->getCollection()->map(fn (DecisionHistory $entry) => DashboardController::historyPayload($entry)),
            'meta' => [
                'currentPage' => $history->currentPage(),
                'lastPage' => $history->lastPage(),
                'perPage' => $history->perPage(),
                'total' => $history->total(),
            ],
        ]);
    }

    public function updateHistory(Request $request, DecisionHistory $history): JsonResponse
    {
        abort_unless($history->user_id === $request->user()->id, 404);
        $validated = $request->validate(['status' => ['required', 'in:pending,completed,skipped']]);
        $history->update($validated);

        return response()->json(['data' => DashboardController::historyPayload($history->refresh())]);
    }

    public function explain(Request $request, DecisionHistory $history, DecisionReasonService $reasonService): JsonResponse
    {
        abort_unless($history->user_id === $request->user()->id, 404);
        $validated = $request->validate([
            'situation' => ['nullable', 'string', 'max:300'],
        ]);

        try {
            $reason = $reasonService->generate(
                $history->category_name,
                $history->selected_option_name,
                trim($validated['situation'] ?? ''),
            );
        } catch (DecisionReasonException $exception) {
            return response()->json(['message' => $exception->getMessage()], $exception->statusCode);
        }

        $history->update(['ai_reason' => $reason]);

        return response()->json([
            'data' => DashboardController::historyPayload($history->refresh()),
        ]);
    }

    public function deleteHistory(Request $request, DecisionHistory $history): JsonResponse
    {
        abort_unless($history->user_id === $request->user()->id, 404);
        $history->delete();

        return response()->json(['message' => 'History entry deleted.']);
    }

    public function clearHistory(Request $request): JsonResponse
    {
        $request->user()->decisionHistories()->delete();

        return response()->json(['message' => 'Decision history cleared.']);
    }
}
