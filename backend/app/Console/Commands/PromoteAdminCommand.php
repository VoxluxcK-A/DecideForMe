<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class PromoteAdminCommand extends Command
{
    protected $signature = 'app:promote-admin {email : Email address of the existing account}';

    protected $description = 'Promote an existing user account to administrator';

    public function handle(): int
    {
        $user = User::query()->where('email', $this->argument('email'))->first();

        if (! $user) {
            $this->components->error('No account was found for that email. Register the account first.');

            return self::FAILURE;
        }

        if ($user->isAdmin()) {
            $this->components->info('This account is already an administrator.');

            return self::SUCCESS;
        }

        if (! $this->confirm("Promote {$user->email} to administrator?", false)) {
            $this->components->warn('No changes were made.');

            return self::SUCCESS;
        }

        $user->forceFill(['role' => User::ROLE_ADMIN, 'is_active' => true])->save();
        $this->components->info("{$user->email} is now an administrator.");

        return self::SUCCESS;
    }
}
