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
            'email' => mb_strtolower(trim((string) $this->input('email'))) ?: null,
            'phone' => ($d = preg_replace('/^(00)?242/', '', preg_replace('/\D/', '', (string) $this->input('phone')))) === '' ? null : $d,
        ]);
    }

    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'max:120'],
            'username' => ['required', 'string', 'regex:/^[a-z0-9._-]{3,20}$/', 'unique:users,username'],
            'password' => ['required', 'string', 'min:8', 'max:100', 'confirmed'],
            'role' => ['required', Rule::enum(Role::class)],
            // Téléphone obligatoire (livraison, WhatsApp, codes SMS) ; e-mail facultatif (reçus, notifications)
            'phone' => ['required', 'regex:/^0\d{8}$/', Rule::unique('users', 'phone')],
            'email' => ['nullable', 'email', 'max:255', 'unique:users,email'],
        ];
    }

    public function messages(): array
    {
        return [
            'username.regex' => "Nom d'utilisateur invalide : 3 à 20 caractères (lettres, chiffres, point, tiret ou underscore).",
            'username.unique' => "Ce nom d'utilisateur est déjà pris.",
            'email.email' => 'Adresse e-mail invalide.',
            'email.unique' => 'Cette adresse e-mail est déjà utilisée par un autre compte.',
            'phone.required' => 'Indiquez votre numéro de téléphone.',
            'phone.regex' => 'Numéro invalide : 9 chiffres commençant par 0 (ex. 06 444 55 66).',
            'phone.unique' => 'Ce numéro est déjà utilisé par un autre compte. Connectez-vous ou utilisez un autre numéro.',
            'password.confirmed' => 'Les deux mots de passe ne correspondent pas.',
            'password.min' => 'Le mot de passe doit contenir au moins 8 caractères.',
        ];
    }
}
