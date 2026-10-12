<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** PUT /api/auth/password */
class UpdatePasswordRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            // Un compte créé avec Google n'a pas encore de mot de passe : pas d'ancien à vérifier
            'current_password' => [$this->user()->password ? 'required' : 'nullable', 'string', 'current_password:sanctum'],
            'password' => ['required', 'string', 'min:8', 'max:100', 'confirmed', 'different:current_password'],
        ];
    }

    public function messages(): array
    {
        return [
            'current_password.current_password' => 'Le mot de passe actuel est incorrect.',
            'password.different' => "Le nouveau mot de passe doit être différent de l'actuel.",
        ];
    }
}
