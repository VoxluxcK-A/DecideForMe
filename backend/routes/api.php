<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DecisionController;
use App\Http\Controllers\Api\OptionController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:6,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/dashboard', DashboardController::class);

    Route::apiResource('categories', CategoryController::class);
    Route::get('/options', [OptionController::class, 'index']);
    Route::put('/options/{option}', [OptionController::class, 'update']);
    Route::patch('/options/{option}', [OptionController::class, 'updateFlags']);
    Route::delete('/options/{option}', [OptionController::class, 'destroy']);
    Route::get('/categories/{category}/options', [OptionController::class, 'categoryIndex']);
    Route::post('/categories/{category}/options', [OptionController::class, 'store']);

    Route::get('/favorites', [OptionController::class, 'favorites']);
    Route::post('/favorites/{option}', [OptionController::class, 'addFavorite']);
    Route::delete('/favorites/{option}', [OptionController::class, 'removeFavorite']);

    Route::post('/decisions/random', [DecisionController::class, 'random'])->middleware('throttle:30,1');
    Route::get('/decisions/history', [DecisionController::class, 'history']);
    Route::delete('/decisions/history', [DecisionController::class, 'clearHistory']);
    Route::post('/decisions/history/{history}/reason', [DecisionController::class, 'explain'])
        ->middleware('throttle:10,1');
    Route::patch('/decisions/history/{history}', [DecisionController::class, 'updateHistory']);
    Route::delete('/decisions/history/{history}', [DecisionController::class, 'deleteHistory']);
});
