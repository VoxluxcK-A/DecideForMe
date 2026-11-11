<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class PasswordResetController extends Controller
{
    private const RESET_LINK_MESSAGE = 'If an account exists for that email, reset instructions will be sent if email delivery is configured.';

    public function sendLink(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:254'],
        ]);

        try {
            $status = Password::sendResetLink($validated);
        } catch (TransportExceptionInterface $exception) {
            preg_match('/\b([245]\d{2})\b/', $exception->getMessage(), $matches);
            Log::error('Password reset email delivery failed.', [
                'exception' => $exception::class,
                'smtp_reply_code' => isset($matches[1]) ? (int) $matches[1] : null,
            ]);

            return response()->json([
                'message' => self::RESET_LINK_MESSAGE,
            ]);
        }

        if (! in_array($status, [Password::RESET_LINK_SENT, Password::RESET_THROTTLED, Password::INVALID_USER], true)) {
            return response()->json(['message' => 'The password reset email could not be sent. Please try again later.'], 503);
        }

        return response()->json([
            'message' => self::RESET_LINK_MESSAGE,
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email', 'max:254'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        $status = Password::reset(
            $validated,
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'This password reset link is invalid or has expired. Request a new one.',
            ], 422);
        }

        return response()->json(['message' => 'Your password has been reset. You can now sign in.']);
    }
}
