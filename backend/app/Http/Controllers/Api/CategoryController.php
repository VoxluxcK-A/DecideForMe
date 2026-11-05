<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Category::class);
        $query = $request->user()->categories()->withCount('options');

        if ($search = trim((string) $request->query('search', ''))) {
            $term = '%'.mb_strtolower($search).'%';
            $query->where(fn ($builder) => $builder
                ->whereRaw('LOWER(name) LIKE ?', [$term])
                ->orWhereRaw('LOWER(description) LIKE ?', [$term]));
        }

        $order = $request->query('sort') === 'alphabetical' ? 'name' : 'created_at';
        $direction = $order === 'name' ? 'asc' : 'desc';
        $categories = $query->orderBy($order, $direction)
            ->paginate(min(max((int) $request->query('per_page', 50), 1), 100));

        return response()->json([
            'data' => $categories->getCollection()->map(fn (Category $category) => DashboardController::categoryPayload($category)),
            'meta' => [
                'currentPage' => $categories->currentPage(),
                'lastPage' => $categories->lastPage(),
                'perPage' => $categories->perPage(),
                'total' => $categories->total(),
            ],
        ]);
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        Gate::authorize('create', Category::class);
        $category = $request->user()->categories()->create($request->validated());
        $category->loadCount('options');

        return response()->json(['data' => DashboardController::categoryPayload($category)], 201);
    }

    public function show(Category $category): JsonResponse
    {
        Gate::authorize('view', $category);
        $category->loadCount('options');

        return response()->json(['data' => DashboardController::categoryPayload($category)]);
    }

    public function update(UpdateCategoryRequest $request, Category $category): JsonResponse
    {
        Gate::authorize('update', $category);
        $category->update($request->validated());
        $category->loadCount('options');

        return response()->json(['data' => DashboardController::categoryPayload($category->refresh())]);
    }

    public function destroy(Category $category): JsonResponse
    {
        Gate::authorize('delete', $category);
        $category->delete();

        return response()->json(['message' => 'Category deleted.']);
    }
}
