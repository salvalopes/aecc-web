import type { IconName } from '@/components/ui';

// Mapeado por slug (estável) — ver AECC.Infrastructure/Import/CompanyCategorizationService.cs
// para a lista canónica das 13 categorias de negócio.
const CATEGORY_ICONS: Record<string, IconName> = {
  restaurantes: 'fork-knife',
  pastelarias: 'cake',
  oficinas: 'wrench',
  seguros: 'shield-check',
  vestuario: 't-shirt',
  viagens: 'airplane-tilt',
  construcao: 'hard-hat',
  'beleza-e-bem-estar': 'scissors',
  'comercio-alimentar': 'basket',
  saude: 'first-aid-kit',
  imobiliario: 'house-line',
  'servicos-profissionais': 'briefcase',
  outros: 'squares-four',
};

export function categoryIcon(slug: string): IconName {
  return CATEGORY_ICONS[slug] ?? 'squares-four';
}
