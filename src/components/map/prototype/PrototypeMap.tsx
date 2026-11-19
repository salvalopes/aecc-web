import { StateScreen } from '@/components/ui';
import type { PrototypeMapProps } from './PrototypeMap.web';

// A Fase A só prototipa na web (o nativo é a Fase B, com as mesmas camadas de ./layers).
export type { PrototypeMapProps } from './PrototypeMap.web';

export default function PrototypeMap(_: PrototypeMapProps) {
  return <StateScreen title="Protótipo do mapa só na web (Fase A)" />;
}
