import { Redirect, useLocalSearchParams } from 'expo-router';

// Rota antiga (grelha de categorias → lista por categoria), mantida para não
// partir links já existentes — redireciona para o novo diretório único de
// Empresas com o filtro de categoria pré-aplicado.
export default function CompanyDirectoryByCategoryScreen() {
  const { categoryId, name } = useLocalSearchParams<{ categoryId: string; name?: string }>();
  return <Redirect href={{ pathname: '/(app)/companies', params: { categoryId, name } }} />;
}
