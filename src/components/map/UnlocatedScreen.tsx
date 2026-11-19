import { useCallback, useEffect, useState, startTransition } from 'react';
import { View } from 'react-native';
import { mapApi } from '@/api/map.api';
import { ApiError } from '@/api/client';
import { useRequireRole } from '@/hooks/useRequireRole';
import type { UnlocatedCompany } from '@/types/api';
import {
  Button,
  EmptyState,
  ErrorState,
  InlineAlert,
  ListGroup,
  ListRow,
  SkeletonRow,
  Text,
  TextField,
} from '@/components/ui';
import { DetailScaffold } from '@/components/templates/DetailScaffold';
import { ForbiddenState, SessionLoadingState } from '@/components/templates/StateTemplates';
import { MAP_BOX, isInsideMapBox } from '@/components/map/mapBox';
import { createStyles, useStyles } from '@/theme/createStyles';

// Gestão → "Empresas sem localização" (mapa-plano W7, só Admin). Motivos do GET
// /companies/unlocated (aecc-api docs/mapa.md @ 4d4fd15). Só "no-location" se resolve com uma
// posição manual (PUT /location); "insufficient-area" só se resolve com o opt-in do dono ou uma
// zona válida. Um motivo desconhecido não oferece a ação (fail-closed).

const REASON_TEXT: Record<string, string> = {
  'no-location': 'Sem localização: o código postal não foi encontrado.',
  'insufficient-area':
    'Zona do código postal insuficiente: empresário em nome individual; só aparece se o dono ativar o pino exato.',
};

const factory = createStyles(({ spacing }) => ({
  page: { gap: spacing.lg },
  row: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.sm },
  rowText: { gap: spacing['2xs'] },
  form: { gap: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
}));

/** "38,7" ou "38.7" → número (ou NaN). */
function parseCoordinate(text: string): number {
  const t = text.trim().replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : Number.NaN;
}

function LocationForm({
  company,
  onSaved,
  onCancel,
}: {
  company: UnlocatedCompany;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const s = useStyles(factory);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    const la = parseCoordinate(lat);
    const ln = parseCoordinate(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln) || !isInsideMapBox(la, ln)) {
      setFieldError(
        `A posição tem de estar dentro da área do mapa (latitude ${MAP_BOX.minLat} a ${MAP_BOX.maxLat}, longitude ${MAP_BOX.minLng} a ${MAP_BOX.maxLng}).`,
      );
      return;
    }
    setFieldError(null);
    setSaveError(null);
    setSaving(true);
    try {
      await mapApi.setLocation(company.id, { lat: la, lng: ln });
      onSaved();
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : 'Não foi possível guardar a posição.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={s.form}>
      <TextField
        testID="unlocated.lat"
        label="Latitude"
        hint="Ex.: 38,7"
        keyboardType="numbers-and-punctuation"
        value={lat}
        onChangeText={setLat}
        error={fieldError}
      />
      <TextField
        testID="unlocated.lng"
        label="Longitude"
        hint="Ex.: -9,42"
        keyboardType="numbers-and-punctuation"
        value={lng}
        onChangeText={setLng}
        error={fieldError}
      />
      {saveError ? (
        <InlineAlert tone="error" message={saveError} testID="unlocated.save-error" />
      ) : null}
      <View style={s.actions}>
        <Button
          testID="unlocated.save"
          label="Guardar posição"
          size="sm"
          loading={saving}
          onPress={save}
        />
        <Button label="Cancelar" variant="secondary" size="sm" onPress={onCancel} />
      </View>
    </View>
  );
}

export default function UnlocatedCompaniesScreen() {
  const s = useStyles(factory);
  const { allowed, checking } = useRequireRole(['Admin']);
  const [items, setItems] = useState<UnlocatedCompany[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await mapApi.unlocated();
      startTransition(() => setItems(data));
    } catch (e) {
      startTransition(() =>
        setError(e instanceof ApiError ? e.message : 'Não foi possível carregar a lista.'),
      );
    }
  }, []);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  if (checking) return <SessionLoadingState />;
  if (!allowed) return <ForbiddenState />;

  return (
    <DetailScaffold testID="unlocated.screen">
      <View style={s.page}>
        <Text variant="meta">
          Empresas ativas que não aparecem no mapa. As escondidas pelo dono ou pela administração
          não entram nesta lista.
        </Text>
        {error ? (
          <ErrorState testID="unlocated.error" message={error} onRetry={load} />
        ) : items === null ? (
          <ListGroup>
            {[0, 1, 2].map((i) => (
              <SkeletonRow key={i} index={i} last={i === 2} />
            ))}
          </ListGroup>
        ) : items.length === 0 ? (
          <EmptyState
            testID="unlocated.empty"
            icon="map-trifold"
            title="Todas as empresas estão no mapa"
            description="Não há empresas ativas sem localização."
          />
        ) : (
          <ListGroup>
            {items.map((company, index) => (
              <ListRow
                key={company.id}
                testID={`unlocated.row.${company.id}`}
                inset="text"
                last={index === items.length - 1}
                style={s.row}
              >
                <View style={s.rowText}>
                  <Text variant="name">{company.name}</Text>
                  <Text variant="meta" testID={`unlocated.reason.${company.id}`}>
                    {REASON_TEXT[company.reason] ?? 'Motivo desconhecido.'}
                  </Text>
                </View>
                {company.reason === 'no-location' ? (
                  editing === company.id ? (
                    <LocationForm
                      company={company}
                      onCancel={() => setEditing(null)}
                      onSaved={() => {
                        setEditing(null);
                        load();
                      }}
                    />
                  ) : (
                    <View style={s.actions}>
                      <Button
                        testID={`unlocated.set-location.${company.id}`}
                        label="Definir posição"
                        variant="secondary"
                        size="sm"
                        onPress={() => setEditing(company.id)}
                      />
                    </View>
                  )
                ) : null}
              </ListRow>
            ))}
          </ListGroup>
        )}
      </View>
    </DetailScaffold>
  );
}
