import type { IconName } from '@/components/ui';

// Mapeado por slug (estável) — ver AECC.Infrastructure/Import/CompanyCategorizationService.cs
// para a lista canónica das 13 categorias de negócio.
const CATEGORY_ICONS: Record<string, IconName> = {
  restaurantes: 'utensils',
  pastelarias: 'cake',
  oficinas: 'wrench',
  seguros: 'shield',
  vestuario: 'shirt',
  viagens: 'plane',
  construcao: 'hard-hat',
  'beleza-e-bem-estar': 'scissors',
  'comercio-alimentar': 'shopping-basket',
  saude: 'cross',
  imobiliario: 'house',
  'servicos-profissionais': 'briefcase',
  outros: 'layout-grid',
};

export function categoryIcon(slug: string): IconName {
  return CATEGORY_ICONS[slug] ?? 'layout-grid';
}
