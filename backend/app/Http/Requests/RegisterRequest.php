<?php

namespace App\Http\Requests;

use App\Enums\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'username' => strtolower(trim((string) $this->input('username'))),
            'full_name' => trim((string) $this->input('full_name')),
        ]);
    }

    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'max:120'],
            'username' => ['required', 'string', 'regex:/^[a-z0-9._-]{3,20}$/', 'unique:users,username'],
            'password' => ['required', 'string', 'min:8', 'max:100'],
            'role' => ['required', Rule::enum(Role::class)],
        ];
    }

    public function messages(): array
    {
        return [
            'username.regex' => "Nom d'utilisateur invalide : 3 à 20 caractères (lettres, chiffres, point, tiret ou underscore).",
            'username.unique' => "Ce nom d'utilisateur est déjà pris.",
        ];
    }
}
