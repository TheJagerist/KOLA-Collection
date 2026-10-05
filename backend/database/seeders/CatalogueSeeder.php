<?php

namespace Database\Seeders;

use App\Models\CarouselImage;
use App\Models\Collection;
use App\Models\HomepageContent;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

/**
 * Données réelles reprises de l'ancien site (Supabase) : textes, carrousel, catalogue.
 * Les images sont copiées depuis database/seeders/images vers storage/app/public.
 */
class CatalogueSeeder extends Seeder
{
    public function run(): void
    {
        $ecolier = Collection::query()->updateOrCreate(['slug' => 'ecolier'], ['name' => 'Collection Écolier']);
        Collection::query()->updateOrCreate(['slug' => 'hiver'], ['name' => 'Hiver']);
        $ecolier->activate();

        HomepageContent::query()->updateOrCreate(['collection_id' => $ecolier->id], [
            'hero_eyebrow' => "L'uniforme de la rentrée, sans la queue au marché",
            'hero_title' => "L'uniforme scolaire, commandé en quelques clics.",
            'hero_lede' => "Kōlā habille les élèves du Congo avec l'uniforme réglementaire : kaki pour les garçons, bleu ciel et bleu de nuit pour les filles. Commandez pour votre enfant, ou commandez vous-même. Livré directement chez vous.",
            'cta_primary_label' => 'Voir le catalogue',
        ]);

        $ecolier->carouselImages()->delete();
        foreach (range(1, 5) as $i) {
            CarouselImage::query()->create([
                'collection_id' => $ecolier->id,
                'path' => $this->copy("carousel/{$i}.webp", 'carousel'),
                'position' => $i,
            ]);
        }

        foreach ($this->products() as $data) {
            $data['image_path'] = isset($data['image']) ? $this->copy("products/{$data['image']}", 'products') : null;
            $data['sketch_path'] = isset($data['sketch']) ? $this->copy("sketches/{$data['sketch']}", 'sketches') : null;
            $orderCount = $data['order_count'] ?? 0;
            unset($data['image'], $data['sketch'], $data['order_count']);

            $product = Product::query()->updateOrCreate(
                ['slug' => $data['slug']],
                $data + ['collection_id' => $ecolier->id, 'niveaux' => ['college', 'lycee']],
            );
            $product->forceFill(['order_count' => $orderCount])->save();
        }
    }

    /** Copie une image de seed vers le disque public et renvoie son chemin */
    private function copy(string $source, string $folder): string
    {
        $target = $folder.'/'.basename($source);
        Storage::disk('public')->put($target, File::get(database_path('seeders/images/'.$source)));

        return $target;
    }

    private function products(): array
    {
        $pantalonHomme = 'Pantalon droit à pinces, coupe large et confortable, en tissu beige type gabardine. Taille haute avec ceinture à passants, braguette zippée protégée par une patte boutonnée. Poches obliques sur le devant et fausses poches passepoilées au dos. Un modèle à la fois élégant et décontracté, pensé pour un usage scolaire quotidien.';

        return [
            [
                'slug' => 'chemise-epaulette-kaki', 'name' => 'Chemise à épaulettes kaki', 'ensemble' => 'garcon', 'cat' => 'chemise',
                'price' => 5000, 'sizes' => ['10', '12', '14', 'M'], 'badge' => 'Best-seller', 'order_count' => 128,
                'description' => 'Chemise à manches courtes, deux poches plaquées à rabat et épaulettes boutonnées. Tissu kaki résistant, facile à repasser.',
                'construction' => ['Col chemise classique', 'Deux poches poitrine à rabat', 'Épaulettes boutonnées', 'Patte de boutonnage cachée', 'Manches courtes ourlées'],
                'image' => 'chemise-epaulette-kaki.webp',
            ],
            [
                'slug' => 'pantalon-homme-coupe-large', 'name' => 'Pantalon garçon coupe large', 'ensemble' => 'garcon', 'cat' => 'pantalon',
                'price' => 6500, 'sizes' => ['10', '12', '14', '16', 'S', 'M'], 'order_count' => 96,
                'description' => $pantalonHomme,
                'construction' => ['Ceinture avec passants et bouton de fermeture', 'Braguette zippée avec patte de protection boutonnée', 'Poches latérales obliques', 'Pinces creuses au niveau de la taille', 'Poches arrière passepoilées', 'Ourlet droit, jambe large'],
                'image' => 'pantalon-homme-coupe-large.webp', 'sketch' => 'pantalon-homme-coupe-large.webp',
            ],
            [
                'slug' => 'chemise-epaulette-bleu-ciel', 'name' => 'Chemise à épaulettes bleu ciel', 'ensemble' => 'fille', 'cat' => 'chemise',
                'price' => 5000, 'sizes' => ['10', '12', '14', 'M'], 'badge' => 'Nouveau', 'order_count' => 112,
                'description' => 'Chemise à manches courtes bleu ciel, deux poches plaquées et épaulettes. Coupe droite, confortable toute la journée.',
                'construction' => ['Col chemise', 'Deux poches poitrine à rabat', 'Épaulettes boutonnées', 'Manches courtes'],
                'image' => 'chemise-epaulette-bleu-ciel.webp', 'sketch' => 'chemise-epaulette-bleu-ciel.webp',
            ],
            [
                'slug' => 'jupe-bleu-nuit-longue', 'name' => 'Jupe longue plissée bleu nuit', 'ensemble' => 'fille', 'cat' => 'jupe',
                'price' => 5000, 'sizes' => ['10', '12', '14', 'M'], 'order_count' => 74,
                'description' => 'Jupe longue plissée en couronne, tissu léger bleu de nuit idéal pour un confort quotidien.',
                'construction' => ['Taille haute', 'Plis couchés réguliers', 'Fermeture invisible au dos', 'Longueur cheville'],
                'image' => 'jupe-bleu-couronne-longue.webp',
            ],
            [
                'slug' => 'pantalon-palazzo-bleu-nuit', 'name' => 'Pantalon palazzo bleu nuit', 'ensemble' => 'fille', 'cat' => 'pantalon',
                'price' => 6500, 'sizes' => ['10', '12', '14', 'M'], 'order_count' => 51,
                'description' => 'Pantalon taille haute bleu de nuit à coupe large et élégante, conçu dans un tissu de type tailleur. Sa ceinture large à rabat asymétrique et double bouton apporte une finition raffinée.',
                'construction' => ['Ceinture large à rabat asymétrique', 'Double bouton', 'Plis sur le devant', 'Poches latérales', 'Jambe large'],
                'image' => 'pantalon-palazzo-bleu-nuit.webp', 'sketch' => 'pantalon-palazzo-bleu-nuit.webp',
            ],
            [
                'slug' => 'jupe-grise', 'name' => 'Jupe grise', 'ensemble' => 'fille', 'cat' => 'jupe',
                'price' => 3500, 'sizes' => ['10', '12', '14'], 'is_archived' => true,
                'image' => 'jupe-grise.webp', 'sketch' => 'jupe-grise.webp',
            ],
        ];
    }
}
