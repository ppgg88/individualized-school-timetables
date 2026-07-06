import type { ReactNode } from 'react';

/**
 * Coordonnées de l'établissement à compléter avant mise en production. Toute valeur encore
 * entre crochets [...] doit être remplacée par l'information réelle de l'établissement.
 */
const ETABLISSEMENT = {
  nom: 'École de ROVILLE',
  adresse: '3 rue du Stade, 88700 ROVILLE AUX CHÊNES',
  telephone: '03 29 65 11 04',
  email: 'lycee@roville.fr',
  uai: '783 469 794 00011',
};

const REFERENT_RGPD = {
  nom: 'Marie-Pierre Giroux',
  email: 'marie-pierre.giroux@roville.fr',
};

const HEBERGEUR = {
  nom: 'OVH',
  adresse: 'OVH Groupe SA, 2 rue Kellermann, 59100 Roubaix, France',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{children}</div>
    </section>
  );
}

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Mentions légales & protection des données</h1>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            ← Retour
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
        <Section title="Éditeur du site">
          <p>
            Ce site est développé par Paul Giroux sous licence OpenSource <a href="https://www.gnu.org/licenses/old-licenses/gpl-2.0.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">GPL-V2</a> et en usage pour l'établissement :
            <br />
            {ETABLISSEMENT.nom}
            <br />
            {ETABLISSEMENT.adresse}
            <br />
            Téléphone : {ETABLISSEMENT.telephone}
            <br />
            Email : {ETABLISSEMENT.email}
            <br />
            UAI / SIRET : {ETABLISSEMENT.uai}
          </p>
        </Section>

        <Section title="Hébergement">
          <p>
            Ce site est hébergé par {HEBERGEUR.nom}, {HEBERGEUR.adresse}.
          </p>
        </Section>

        <Section title="Responsable du traitement">
          <p>
            {ETABLISSEMENT.nom} est responsable du traitement des données personnelles gérées par cette application
            (« EDT Individualisation »).
          </p>
        </Section>

        <Section title="Finalités du traitement">
          <p>
            L'application a pour finalité l'organisation et le suivi des emplois du temps individualisés des élèves
            (rendez-vous, absences, suivi hebdomadaire) et des formateurs qui y sont associés.
          </p>
        </Section>

        <Section title="Base légale">
          <p>
            Le traitement repose sur l'exécution d'une mission d'intérêt public dont est investi l'établissement
            (organisation du service public de l'éducation), au sens de l'article 6.1.e du RGPD. Aucun consentement préalable de l'utilisateur
            n'est requis pour ce traitement, qui est nécessaire au suivi pédagogique des élèves. L'utilisateur peut toutefois demander la suppression de ses données personnelles à tout moment, conformément à la section « Vos droits » ci-dessous.
          </p>
        </Section>

        <Section title="Données collectées">
          <ul className="list-inside list-disc space-y-1">
            <li>Élèves : nom, prénom, adresse email, classe, rendez-vous, statut de présence/absence, suivi hebdomadaire (contenu et ressenti).</li>
            <li>Formateurs : nom, prénom, adresse email, rendez-vous et absences déclarées.</li>
          </ul>
        </Section>

        <Section title="Destinataires des données">
          <p>
            Seul le personnel habilité de l'établissement (administration, vie scolaire, formateurs concernés par un
            rendez-vous) a accès aux données, dans la limite de ce qui est nécessaire à ses missions. Aucune donnée
            n'est cédée ou vendue à un tiers.
          </p>
        </Section>

        <Section title="Durée de conservation">
          <p>
            Les données sont conservées pendant 10 ans, puis supprimées automatiquement (rendez-vous, suivis
            hebdomadaires, et fiches élèves/formateurs devenues inactives). Cette purge est exécutée régulièrement
            de façon automatisée.
          </p>
        </Section>

        <Section title="Sécurité">
          <p>
            L'accès à cette application se fait via une clé d'accès personnelle et confidentielle (transmise par
            lien ou QR code individuel) : elle ne doit pas être partagée. Les échanges avec le serveur sont chiffrés
            (HTTPS).
          </p>
        </Section>

        <Section title="Cookies et traceurs">
          <p>
            Cette application n'utilise aucun cookie ni traceur publicitaire ou de mesure d'audience. Elle utilise
            uniquement le stockage local de votre navigateur pour mémoriser votre clé d'accès
            personnelle sur cet appareil, afin de ne pas avoir à la ressaisir à chaque visite.
          </p>
        </Section>

        <Section title="Vos droits">
          <p>
            Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation et
            d'opposition concernant vos données. Pour exercer ces droits, contactez :
          </p>
          <p>
            {REFERENT_RGPD.nom}
            <br />
            Email : {REFERENT_RGPD.email}
          </p>
          <p>
            Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez adresser
            une réclamation à la CNIL (
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
              www.cnil.fr
            </a>
            ).
          </p>
        </Section>
      </main>
    </div>
  );
}
