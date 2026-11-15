import { Stack } from 'expo-router';
import { NotFoundState } from '@/components/templates/StateTemplates';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Página não encontrada' }} />
      <NotFoundState />
    </>
  );
}
