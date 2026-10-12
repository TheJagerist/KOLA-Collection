<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PromoCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Codes promo et remises automatiques (ex. remise famille dès 3 articles) */
class PromoController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => PromoCode::query()->latest()->get()->map(fn ($p) => $this->present($p))]);
    }

    public function store(Request $request): JsonResponse
    {
        $promo = PromoCode::query()->create($this->validated($request));

        return response()->json(['data' => $this->present($promo->fresh())], 201);
    }

    public function update(Request $request, PromoCode $promo): JsonResponse
    {
        $promo->fill($this->validated($request, $promo))->save();

        return response()->json(['data' => $this->present($promo->fresh())]);
    }

    public function destroy(PromoCode $promo): JsonResponse
    {
        $promo->delete();

        return response()->json(null, 204);
    }

    private function validated(Request $request, ?PromoCode $promo = null): array
    {
        $request->merge(['code' => $request->filled('code') ? strtoupper(trim((string) $request->input('code'))) : null]);
        $data = $request->validate([
            'code' => ['nullable', 'regex:/^[A-Z0-9_-]{3,40}$/', Rule::unique('promo_codes', 'code')->ignore($promo?->id)],
            'label' => ['required', 'string', 'max:120'],
            'type' => ['required', 'in:percent,amount'],
            'value' => ['required', 'integer', 'min:1', $request->input('type') === 'percent' ? 'max:90' : 'max:1000000'],
            'min_items' => ['nullable', 'integer', 'min:0', 'max:100'],
            'min_total' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'max_uses' => ['nullable', 'integer', 'min:1'],
        ], [
            'code.regex' => 'Code : 3 à 40 caractères, lettres et chiffres (ex. RENTREE26).',
            'code.unique' => 'Ce code existe déjà.',
            'value.max' => 'Valeur trop élevée.',
            'ends_at.after_or_equal' => 'La date de fin doit être après la date de début.',
        ]);

        return [
            'code' => $data['code'] ?? null,
            'label' => $data['label'],
            'type' => $data['type'],
            'value' => $data['value'],
            'min_items' => $data['min_items'] ?? 0,
            'min_total' => $data['min_total'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
            'starts_at' => $data['starts_at'] ?? null,
            'ends_at' => $data['ends_at'] ?? null,
            'max_uses' => $data['max_uses'] ?? null,
        ];
    }

    private function present(PromoCode $p): array
    {
        return [
            'id' => $p->id, 'code' => $p->code, 'label' => $p->label, 'type' => $p->type, 'value' => $p->value,
            'min_items' => $p->min_items, 'min_total' => $p->min_total, 'is_active' => $p->is_active,
            'starts_at' => $p->starts_at?->toIso8601String(), 'ends_at' => $p->ends_at?->toIso8601String(),
            'max_uses' => $p->max_uses, 'uses' => $p->uses, 'automatic' => $p->isAutomatic(),
        ];
    }
}
