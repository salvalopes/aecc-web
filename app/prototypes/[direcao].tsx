// Protótipos da Fase 2 (só __DEV__, só no branch design/fase2-direcoes — nunca vai para o main).
//   /prototypes/vitrine | /prototypes/mare
//   ?state=normal|loading|empty|error  ?scheme=light|dark  ?view=primary|table  ?q=termo  ?cat=<slug>
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useFonts } from 'expo-font';
import { View, useColorScheme } from 'react-native';
import { VitrineDirectory } from '@/prototypes/vitrine/VitrineDirectory';
import { vitrineFontFiles, vitrineTokens } from '@/prototypes/vitrine/tokens';
import { MareDirectory } from '@/prototypes/mare/MareDirectory';
import { mareFontFiles, mareTokens } from '@/prototypes/mare/tokens';
import type { ModelInit } from '@/prototypes/model';
import type { ProtoState, Scheme, ViewMode } from '@/prototypes/types';

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function Prototype({ direcao }: { direcao: 'vitrine' | 'mare' }) {
  const params = useLocalSearchParams<{
    state?: string;
    scheme?: string;
    view?: string;
    q?: string;
    cat?: string;
  }>();
  const system = useColorScheme();
  const [loaded, error] = useFonts(direcao === 'vitrine' ? vitrineFontFiles : mareFontFiles);

  // Maré é dark-first; Vitrine é light-first. ?scheme= sobrepõe; senão segue o sistema.
  const scheme: Scheme =
    one(params.scheme) === 'dark' || one(params.scheme) === 'light'
      ? (one(params.scheme) as Scheme)
      : system === 'dark'
        ? 'dark'
        : 'light';
  const state = (['normal', 'loading', 'empty', 'error'] as const).includes(
    one(params.state) as ProtoState,
  )
    ? (one(params.state) as ProtoState)
    : 'normal';

  // "vazio" abre já com uma pesquisa sem resultados + filtro (a §4 descreve este caso)
  const init: ModelInit = {
    state,
    q: one(params.q) ?? (state === 'empty' ? 'Pastelaria Lunar' : ''),
    cat: one(params.cat) ?? (state === 'empty' ? 'restauracao' : null),
    view: one(params.view) === 'table' ? ('table' as ViewMode) : 'primary',
  };

  if (!loaded && !error) return null;
  const t = direcao === 'vitrine' ? vitrineTokens(scheme) : mareTokens(scheme);
  return (
    <View style={{ flex: 1, backgroundColor: t.c.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* key: reinicia o modelo quando mudam os parâmetros (deep link com o ecrã já aberto) */}
      {direcao === 'vitrine' ? (
        <VitrineDirectory key={JSON.stringify(init)} t={t} init={init} />
      ) : (
        <MareDirectory key={JSON.stringify(init)} t={t} init={init} />
      )}
    </View>
  );
}

export default function PrototypeRoute() {
  const { direcao } = useLocalSearchParams<{ direcao: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  if (direcao !== 'vitrine' && direcao !== 'mare') return <Redirect href="/prototypes" />;
  return <Prototype direcao={direcao} />;
}
