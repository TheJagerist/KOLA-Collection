<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\WhatsApp\WhatsAppAlerts;
use App\Support\Settings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Admin → Paramètres (gérant) : numéros Mobile Money, frais, WhatsApp de la boutique et alertes de l'équipe */
class SettingsController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => ['payment' => Settings::get('payment'), 'whatsapp' => Settings::get('whatsapp')]]);
    }

    public function update(Request $request): JsonResponse
    {
        $digits = fn ($v) => preg_replace('/\D/', '', (string) $v);
        $input = $request->all();
        foreach (['mtn', 'airtel'] as $op) {
            if (isset($input['payment'][$op]['number'])) {
                $input['payment'][$op]['number'] = preg_replace('/^(00)?242/', '', $digits($input['payment'][$op]['number']));
            }
        }
        if (isset($input['whatsapp']['shop_number'])) {
            $d = $digits($input['whatsapp']['shop_number']);
            $input['whatsapp']['shop_number'] = $d && ! str_starts_with($d, '242') ? '242'.$d : $d;
        }
        foreach ($input['whatsapp']['alerts'] ?? [] as $i => $a) {
            $d = $digits($a['phone'] ?? '');
            $input['whatsapp']['alerts'][$i]['phone'] = $d && ! str_starts_with($d, '242') ? '242'.$d : $d;
        }
        $request->replace($input);

        $data = $request->validate([
            'payment' => ['sometimes', 'array'],
            'payment.mtn.number' => ['nullable', 'regex:/^0\d{8}$/'],
            'payment.mtn.name' => ['nullable', 'string', 'max:80'],
            'payment.mtn.ussd' => ['nullable', 'string', 'max:30'],
            'payment.mtn.fee_percent' => ['nullable', 'numeric', 'min:0', 'max:20'],
            'payment.airtel.number' => ['nullable', 'regex:/^0\d{8}$/'],
            'payment.airtel.name' => ['nullable', 'string', 'max:80'],
            'payment.airtel.ussd' => ['nullable', 'string', 'max:30'],
            'payment.airtel.fee_percent' => ['nullable', 'numeric', 'min:0', 'max:20'],
            'payment.note' => ['nullable', 'string', 'max:600'],
            'whatsapp' => ['sometimes', 'array'],
            'whatsapp.shop_number' => ['nullable', 'regex:/^242\d{9}$/'],
            'whatsapp.alerts' => ['nullable', 'array', 'max:5'],
            'whatsapp.alerts.*.name' => ['nullable', 'string', 'max:60'],
            'whatsapp.alerts.*.phone' => ['required', 'regex:/^242\d{9}$/'],
            'whatsapp.alerts.*.apikey' => ['required', 'string', 'max:40'],
        ], [
            'payment.*.number.regex' => 'Numéro Mobile Money invalide : 9 chiffres commençant par 0.',
            'whatsapp.shop_number.regex' => 'Numéro WhatsApp invalide (ex. 06 444 55 66).',
            'whatsapp.alerts.*.phone.regex' => 'Numéro WhatsApp invalide (ex. 06 444 55 66).',
            'whatsapp.alerts.*.apikey.required' => 'Indiquez la clé CallMeBot reçue sur WhatsApp.',
        ]);

        if (isset($data['payment'])) {
            Settings::put('payment', array_replace_recursive(Settings::get('payment'), $data['payment']));
        }
        if (isset($data['whatsapp'])) {
            $wa = Settings::get('whatsapp');
            $wa['shop_number'] = $data['whatsapp']['shop_number'] ?? $wa['shop_number'];
            if (array_key_exists('alerts', $data['whatsapp'])) {
                $wa['alerts'] = array_values($data['whatsapp']['alerts'] ?? []);
            }
            Settings::put('whatsapp', $wa);
        }

        return $this->show();
    }

    /** POST /api/admin/settings/whatsapp-test — envoie un message d'essai à l'équipe */
    public function testWhatsApp(): JsonResponse
    {
        WhatsAppAlerts::send('✅ Kōlā Collection : les alertes WhatsApp de l’équipe fonctionnent.');

        return response()->json(['data' => ['sent' => true]]);
    }
}
