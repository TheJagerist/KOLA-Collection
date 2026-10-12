<?php

namespace App\Http\Requests;

use App\Enums\DeliveryCity;
use App\Enums\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** PATCH /api/auth/me — tous les champs sont optionnels (mise à jour partielle) */
class UpdateProfileRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $merge = [];
        if ($this->has('username')) {
            $merge['username'] = strtolower(trim((string) $this->input('username')));
        }
        if ($this->has('full_name')) {
            $merge['full_name'] = trim((string) $this->input('full_name'));
        }
        if ($this->has('email')) {
            $merge['email'] = mb_strtolower(trim((string) $this->input('email'))) ?: null;
        }
        if ($this->has('phone')) {
            // « 06 444 55 66 » ou « +242 06 444 55 66 » → « 064445566 »
            $digits = preg_replace('/\D/', '', (string) $this->input('phone'));
            $merge['phone'] = $digits === '' ? null : preg_replace('/^242/', '', $digits);
        }
        $this->merge($merge);
    }

    public function rules(): array
    {
        $id = $this->user()->id;

        return [
            'full_name' => ['sometimes', 'required', 'string', 'max:120'],
            'username' => ['sometimes', 'required', 'string', 'regex:/^[a-z0-9._-]{3,20}$/', Rule::unique('users', 'username')->ignore($id)],
            'email' => ['sometimes', 'nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($id)],
            // Un client ne peut pas retirer son téléphone (livraison) ; l'équipe peut s'en passer
            'phone' => ['sometimes', $this->user()->is_admin ? 'nullable' : 'required', 'regex:/^0\d{8}$/', Rule::unique('users', 'phone')->ignore($id)],
            'role' => ['sometimes', 'required', Rule::enum(Role::class)],
            'default_city' => ['sometimes', 'nullable', Rule::enum(DeliveryCity::class)],
            'default_address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'email_notifications' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'username.regex' => "Nom d'utilisateur invalide : 3 à 20 caractères (lettres, chiffres, point, tiret ou underscore).",
            'username.unique' => "Ce nom d'utilisateur est déjà pris.",
            'email.unique' => 'Cette adresse e-mail est déjà utilisée.',
            'phone.regex' => 'Numéro invalide : 9 chiffres commençant par 0 (ex. 06 444 55 66).',
            'phone.required' => 'Le numéro de téléphone est obligatoire.',
            'phone.unique' => 'Ce numéro est déjà utilisé par un autre compte.',
        ];
    }
}
