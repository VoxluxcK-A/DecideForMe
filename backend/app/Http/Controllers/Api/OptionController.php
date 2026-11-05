<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOptionRequest;
use App\Http\Requests\UpdateOptionRequest;
use App\Models\Category;
use App\Models\DecisionOption;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class OptionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', DecisionOption::class);
        $query = DecisionOption::query()
            ->whereHas('category', fn ($builder) => $builder->where('user_id', $request->user()->id))
            ->with('category:id,name');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->query('category_id'));
        }
        if ($request->boolean('favorites_only')) {
            $query->where('is_favorite', true);
        }
        if ($search = trim((string) $request->query('search', ''))) {
            $this->applySearch($query, $search);
        }

        $sort = $request->query('sort') === 'alphabetical' ? 'name' : 'created_at';
        $page = $query->orderBy($sort, $sort === 'name' ? 'asc' : 'desc')
            ->paginate($this->pageSize($request));

        return $this->paginatedOptions($page);
    }

    public function categoryIndex(Request $request, Category $category): JsonResponse
    {
        Gate::authorize('view', $category);
        $query = DecisionOption::query()
            ->where('category_id', $category->id)
            ->with('category:id,name');
        if ($search = trim((string) $request->query('search', ''))) {
            $this->applySearch($query, $search);
        }

        $sort = $request->query('sort') === 'alphabetical' ? 'name' : 'created_at';
        $page = $query->orderBy($sort, $sort === 'name' ? 'asc' : 'desc')
            ->paginate($this->pageSize($request));

        return $this->paginatedOptions($page);
    }

    public function store(StoreOptionRequest $request, Category $category): JsonResponse
    {
        Gate::authorize('view', $category);
        Gate::authorize('create', DecisionOption::class);
        $option = $category->options()->create($request->validated());
        $option->load('category:id,name');

        return response()->json(['data' => DashboardController::optionPayload($option)], 201);
    }

    public function update(UpdateOptionRequest $request, DecisionOption $option): JsonResponse
    {
        Gate::authorize('update', $option);
        $option->update($request->validated());
        $option->load('category:id,name');

        return response()->json(['data' => DashboardController::optionPayload($option->refresh())]);
    }

    public function updateFlags(Request $request, DecisionOption $option): JsonResponse
    {
        Gate::authorize('update', $option);
        $validated = $request->validate([
            'is_favorite' => ['sometimes', 'boolean'],
            'is_excluded' => ['sometimes', 'boolean'],
        ]);
        if ($validated === []) {
            return response()->json(['message' => 'At least one option flag is required.'], 422);
        }

        $option->update($validated);
        $option->load('category:id,name');

        return response()->json(['data' => DashboardController::optionPayload($option->refresh())]);
    }

    public function favorites(Request $request): JsonResponse
    {
        $page = DecisionOption::query()
            ->whereHas('category', fn ($query) => $query->where('user_id', $request->user()->id))
            ->where('is_favorite', true)
            ->with('category:id,name')
            ->orderBy('name')
            ->paginate($this->pageSize($request));

        return $this->paginatedOptions($page);
    }

    public function addFavorite(DecisionOption $option): JsonResponse
    {
        return $this->setFavorite($option, true);
    }

    public function removeFavorite(DecisionOption $option): JsonResponse
    {
        return $this->setFavorite($option, false);
    }

    public function destroy(DecisionOption $option): JsonResponse
    {
        Gate::authorize('delete', $option);
        $option->delete();

        return response()->json(['message' => 'Option deleted.']);
    }

    private function setFavorite(DecisionOption $option, bool $isFavorite): JsonResponse
    {
        Gate::authorize('update', $option);
        $option->update(['is_favorite' => $isFavorite]);
        $option->load('category:id,name');

        return response()->json(['data' => DashboardController::optionPayload($option->refresh())]);
    }

    private function applySearch(Builder $query, string $search): void
    {
        $term = '%'.mb_strtolower($search).'%';
        $query->where(fn ($builder) => $builder
            ->whereRaw('LOWER(name) LIKE ?', [$term])
            ->orWhereRaw('LOWER(description) LIKE ?', [$term]));
    }

    private function pageSize(Request $request): int
    {
        return min(max((int) $request->query('per_page', 50), 1), 100);
    }

    private function paginatedOptions(LengthAwarePaginator $page): JsonResponse
    {
        return response()->json([
            'data' => $page->getCollection()->map(fn (DecisionOption $option) => DashboardController::optionPayload($option)),
            'meta' => [
                'currentPage' => $page->currentPage(),
                'lastPage' => $page->lastPage(),
                'perPage' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }
}
