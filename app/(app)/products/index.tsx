import { StyleSheet, Text, View } from 'react-native';

export default function ProductsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Listagem de produtos e serviços</Text>
      <Text style={styles.hint}>Filtrável por categoria — integração com API na fase seguinte</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  placeholder: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  hint: { fontSize: 13, color: '#999', textAlign: 'center' },
});
