<?php

use Illuminate\Support\Facades\Route;

Route::get('/{path?}', function () {
    $application = public_path('app/index.html');

    abort_unless(is_file($application), 503, 'The React application has not been built. Run npm run build from the project root.');

    return response()->file($application);
})->where('path', '^(?!api(?:/|$)|sanctum(?:/|$)).*$');
