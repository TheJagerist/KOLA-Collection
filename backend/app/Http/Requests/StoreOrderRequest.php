<?php

namespace App\Http\Requests;

use App\Enums\DeliveryCity;
use App\Enums\Niveau;
use App\Enums\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Le client envoie uniquement : produit, taille, niveau, quantité.
 * Aucun prix n'est accepté — voir App\Services\OrderService.
 */
class StoreOrderRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge(['payment_phone' => preg_replace('/\D/', '', (string) $this->input('payment_phone'))]);
    }

    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1', 'max:30'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.size' => ['required', 'string', 'max:10'],
            'items.*.niveau' => ['required', Rule::enum(Niveau::class)],
            'items.*.qty' => ['required', 'integer', 'between:1,20'],
            'payment_method' => ['required', Rule::enum(PaymentMethod::class)],
            'payment_phone' => ['required', 'regex:/^0\d{8}$/'],
            'delivery_city' => ['required', Rule::enum(DeliveryCity::class)],
            'delivery_address' => ['required', 'string', 'min:5', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'items.required' => 'Votre panier est vide.',
            'items.*.qty.between' => 'La quantité doit être comprise entre 1 et 20.',
            'payment_method.required' => 'Choisissez un opérateur Mobile Money.',
            'payment_phone.regex' => 'Numéro invalide : 9 chiffres, ex. 06 123 45 67.',
            'delivery_city.required' => 'Choisissez votre ville de livraison.',
            'delivery_address.min' => "Précisez l'adresse de livraison (quartier, rue, repère).",
        ];
    }
}
