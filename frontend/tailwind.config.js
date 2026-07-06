/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#4fae00',
        cdr: '#9BD9EE',
        pepiniere: '#7CCB06',
        serres: '#ADFF2F',
        individualisation: '#DF9FDF',
        coursprof: '#DBE2D0',
        arexhor: '#F3E768',
        aconfirmer: '#FD9BAA',
        // Thème "bleu" ré-affecté en vert (couleur de la marque ROVILLE, cf. logo et #2FC901
        // déjà utilisé dans les impressions/emails) : tout le bg-blue-*/text-blue-*/etc déjà
        // utilisé dans l'app en profite automatiquement, sans toucher aux composants.
        blue: {
          50: '#f2fce4',
          100: '#e1f8c2',
          200: '#c3f091',
          300: '#9fe45c',
          400: '#7ccb06',
          500: '#4fae00',
          600: '#2fa000',
          700: '#237a00',
          800: '#1a5c00',
          900: '#123f00',
          950: '#0a2400',
        },
        // Neutres pilotés par variables CSS (voir index.css) : ré-affectées en mode sombre
        // pour que tout le blanc/gris déjà utilisé dans l'app s'adapte automatiquement.
        white: 'rgb(var(--color-white) / <alpha-value>)',
        black: 'rgb(var(--color-black) / <alpha-value>)',
        slate: {
          50: 'rgb(var(--color-slate-50) / <alpha-value>)',
          100: 'rgb(var(--color-slate-100) / <alpha-value>)',
          200: 'rgb(var(--color-slate-200) / <alpha-value>)',
          300: 'rgb(var(--color-slate-300) / <alpha-value>)',
          400: 'rgb(var(--color-slate-400) / <alpha-value>)',
          500: 'rgb(var(--color-slate-500) / <alpha-value>)',
          600: 'rgb(var(--color-slate-600) / <alpha-value>)',
          700: 'rgb(var(--color-slate-700) / <alpha-value>)',
          800: 'rgb(var(--color-slate-800) / <alpha-value>)',
          900: 'rgb(var(--color-slate-900) / <alpha-value>)',
          950: 'rgb(var(--color-slate-950) / <alpha-value>)',
        },
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
