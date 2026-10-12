import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Toaster } from './components/ui/Toaster';
import { DevApiBanner } from './components/layout/DevApiBanner';
import { PasskeyOffer } from './components/profile/PasskeyOffer';
import { useAuth } from './stores/auth';
import Home from './pages/Home';

const Catalogue = lazy(() => import('./pages/Catalogue'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const AuthPage = lazy(() => import('./pages/Auth'));
const AuthCallback = lazy(() => import('./pages/Auth').then((m) => ({ default: m.AuthCallback })));
const Account = lazy(() => import('./pages/Account'));
const SizeGuide = lazy(() => import('./pages/SizeGuide'));
const Contact = lazy(() => import('./pages/Contact'));
const About = lazy(() => import('./pages/About'));
const Legal = lazy(() => import('./pages/Legal'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminStorefront = lazy(() => import('./pages/admin/AdminStorefront'));
const AdminCollections = lazy(() => import('./pages/admin/AdminCollections'));
const AdminPrep = lazy(() => import('./pages/admin/AdminPrep'));
const AdminDeliveries = lazy(() => import('./pages/admin/AdminDeliveries'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminPromos = lazy(() => import('./pages/admin/AdminPromos'));
const AdminTeam = lazy(() => import('./pages/admin/AdminTeam'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const PaymentSimulator = lazy(() => import('./pages/PaymentSimulator'));

const Fallback = () => <div className="min-h-[60vh]" />;
const s = (el: React.ReactNode) => <Suspense fallback={<Fallback />}>{el}</Suspense>;

const router = createBrowserRouter([
  // Espace d'administration : application à part (sidebar), sans l'en-tête ni le pied de page du site
  {
    path: '/admin',
    element: s(<AdminLayout />),
    children: [
      { index: true, element: s(<AdminDashboard />) },
      { path: 'commandes', element: s(<AdminOrders />) },
      { path: 'clients', element: s(<AdminCustomers />) },
      { path: 'catalogue', element: s(<AdminProducts />) },
      { path: 'vitrine', element: s(<AdminStorefront />) },
      { path: 'collections', element: s(<AdminCollections />) },
      { path: 'profil', element: s(<AdminProfile />) },
      { path: 'preparation', element: s(<AdminPrep />) },
      { path: 'livraisons', element: s(<AdminDeliveries />) },
      { path: 'rapports', element: s(<AdminReports />) },
      { path: 'promotions', element: s(<AdminPromos />) },
      { path: 'equipe', element: s(<AdminTeam />) },
      { path: 'parametres', element: s(<AdminSettings />) },
    ],
  },
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/catalogue', element: s(<Catalogue />) },
      { path: '/produit/:slug', element: s(<ProductPage />) },
      { path: '/panier', element: s(<Cart />) },
      { path: '/commande', element: s(<Checkout />) },
      { path: '/commande/confirmation/:reference', element: s(<OrderConfirmation />) },
      { path: '/paiement/simulateur/:tx', element: s(<PaymentSimulator />) },
      { path: '/connexion', element: s(<AuthPage />) },
      { path: '/inscription', element: s(<AuthPage />) },
      { path: '/auth/callback', element: s(<AuthCallback />) },
      { path: '/compte', element: s(<Account />) },
      { path: '/profil', element: s(<Profile />) },
      { path: '/guide-des-tailles', element: s(<SizeGuide />) },
      { path: '/contact', element: s(<Contact />) },
      { path: '/a-propos', element: s(<About />) },
      { path: '/mentions-legales', element: s(<Legal />) },
      { path: '/favoris', element: s(<Favorites />) },
      { path: '*', element: s(<NotFound />) },
    ],
  },
]);

export default function App() {
  const bootstrap = useAuth((st) => st.bootstrap);
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
      <DevApiBanner />
      <PasskeyOffer />
    </>
  );
}
