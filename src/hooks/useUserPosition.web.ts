import { useCallback, useRef, useState } from 'react';
import type { LatLng } from '@/components/map/CompanyMap.types';
import type { UserPositionState } from './useUserPosition';

export type { UserPositionState } from './useUserPosition';

/**
 * "A minha posição" (mapa-plano W5) — web, com `navigator.geolocation`.
 * Regra 1: o browser só pede a permissão quando `request()` corre (toque no botão). Um único
 * `getCurrentPosition` (sem `watchPosition`). Sem `navigator.geolocation` ou fora de um contexto
 * seguro (HTTP), o estado é `unavailable`.
 * Regra 2: a posição vive só neste estado React. Não é guardada, enviada nem registada.
 */
export function useUserPosition() {
  const [state, setState] = useState<UserPositionState>('idle');
  const [position, setPosition] = useState<LatLng | null>(null);
  const requestId = useRef(0);

  const request = useCallback(async () => {
    const id = ++requestId.current;
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
    if (!geo || (typeof window !== 'undefined' && !window.isSecureContext)) {
      setPosition(null);
      setState('unavailable');
      return;
    }
    setState('locating');
    await new Promise<void>((resolve) => {
      geo.getCurrentPosition(
        (current) => {
          if (id === requestId.current) {
            setPosition({ lat: current.coords.latitude, lng: current.coords.longitude });
            setState('shown');
          }
          resolve();
        },
        (error) => {
          if (id === requestId.current) {
            setPosition(null);
            setState(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable');
          }
          resolve();
        },
        { enableHighAccuracy: false, maximumAge: 0, timeout: 10_000 },
      );
    });
  }, []);

  const clear = useCallback(() => {
    requestId.current += 1;
    setPosition(null);
    setState('idle');
  }, []);

  return { state, position, request, clear };
}
