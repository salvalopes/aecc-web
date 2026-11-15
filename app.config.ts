import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'AECC',
  slug: 'aecc',
  scheme: 'aecc', // deep links: Maestro (e2e nativo) e links de confirm-email/reset-password no iOS
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
    // App Links: só os links dos emails da API (AuthController) abrem a app. A verificação
    // usa public/.well-known/assetlinks.json em aecc.salv4.com (hoje só com o SHA-256 do
    // certificado debug; o de release entra na fase das lojas).
    // iOS: sem associatedDomains (exige conta Apple Developer paga); fica para as lojas.
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          { scheme: 'https', host: 'aecc.salv4.com', path: '/confirm-email' },
          { scheme: 'https', host: 'aecc.salv4.com', path: '/reset-password' },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
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
      'expo-image-picker',
      {
        photosPermission:
          'A AECC precisa de acesso às suas fotografias para escolher o logótipo da empresa e as imagens dos produtos.',
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
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
