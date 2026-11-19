import { useCallback, useRef, useState } from 'react';
import * as Location from 'expo-location';
import type { LatLng } from '@/components/map/CompanyMap.types';

export type UserPositionState = 'idle' | 'locating' | 'shown' | 'denied' | 'unavailable';

/**
 * "A minha posição" (mapa-plano W5) — iOS/Android, com o expo-location.
 * Regra 1: a permissão ("só enquanto a app está em uso") é pedida dentro de `request()`, ou seja,
 * só quando se toca no botão; nunca no arranque. Um único pedido de posição, sem watch. Nunca se
 * usam os componentes de localização do MapLibre.
 * Regra 2: a posição vive só neste estado React (memória). Não é guardada, enviada nem registada.
 */
export function useUserPosition() {
  const [state, setState] = useState<UserPositionState>('idle');
  const [position, setPosition] = useState<LatLng | null>(null);
  const requestId = useRef(0);

  const request = useCallback(async () => {
    const id = ++requestId.current;
    setState('locating');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (id !== requestId.current) return;
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setPosition(null);
        setState('denied');
        return;
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (id !== requestId.current) return;
      setPosition({ lat: current.coords.latitude, lng: current.coords.longitude });
      setState('shown');
    } catch {
      // Serviços de localização desligados, timeout, etc. Sem detalhes nos logs (regra 2).
      if (id !== requestId.current) return;
      setPosition(null);
      setState('unavailable');
    }
  }, []);

  const clear = useCallback(() => {
    requestId.current += 1;
    setPosition(null);
    setState('idle');
  }, []);

  return { state, position, request, clear };
}
