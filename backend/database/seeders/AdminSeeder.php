<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $username = env('ADMIN_USERNAME', 'admin');
        $password = env('ADMIN_PASSWORD', 'admin1234');

        $admin = User::query()->firstOrNew(['username' => $username]);
        $admin->fill(['full_name' => 'Administrateur Kōlā', 'password' => $password, 'role' => Role::Parent]);
        $admin->is_admin = true; // hors fillable, assigné explicitement
        $admin->save();

        if (app()->isProduction() && $password === 'admin1234') {
            $this->command?->warn('⚠️  ADMIN_PASSWORD est la valeur par défaut : changez-la avant la mise en ligne.');
        }
    }
}
