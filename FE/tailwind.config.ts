import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/layouts/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary Colors
        'primary': '#72564c',
        'primary-fixed': '#ffdbce',
        'primary-fixed-dim': '#e4beb2',
        'primary-container': '#8d6e63',
        'on-primary': '#ffffff',
        'on-primary-container': '#fffcff',
        'on-primary-fixed': '#2b160f',
        'on-primary-fixed-variant': '#5b4137',
        'inverse-primary': '#e4beb2',

        // Secondary Colors
        'secondary': '#406561',
        'secondary-fixed': '#c2ebe5',
        'secondary-fixed-dim': '#a6cec9',
        'secondary-container': '#c2ebe5',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#466b67',
        'on-secondary-fixed': '#00201e',
        'on-secondary-fixed-variant': '#274d4a',

        // Tertiary Colors
        'tertiary': '#815300',
        'tertiary-fixed': '#ffddb5',
        'tertiary-fixed-dim': '#ffb957',
        'tertiary-container': '#a26900',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#fffdff',
        'on-tertiary-fixed': '#2a1800',
        'on-tertiary-fixed-variant': '#643f00',

        // Surface Colors
        'surface': '#fafaf5',
        'surface-dim': '#dadad5',
        'surface-bright': '#fafaf5',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f4f4ef',
        'surface-container': '#eeeee9',
        'surface-container-high': '#e8e8e3',
        'surface-container-highest': '#e3e3de',
        'on-surface': '#1a1c19',
        'on-surface-variant': '#504441',

        // Other
        'background': '#fafaf5',
        'on-background': '#1a1c19',
        'error': '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',
        'outline': '#827470',
        'outline-variant': '#d4c3be',
        'inverse-surface': '#2f312e',
        'inverse-on-surface': '#f1f1ec',
        'surface-tint': '#75584d',
      },
      fontFamily: {
        'headline': ['Cormorant Garamond', 'serif'],
        'body': ['Cormorant Garamond', 'serif'],
        'label': ['Cormorant Garamond', 'serif'],
      },
      borderRadius: {
        'DEFAULT': '1rem',
        'lg': '2rem',
        'xl': '3rem',
        'full': '9999px',
      },
    },
  },
  plugins: [],
}
export default config
