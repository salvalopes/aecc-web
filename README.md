# AECC Mobile

Frontend da aplicação AECC — Associação de Empresários de Cascais.  
Stack: Expo (SDK 52) + React Native + TypeScript + Expo Router.

---

## Pré-requisitos

- Node.js 18+
- npm 9+
- Expo Go (para testar no dispositivo físico) — opcional

---

## Variáveis de ambiente

Cria um ficheiro `.env` na raiz de `mobile/`:

```
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

Em produção usa `https://aecc.salv4.com/api`.

---

## Instalar dependências

```bash
cd mobile
npm install
```

---

## Correr em desenvolvimento

### Web (recomendado para começar)

```bash
npm run web
# ou
npx expo start --web
```

Abre em http://localhost:8081

### iOS (requer macOS + Xcode)

```bash
npm run ios
```

### Android (requer Android Studio + emulador)

```bash
npm run android
```

---

## Build web estático

```bash
npm run build:web
# output em dist/
```

---

## Linting e formatação

```bash
npm run lint
npm run format
```

---

## Estrutura do projecto

```
mobile/
├── app/                     # Rotas Expo Router (file-based)
│   ├── (auth)/login.tsx     # Ecrã de login
│   └── (app)/               # Área autenticada
│       ├── companies/       # Listagem + detalhe de empresas
│       ├── products/        # Listagem + detalhe de produtos
│       ├── categories/      # Listagem de categorias
│       └── profile/         # Perfil do utilizador
└── src/
    ├── api/                 # Camada HTTP tipada
    ├── types/api.ts         # Tipos TypeScript (espelham backend)
    ├── context/AuthContext  # Gestão de sessão + JWT persistence
    └── hooks/useAuth.ts
```

---

## Autenticação

Os tokens JWT são guardados em:
- **iOS/Android:** `expo-secure-store` (keychain/keystore)
- **Web:** `AsyncStorage` (localStorage)

O `AuthContext` injeta o token em todos os pedidos HTTP via `src/api/client.ts`.
