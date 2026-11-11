<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use App\Notifications\FrontendResetPasswordNotification;
use Illuminate\Console\Command;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class DecisionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_register_and_sign_in(): void
    {
        config([
            'sanctum.stateful' => array_unique([
                ...config('sanctum.stateful'),
                'localhost:3001',
            ]),
        ]);
        $this->withHeader('Origin', 'http://localhost:3001');
        $this->postJson('/api/register', [
            'name' => 'Taylor',
            'email' => 'taylor@example.test',
            'password' => 'correct-horse-battery',
            'password_confirmation' => 'correct-horse-battery',
            'role' => User::ROLE_ADMIN,
            'is_active' => false,
        ])->assertCreated()
            ->assertJsonPath('data.email', 'taylor@example.test')
            ->assertJsonPath('data.role', User::ROLE_USER)
            ->assertJsonPath('data.isActive', true);

        $this->postJson('/api/logout')->assertOk();
        $this->postJson('/api/login', [
            'email' => 'taylor@example.test',
            'password' => 'correct-horse-battery',
        ])->assertOk()->assertJsonPath('data.name', 'Taylor');
    }

    public function test_users_can_request_a_password_reset_without_disclosing_unknown_emails(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'taylor@example.test']);

        $response = $this->postJson('/api/password/forgot', ['email' => $user->email])
            ->assertOk()
            ->assertJsonPath('message', 'If an account exists for that email, reset instructions will be sent if email delivery is configured.');
        Notification::assertSentTo($user, FrontendResetPasswordNotification::class);

        $notification = Notification::sent($user, FrontendResetPasswordNotification::class)->first();
        $this->assertNotNull($notification);
        $this->assertStringContainsString('/reset-password?token=', $notification->toMail($user)->actionUrl);
        $this->assertStringContainsString('email='.rawurlencode($user->email), $notification->toMail($user)->actionUrl);

        $this->postJson('/api/password/forgot', ['email' => $user->email])
            ->assertOk()
            ->assertExactJson($response->json());
        $this->postJson('/api/password/forgot', ['email' => 'unknown@example.test'])
            ->assertOk()
            ->assertExactJson($response->json());
    }

    public function test_a_user_can_reset_their_password_with_a_valid_email_token_pair(): void
    {
        Notification::fake();
        $user = User::factory()->create(['password' => 'old-password-value']);
        $this->postJson('/api/password/forgot', ['email' => $user->email])->assertOk();
        $notification = Notification::sent($user, FrontendResetPasswordNotification::class)->first();
        $this->assertNotNull($notification);

        $this->postJson('/api/password/reset', [
            'email' => $user->email,
            'token' => $notification->token,
            'password' => 'new-secure-password',
            'password_confirmation' => 'new-secure-password',
        ])->assertOk()
            ->assertJsonPath('message', 'Your password has been reset. You can now sign in.');

        config([
            'sanctum.stateful' => array_unique([
                ...config('sanctum.stateful'),
                'localhost:3001',
            ]),
        ]);
        $this->withHeader('Origin', 'http://localhost:3001');
        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'new-secure-password',
        ])->assertOk();
        $invalidTokenResponse = $this->postJson('/api/password/reset', [
            'email' => $user->email,
            'token' => 'invalid-token',
            'password' => 'another-secure-password',
            'password_confirmation' => 'another-secure-password',
        ])->assertUnprocessable();
        $this->postJson('/api/password/reset', [
            'email' => 'unknown@example.test',
            'token' => 'invalid-token',
            'password' => 'another-secure-password',
            'password_confirmation' => 'another-secure-password',
        ])->assertUnprocessable()
            ->assertExactJson($invalidTokenResponse->json());
    }

    public function test_only_administrators_can_view_and_update_user_accounts(): void
    {
        $admin = $this->createAdmin();
        $target = User::factory()->create(['name' => 'Taylor']);
        $ordinaryUser = User::factory()->create();

        $this->actingAs($ordinaryUser)
            ->getJson('/api/admin/users')
            ->assertForbidden();

        $this->actingAs($admin);
        $this->getJson('/api/admin/users?search=taylor')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.role', User::ROLE_USER)
            ->assertJsonPath('data.0.isActive', true)
            ->assertJsonMissingPath('data.0.password');
        $this->patchJson('/api/admin/users/'.$target->id.'/status', ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.isActive', false);

        $this->assertDatabaseHas('users', ['id' => $target->id, 'is_active' => false]);
        $this->actingAs($target->fresh())->getJson('/api/dashboard')->assertForbidden();

        config([
            'sanctum.stateful' => array_unique([
                ...config('sanctum.stateful'),
                'localhost:3001',
            ]),
        ]);
        $this->withHeader('Origin', 'http://localhost:3001');
        $this->actingAs($target->fresh())->postJson('/api/logout')->assertOk();
        $this->postJson('/api/login', [
            'email' => $target->email,
            'password' => 'password',
        ])->assertForbidden()
            ->assertJsonPath('message', 'This account has been deactivated. Contact an administrator.');
    }

    public function test_an_existing_account_can_be_promoted_to_admin_by_the_server_command(): void
    {
        $user = User::factory()->create();

        $this->artisan('app:promote-admin', ['email' => $user->email])
            ->expectsConfirmation("Promote {$user->email} to administrator?", 'yes')
            ->assertExitCode(Command::SUCCESS);

        $this->assertDatabaseHas('users', ['id' => $user->id, 'role' => User::ROLE_ADMIN]);
    }

    public function test_administrators_cannot_deactivate_admin_accounts(): void
    {
        $admin = $this->createAdmin();
        $anotherAdmin = $this->createAdmin();

        $this->actingAs($admin)
            ->patchJson('/api/admin/users/'.$anotherAdmin->id.'/status', ['is_active' => false])
            ->assertUnprocessable();
        $this->assertDatabaseHas('users', ['id' => $anotherAdmin->id, 'is_active' => true]);
    }

    public function test_administrators_are_limited_to_account_management(): void
    {
        $admin = $this->createAdmin();

        $this->actingAs($admin)
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.isAdmin', true);

        $this->getJson('/api/dashboard')->assertForbidden();
        $this->getJson('/api/categories')->assertForbidden();
        $this->getJson('/api/options')->assertForbidden();
        $this->postJson('/api/decisions/random')->assertForbidden();
        $this->getJson('/api/admin/users')->assertOk();
    }

    public function test_a_user_can_manage_categories_options_favorites_and_history(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $category = $this->postJson('/api/categories', [
            'name' => 'Lunch',
            'description' => 'Weekday meals',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Lunch')
            ->json('data');
        $this->getJson('/api/categories?search=lunch')
            ->assertOk()->assertJsonPath('meta.total', 1);

        $noodles = $this->postJson('/api/categories/'.$category['id'].'/options', [
            'name' => 'Noodles',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Noodles')
            ->assertJsonPath('data.description', '')
            ->json('data');

        $option = $this->postJson('/api/categories/'.$category['id'].'/options', [
            'name' => 'Sushi',
        ])->assertCreated()->assertJsonPath('data.categoryName', 'Lunch')
            ->json('data');

        $this->postJson('/api/categories/'.$category['id'].'/options', ['name' => 'Sushi'])
            ->assertUnprocessable();
        $this->getJson('/api/options?search=noodles&category_id='.$category['id'])
            ->assertOk()->assertJsonPath('meta.total', 1);
        $this->getJson('/api/categories/'.$category['id'].'/options?search=noodles')
            ->assertOk()->assertJsonPath('data.0.name', 'Noodles');
        $this->patchJson('/api/options/'.$option['id'], ['is_excluded' => true])
            ->assertOk()->assertJsonPath('data.isExcluded', true);
        $this->postJson('/api/favorites/'.$option['id'])
            ->assertOk()->assertJsonPath('data.isFavorite', true);

        $this->putJson('/api/categories/'.$category['id'], [
            'name' => 'Dinner',
            'description' => 'Evening meals',
        ])->assertOk()->assertJsonPath('data.name', 'Dinner');

        $this->putJson('/api/options/'.$option['id'], [
            'category_id' => $category['id'],
            'name' => 'Maki',
            'description' => 'Rolled sushi',
        ])->assertOk()->assertJsonPath('data.name', 'Maki');

        $this->deleteJson('/api/favorites/'.$option['id'])
            ->assertOk()->assertJsonPath('data.isFavorite', false);
        $this->patchJson('/api/options/'.$option['id'], ['is_excluded' => false])
            ->assertOk()->assertJsonPath('data.isExcluded', false);
        $this->getJson('/api/favorites')->assertOk()->assertJsonPath('meta.total', 0);

        $decision = $this->postJson('/api/decisions/random', [
            'category_id' => $category['id'],
        ])->assertCreated()
            ->assertJsonPath('data.option.categoryName', 'Dinner')
            ->json('data');
        $this->assertContains($decision['option']['id'], [$option['id'], $noodles['id']]);
        $this->assertSame('pending', $decision['history']['status']);

        $this->patchJson('/api/decisions/history/'.$decision['history']['id'], [
            'status' => 'completed',
        ])->assertOk()->assertJsonPath('data.status', 'completed');
        $this->getJson('/api/decisions/history?search=dinner')
            ->assertOk()->assertJsonPath('data.0.status', 'completed');

        $this->deleteJson('/api/options/'.$option['id'])->assertOk();
        $this->deleteJson('/api/categories/'.$category['id'])->assertOk();
        $this->assertDatabaseHas('decision_histories', [
            'id' => $decision['history']['id'],
            'category_name' => 'Dinner',
            'selected_option_name' => $decision['option']['name'],
            'category_id' => null,
            'selected_option_id' => null,
        ]);
    }

    public function test_random_decisions_respect_exclusions_favorites_and_ownership(): void
    {
        $owner = User::factory()->create();
        $category = Category::query()->create(['user_id' => $owner->id, 'name' => 'Plans']);
        $excluded = $category->options()->create([
            'name' => 'Stay in',
            'is_excluded' => true,
        ]);
        $favorite = $category->options()->create([
            'name' => 'Take a walk',
            'is_favorite' => true,
        ]);

        $this->actingAs($owner)
            ->postJson('/api/decisions/random', ['category_id' => $category->id])
            ->assertCreated()
            ->assertJsonPath('data.option.id', (string) $favorite->id);
        $this->postJson('/api/decisions/random', ['favorites_only' => true])
            ->assertCreated()
            ->assertJsonPath('data.option.id', (string) $favorite->id);

        $otherUser = User::factory()->create();
        $this->actingAs($otherUser)
            ->getJson('/api/categories/'.$category->id)
            ->assertForbidden();
        $this->deleteJson('/api/options/'.$excluded->id)->assertForbidden();
    }

    public function test_a_user_can_choose_a_specific_alternative_to_a_random_decision(): void
    {
        $user = User::factory()->create();
        $category = Category::query()->create(['user_id' => $user->id, 'name' => 'Plans']);
        $first = $category->options()->create(['name' => 'Stay in']);
        $alternative = $category->options()->create(['name' => 'Take a walk']);
        $excluded = $category->options()->create(['name' => 'Go shopping', 'is_excluded' => true]);
        $this->actingAs($user);

        $initial = $this->postJson('/api/decisions/random', ['category_id' => $category->id])
            ->assertCreated()
            ->json('data');
        $alternativeId = $initial['option']['id'] === (string) $first->id ? $alternative->id : $first->id;

        $replacement = $this->postJson('/api/decisions/history/'.$initial['history']['id'].'/replace', [
            'option_id' => $alternativeId,
            'favorites_only' => false,
        ])->assertCreated()
            ->assertJsonPath('data.option.id', (string) $alternativeId)
            ->assertJsonPath('data.history.status', 'pending')
            ->assertJsonPath('data.replacedHistory.status', 'skipped')
            ->json('data');

        $this->assertDatabaseHas('decision_histories', [
            'id' => $initial['history']['id'],
            'status' => 'skipped',
        ]);
        $this->assertDatabaseHas('decision_histories', [
            'id' => $replacement['history']['id'],
            'selected_option_id' => $alternativeId,
            'status' => 'pending',
        ]);

        $this->postJson('/api/decisions/history/'.$replacement['history']['id'].'/replace', [
            'option_id' => $excluded->id,
            'favorites_only' => false,
        ])->assertUnprocessable();
    }

    public function test_empty_categories_and_duplicate_categories_are_rejected(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $category = Category::query()->create(['user_id' => $user->id, 'name' => 'Empty']);

        $this->postJson('/api/categories', ['name' => 'Empty'])->assertUnprocessable();
        $this->postJson('/api/decisions/random', ['category_id' => $category->id])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'There are no available options in this category.');
    }

    public function test_a_user_can_clear_decision_history(): void
    {
        $user = User::factory()->create();
        $category = Category::query()->create(['user_id' => $user->id, 'name' => 'Weekend']);
        $category->options()->create(['name' => 'Read a book']);
        $this->actingAs($user)
            ->postJson('/api/decisions/random', ['category_id' => $category->id])
            ->assertCreated();

        $this->deleteJson('/api/decisions/history')->assertOk();
        $this->assertDatabaseCount('decision_histories', 0);
        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.history', [])
            ->assertJsonPath('stats.decisions', 0);
    }

    public function test_a_user_can_mark_a_decision_completed_or_skipped(): void
    {
        $user = User::factory()->create();
        $history = $user->decisionHistories()->create([
            'category_name' => 'Plans',
            'selected_option_name' => 'Read',
            'status' => 'pending',
        ]);

        $this->actingAs($user)
            ->patchJson('/api/decisions/history/'.$history->id, ['status' => 'completed'])
            ->assertOk()
            ->assertJsonPath('data.status', 'completed');
        $this->patchJson('/api/decisions/history/'.$history->id, ['status' => 'skipped'])
            ->assertOk()
            ->assertJsonPath('data.status', 'skipped');
        $this->assertDatabaseHas('decision_histories', ['id' => $history->id, 'status' => 'skipped']);
    }

    public function test_protected_api_routes_reject_unauthenticated_requests_with_json(): void
    {
        $this->get('/api/dashboard')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_an_option_cannot_be_moved_to_another_users_category(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $ownedCategory = Category::query()->create(['user_id' => $owner->id, 'name' => 'Owned']);
        $otherCategory = Category::query()->create(['user_id' => $otherUser->id, 'name' => 'Private']);
        $option = $ownedCategory->options()->create(['name' => 'Existing option']);

        $this->actingAs($owner)
            ->putJson('/api/options/'.$option->id, [
                'category_id' => $otherCategory->id,
                'name' => 'Moved option',
            ])
            ->assertUnprocessable();
        $this->assertDatabaseHas('decision_options', [
            'id' => $option->id,
            'category_id' => $ownedCategory->id,
            'name' => 'Existing option',
        ]);
    }

    public function test_a_user_can_generate_and_persist_an_ai_reason_for_a_random_decision(): void
    {
        config([
            'services.gemini.api_key' => 'server-only-test-key',
            'services.gemini.model' => 'gemini-3.5-flash-lite',
        ]);
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    ['content' => ['parts' => [['text' => 'Pilihan ini mungkin cocok karena kamu mencari sesuatu yang mudah.']]]],
                ],
            ], 200),
        ]);

        $user = User::factory()->create();
        $category = Category::query()->create(['user_id' => $user->id, 'name' => 'Dinner']);
        $option = $category->options()->create(['name' => 'Soup']);
        $history = $user->decisionHistories()->create([
            'category_id' => $category->id,
            'category_name' => $category->name,
            'selected_option_id' => $option->id,
            'selected_option_name' => $option->name,
            'status' => 'pending',
        ]);

        $this->actingAs($user)
            ->postJson('/api/decisions/history/'.$history->id.'/reason', [
                'situation' => 'I want something easy after work',
            ])
            ->assertOk()
            ->assertJsonPath('data.aiReason', 'Pilihan ini mungkin cocok karena kamu mencari sesuatu yang mudah.');

        Http::assertSent(fn (ClientRequest $request) => $request->hasHeader('x-goog-api-key', 'server-only-test-key')
            && str_contains($request->url(), 'models/gemini-3.5-flash-lite:generateContent')
            && str_contains($request->body(), 'I want something easy after work'));
        $this->assertDatabaseHas('decision_histories', [
            'id' => $history->id,
            'ai_reason' => 'Pilihan ini mungkin cocok karena kamu mencari sesuatu yang mudah.',
        ]);
        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.history.0.aiReason', 'Pilihan ini mungkin cocok karena kamu mencari sesuatu yang mudah.');
    }

    public function test_ai_reason_reports_missing_configuration_without_sending_a_request(): void
    {
        config(['services.gemini.api_key' => null]);
        Http::fake();
        $user = User::factory()->create();
        $category = Category::query()->create(['user_id' => $user->id, 'name' => 'Plans']);
        $history = $user->decisionHistories()->create([
            'category_id' => $category->id,
            'category_name' => $category->name,
            'selected_option_name' => 'Read',
            'status' => 'pending',
        ]);

        $this->actingAs($user)
            ->postJson('/api/decisions/history/'.$history->id.'/reason')
            ->assertStatus(503)
            ->assertJsonPath('message', 'AI reasons are not configured. Add GEMINI_API_KEY to the server environment.');
        Http::assertNothingSent();
        $this->assertDatabaseHas('decision_histories', ['id' => $history->id, 'ai_reason' => null]);
    }

    public function test_ai_reason_is_private_to_the_history_owner_and_validates_context(): void
    {
        config(['services.gemini.api_key' => 'server-only-test-key']);
        Http::fake();
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $category = Category::query()->create(['user_id' => $owner->id, 'name' => 'Plans']);
        $history = $owner->decisionHistories()->create([
            'category_id' => $category->id,
            'category_name' => $category->name,
            'selected_option_name' => 'Read',
            'status' => 'pending',
        ]);

        $this->actingAs($otherUser)
            ->postJson('/api/decisions/history/'.$history->id.'/reason')
            ->assertNotFound();
        $this->actingAs($owner)
            ->postJson('/api/decisions/history/'.$history->id.'/reason', ['situation' => str_repeat('x', 301)])
            ->assertUnprocessable();
        Http::assertNothingSent();
    }

    public function test_ai_provider_errors_are_returned_without_changing_decision_history(): void
    {
        config(['services.gemini.api_key' => 'server-only-test-key']);
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response(['error' => 'unavailable'], 503),
        ]);
        $user = User::factory()->create();
        $category = Category::query()->create(['user_id' => $user->id, 'name' => 'Plans']);
        $history = $user->decisionHistories()->create([
            'category_id' => $category->id,
            'category_name' => $category->name,
            'selected_option_name' => 'Read',
            'status' => 'pending',
        ]);

        $this->actingAs($user)
            ->postJson('/api/decisions/history/'.$history->id.'/reason')
            ->assertStatus(502)
            ->assertJsonPath('message', 'The AI service could not generate a reason. Please try again.');
        $this->assertDatabaseHas('decision_histories', ['id' => $history->id, 'ai_reason' => null]);
    }

    public function test_ai_invalid_api_key_error_is_explained_without_changing_decision_history(): void
    {
        config(['services.gemini.api_key' => 'server-only-test-key']);
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response(['error' => ['status' => 'UNAUTHENTICATED']], 401),
        ]);
        $user = User::factory()->create();
        $category = Category::query()->create(['user_id' => $user->id, 'name' => 'Plans']);
        $history = $user->decisionHistories()->create([
            'category_id' => $category->id,
            'category_name' => $category->name,
            'selected_option_name' => 'Read',
            'status' => 'pending',
        ]);

        $this->actingAs($user)
            ->postJson('/api/decisions/history/'.$history->id.'/reason')
            ->assertStatus(502)
            ->assertJsonPath('message', 'Gemini rejected the API key. Check GEMINI_API_KEY in the backend environment, then clear Laravel config cache and restart the server.');
        $this->assertDatabaseHas('decision_histories', ['id' => $history->id, 'ai_reason' => null]);
    }

    private function createAdmin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['role' => User::ROLE_ADMIN])->save();

        return $admin->fresh();
    }
}
