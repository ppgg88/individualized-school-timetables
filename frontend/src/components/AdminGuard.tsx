import { KeyRound, ShieldOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const LS_KEY = 'edt-admin-key';

/**
 * Protège les routes admin :
 * - Lit `?key=xxx` dans l'URL → stocke dans localStorage, nettoie l'URL
 * - Si clé présente → affiche les enfants (panel admin)
 * - Sinon → affiche une page d'accès refusé
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlKey = params.get('key');

    if (urlKey) {
      // Stocker la clé et nettoyer l'URL
      localStorage.setItem(LS_KEY, urlKey);
      params.delete('key');
      const newSearch = params.toString();
      navigate(
        { pathname: location.pathname, search: newSearch ? `?${newSearch}` : '' },
        { replace: true }
      );
    }

    const storedKey = localStorage.getItem(LS_KEY);
    setHasKey(Boolean(storedKey));
    setReady(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null;

  if (!hasKey) return <AccessDeniedPage />;

  return <>{children}</>;
}

function AccessDeniedPage() {
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const k = inputKey.trim();
    if (!k) { setError(true); return; }
    localStorage.setItem(LS_KEY, k);
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <img src="/roville-logo.png" alt="École de ROVILLE" className="h-32 w-auto" />
        </div>

        <div className="mb-6 flex justify-center">
          <div className="rounded-2xl bg-red-50 p-4">
            <ShieldOff className="h-10 w-10 text-red-400" />
          </div>
        </div>

        <h1 className="text-center text-xl font-bold text-slate-900">Accès restreint</h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          Ce panel est réservé aux administrateurs.<br />
          Entrez votre clé d'accès pour continuer.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Clé administrateur
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={inputKey}
                onChange={(e) => { setInputKey(e.target.value); setError(false); }}
                placeholder="••••••••••••••••••••••"
                className={`w-full rounded-2xl border py-2.5 pl-10 pr-4 text-sm outline-none transition focus:ring-2 ${
                  error
                    ? 'border-red-400 bg-red-50 focus:ring-red-200'
                    : 'border-slate-300 bg-slate-50 focus:border-blue-400 focus:ring-blue-100'
                }`}
              />
            </div>
            {error && <p className="mt-1 text-xs text-red-600">La clé ne peut pas être vide.</p>}
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-blue-600 py-2.5 text-sm font-semibold text-gray-50 transition hover:bg-blue-700 active:scale-95"
          >
            Accéder au panel
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-400">
          Vous pouvez aussi utiliser le lien fourni par votre administrateur avec{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-600">?key=…</code>
          {' '}dans l'URL.
        </p>
      </div>
    </div>
  );
}
