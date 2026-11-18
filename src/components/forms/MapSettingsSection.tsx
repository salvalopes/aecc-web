import { useCallback, useEffect, useState, startTransition } from 'react';
import { View } from 'react-native';
import { mapApi } from '@/api/map.api';
import { ApiError } from '@/api/client';
import {
  ErrorState,
  InlineAlert,
  ListGroup,
  ListRow,
  Skeleton,
  Switch,
  Text,
} from '@/components/ui';
import { FormSection } from '@/components/templates/FormLayout';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useTheme } from '@/theme/ThemeContext';
import type { CompanyMapSettings, UpdateCompanyMapSettingsRequest } from '@/types/api';

const factory = createStyles(({ spacing }) => ({
  body: { gap: spacing.md },
  rowText: { flex: 1, gap: spacing['2xs'] },
}));

type Field = keyof UpdateCompanyMapSettingsRequest;

interface ToggleRow {
  field: Field;
  label: string;
  hint: string;
  /** O interruptor mostra este valor (ex.: "Esconder do mapa" = hiddenFromMapByOwner). */
  value: boolean;
  testID: string;
}

/**
 * Botões de mapa de uma empresa (mapa-plano W6, regra 8). Só mostra o que o papel pode mudar,
 * espelhando a API (PUT /companies/{id}/map-settings):
 * - dono: "Mostrar pino exato" (só para ENI, `isProtectedPerson`) e "Esconder do mapa";
 * - Admin: "Esconder do mapa (Admin)" — nunca o pino exato (o consentimento é do dono).
 * Quem não é dono nem Admin não deve montar esta secção (a API responde 403).
 * Cada interruptor aplica-se logo (PUT só com esse campo); em erro, volta ao valor anterior.
 */
export function MapSettingsSection({
  companyId,
  owner,
  admin,
}: {
  companyId: string;
  owner: boolean;
  admin: boolean;
}) {
  const s = useStyles(factory);
  const { spacing } = useTheme();
  const [settings, setSettings] = useState<CompanyMapSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Field | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await mapApi.settings(companyId);
      startTransition(() => setSettings(data));
    } catch (e) {
      startTransition(() =>
        setLoadError(e instanceof ApiError ? e.message : 'Não foi possível carregar o mapa.'),
      );
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function apply(field: Field, value: boolean) {
    if (!settings) return;
    const previous = settings;
    setSaveError(null);
    setSaving(field);
    setSettings({ ...settings, [field]: value });
    try {
      const updated = await mapApi.updateSettings(companyId, { [field]: value });
      startTransition(() => setSettings(updated));
    } catch (e) {
      startTransition(() => {
        setSettings(previous);
        setSaveError(e instanceof ApiError ? e.message : 'Não foi possível guardar.');
      });
    } finally {
      setSaving(null);
    }
  }

  if (loadError) {
    return (
      <FormSection label="MAPA">
        <ErrorState testID="map-settings.error" message={loadError} onRetry={load} />
      </FormSection>
    );
  }

  if (!settings) {
    return (
      <FormSection label="MAPA">
        <Skeleton width="100%" height={spacing['6xl']} />
      </FormSection>
    );
  }

  const rows: ToggleRow[] = [];
  if (owner && settings.isProtectedPerson) {
    rows.push({
      field: 'showExactPin',
      label: 'Mostrar pino exato',
      hint: 'Por omissão, o mapa mostra só a zona do código postal.',
      value: settings.showExactPin,
      testID: 'company-edit.map-exact',
    });
  }
  if (owner) {
    rows.push({
      field: 'hiddenFromMapByOwner',
      label: 'Esconder do mapa',
      hint: 'A empresa deixa de aparecer no mapa. Continua no diretório.',
      value: settings.hiddenFromMapByOwner,
      testID: 'company-edit.map-hidden',
    });
  }
  if (admin) {
    rows.push({
      field: 'hiddenFromMapByAdmin',
      label: 'Esconder do mapa (Admin)',
      hint: 'Decisão da administração; o dono não a pode desfazer.',
      value: settings.hiddenFromMapByAdmin,
      testID: 'company-map.admin-hidden',
    });
  }

  const notes: string[] = [];
  if (settings.precision === 'none')
    notes.push('Sem localização: o código postal não foi encontrado.');
  if (settings.hiddenFromMapByAdmin && !admin) notes.push('Escondida do mapa pela administração.');

  return (
    <FormSection
      testID="map-settings"
      label="MAPA"
      description={settings.onMap ? 'A empresa aparece no mapa.' : 'A empresa não aparece no mapa.'}
    >
      <View style={s.body}>
        {notes.map((note) => (
          <Text key={note} variant="meta" testID="map-settings.note">
            {note}
          </Text>
        ))}
        {rows.length ? (
          <ListGroup>
            {rows.map((row, index) => (
              <ListRow key={row.field} inset="text" last={index === rows.length - 1}>
                <View style={s.rowText}>
                  <Text variant="name">{row.label}</Text>
                  <Text variant="meta">{row.hint}</Text>
                </View>
                <Switch
                  testID={row.testID}
                  accessibilityLabel={row.label}
                  value={row.value}
                  disabled={saving !== null}
                  onValueChange={(v) => apply(row.field, v)}
                />
              </ListRow>
            ))}
          </ListGroup>
        ) : null}
        {saveError ? (
          <InlineAlert tone="error" message={saveError} testID="map-settings.save-error" />
        ) : null}
      </View>
    </FormSection>
  );
}
