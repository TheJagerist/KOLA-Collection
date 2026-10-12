import { Navigate } from 'react-router-dom';
import { useAuth } from '../stores/auth';
import { ProfileView } from '../components/profile/ProfileView';

/** /profil — profil du client (aussi accessible à un admin depuis le site) */
export default function Profile() {
  const { user, status } = useAuth();
  if (status !== 'ready') return <div className="min-h-[60vh]" />;
  if (!user) return <Navigate to="/connexion?next=/profil" replace />;
  return (
    <div className="container-k max-w-6xl py-8 sm:py-12">
      <ProfileView variant="client" />
    </div>
  );
}
