<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge(['username' => strtolower(trim((string) $this->input('username')))]);
    }

    public function rules(): array
    {
        return [
            'username' => ['required', 'string', 'max:20'],
            'password' => ['required', 'string', 'max:100'],
        ];
    }
}
