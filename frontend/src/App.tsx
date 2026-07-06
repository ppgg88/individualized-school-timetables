import { createBrowserRouter } from 'react-router-dom';
import { AdminGuard } from './components/AdminGuard';
import { Layout } from './components/Layout';
import { LayoutPublic } from './components/LayoutPublic';
import { RoleProvider } from './context/RoleContext';
import Dashboard from './pages/Dashboard';
import EleveView from './pages/EleveView';
import GeneralSchedule from './pages/GeneralSchedule';
import ImportExport from './pages/ImportExport';
import MentionsLegales from './pages/MentionsLegales';
import NewAppointment from './pages/NewAppointment';
import PrintView from './pages/PrintView';
import ProfView from './pages/ProfView';
import Settings from './pages/Settings';
import StudentSchedule from './pages/StudentSchedule';
import Students from './pages/Students';
import Suivi from './pages/Suivi';
import SuiviHistorique from './pages/SuiviHistorique';
import TeacherSchedule from './pages/TeacherSchedule';
import Teachers from './pages/Teachers';
import VieScolaireView from './pages/VieScolaireView';

const router = createBrowserRouter([
  // ─── Mentions légales / RGPD (publique, sans layout) ───────────────────
  { path: '/mentions-legales', element: <MentionsLegales /> },

  // ─── Vue Administrateur (protégée par clé) ────────────────────────────
  {
    path: '/',
    element: (
      <AdminGuard>
        <RoleProvider role="admin">
          <Layout />
        </RoleProvider>
      </AdminGuard>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'edt/general', element: <GeneralSchedule /> },
      { path: 'edt/eleve', element: <StudentSchedule /> },
      { path: 'edt/eleve/:id', element: <StudentSchedule /> },
      { path: 'edt/prof', element: <TeacherSchedule /> },
      { path: 'edt/prof/:id', element: <TeacherSchedule /> },
      { path: 'rdv/nouveau', element: <NewAppointment /> },
      { path: 'suivi', element: <Suivi /> },
      { path: 'suivi/historique', element: <SuiviHistorique /> },
      { path: 'imprimer', element: <PrintView /> },
      { path: 'eleves', element: <Students /> },
      { path: 'profs', element: <Teachers /> },
      { path: 'import-export', element: <ImportExport /> },
      { path: 'parametres', element: <Settings /> },
    ],
  },

  // ─── Vue Élève (lecture seule) ─────────────────────────────────────────
  {
    path: '/eleve/:id',
    element: (
      <RoleProvider role="eleve">
        <LayoutPublic role="eleve" title="Mon emploi du temps" />
      </RoleProvider>
    ),
    children: [{ index: true, element: <EleveView /> }],
  },

  // ─── Vue Professeur (absences uniquement) ──────────────────────────────
  {
    path: '/prof/:id',
    element: (
      <RoleProvider role="prof">
        <LayoutPublic role="prof" title="Mon emploi du temps" />
      </RoleProvider>
    ),
    children: [{ index: true, element: <ProfView /> }],
  },

  // ─── Vue Vie Scolaire (EDT général, lecture seule) ─────────────────────
  {
    path: '/vie-scolaire',
    element: (
      <RoleProvider role="vie-scolaire">
        <LayoutPublic role="vie-scolaire" title="Emplois du temps — Vue générale" />
      </RoleProvider>
    ),
    children: [{ index: true, element: <VieScolaireView /> }],
  },
]);

export default router;
