import { Heart } from 'lucide-react';
import { useProducts } from '../hooks/queries';
import { useFavorites } from '../stores/favorites';
import { ProductCard, ProductCardSkeleton } from '../components/product/ProductCard';
import { EmptyState, PageHeader } from '../components/ui/misc';
import { ButtonLink } from '../components/ui/Button';

export default function Favorites() {
  const ids = useFavorites((s) => s.ids);
  const { data, isLoading } = useProducts();
  const list = (data ?? []).filter((p) => ids.includes(p.id));

  return (
    <>
      <PageHeader kicker="Favoris" title="Vos coups de cœur">
        Gardez ici les articles qui vous intéressent, pour les retrouver le jour de la commande.
      </PageHeader>
      <div className="container-k py-10 lg:py-14">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon={<Heart className="size-6" />} title="Aucun favori pour l'instant" action={<ButtonLink to="/catalogue">Parcourir le catalogue</ButtonLink>}>
            Touchez le cœur sur un article pour l'ajouter à vos favoris.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {list.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
