<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsNotAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_if($request->user()?->isAdmin(), 403, 'This feature is only available to regular user accounts.');

        return $next($request);
    }
}
