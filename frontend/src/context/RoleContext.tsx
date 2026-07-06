import { createContext, useContext, useEffect, useState } from 'react';

export type Role = 'admin' | 'eleve' | 'prof' | 'vie-scolaire';

interface RoleContextValue {
  role: Role;
  /** ID de l'élève ou du prof connecté (uniquement pour les rôles eleve/prof) */
  entityId: number | null;
  /** Indique si la clé admin est configurée (pour le rôle admin) */
  isAdminKeySet: boolean;
}

const RoleContext = createContext<RoleContextValue>({
  role: 'admin',
  entityId: null,
  isAdminKeySet: false,
});

export function useRole() {
  return useContext(RoleContext);
}

/** Retourne true si l'utilisateur courant peut modifier les rendez-vous */
export function useCanEdit() {
  const { role, isAdminKeySet } = useRole();
  return role === 'admin' && isAdminKeySet;
}

/** Retourne true si le prof peut mettre à jour les absences */
export function useCanUpdateAbsence() {
  const { role } = useRole();
  return role === 'prof' || role === 'admin';
}

interface Props {
  role: Role;
  entityId?: number | null;
  children: React.ReactNode;
}

export function RoleProvider({ role, entityId = null, children }: Props) {
  const [isAdminKeySet, setIsAdminKeySet] = useState(false);

  useEffect(() => {
    const key = localStorage.getItem('edt-admin-key');
    setIsAdminKeySet(Boolean(key));

    const handler = () => setIsAdminKeySet(Boolean(localStorage.getItem('edt-admin-key')));
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <RoleContext.Provider value={{ role, entityId, isAdminKeySet }}>
      {children}
    </RoleContext.Provider>
  );
}
