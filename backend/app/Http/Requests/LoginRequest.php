<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Connexion par mot de passe : identifiant = nom d'utilisateur, e-mail ou téléphone */
class LoginRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        // « username » reste accepté pour les anciens clients de l'API
        $this->merge(['login' => trim((string) ($this->input('login') ?? $this->input('username')))]);
    }

    public function rules(): array
    {
        return [
            'login' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return ['login.required' => 'Indiquez votre e-mail, votre téléphone ou votre nom d’utilisateur.'];
    }
}
