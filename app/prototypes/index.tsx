// Índice dos protótipos da Fase 2 (só __DEV__). Permite abrir por toque, sem deep link.
import { Link, Redirect } from 'expo-router';
import { Text, View } from 'react-native';

export default function PrototypesIndex() {
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, padding: 32, gap: 16, justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '600' }}>Protótipos · Fase 2</Text>
      <Link href="/prototypes/vitrine" style={{ fontSize: 18 }}>
        A · Vitrine
      </Link>
      <Link href="/prototypes/mare" style={{ fontSize: 18 }}>
        B · Maré
      </Link>
    </View>
  );
}
