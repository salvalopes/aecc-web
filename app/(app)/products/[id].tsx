import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Detalhe do produto / serviço</Text>
      <Text style={styles.hint}>ID: {id}</Text>
      <Text style={styles.hint}>Placeholder — integração com API na fase seguinte</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  placeholder: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  hint: { fontSize: 13, color: '#999', textAlign: 'center', marginTop: 4 },
});
