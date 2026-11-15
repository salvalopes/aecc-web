import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'AECC',
  slug: 'aecc',
  scheme: 'aecc', // deep links: Maestro (e2e nativo) e redirect do OAuth/PKCE nativo
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.aecc.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      monochromeImage: './assets/adaptive-icon-monochrome.png',
      backgroundColor: '#0C3247', // fundo do icon-navy-deep
    },
    package: 'com.aecc.app',
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/favicon.png',
    description: 'Associação Empresarial do Concelho de Cascais',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-asset',
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-symbol.png',
        imageWidth: 140,
        resizeMode: 'contain',
        backgroundColor: '#EEF2F5',
        dark: { image: './assets/splash-symbol.png', backgroundColor: '#08161F' },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api',
  },
});
