import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useRef, useState, startTransition } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme/ThemeContext';
import { companiesApi } from '@/api/companies.api';
import { ApiError } from '@/api/client';
import { useFormValidation } from '@/hooks/useFormValidation';
import { required, emailFormat, combine } from '@/utils/validators';
import type { CompanyDirectoryEntry, CreateCompanyRequest } from '@/types/api';
import { Button, Input, Card, IconButton, Modal, EmptyState, ErrorState, LoadingSpinner } from '@/components/ui';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

interface FormState {
  name: string;
  description: string;
  leadCooldownMinutes: string;
  leadDestinationEmail: string;
}

const DEFAULT_FORM: FormState = {
  name: '',
  description: '',
  leadCooldownMinutes: '60',
  leadDestinationEmail: '',
};

function buildAddressLine(item: CompanyDirectoryEntry): string | null {
  const parts = [item.address, item.postalCode, item.postalCodeLocality ?? item.locality].filter(
    (part): part is string => !!part && part.trim().length > 0
  );
  return parts.length > 0 ? parts.join(', ') : null;
}

function CompanyDirectoryRow({
  item,
  expanded,
  onToggle,
}: {
  item: CompanyDirectoryEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { colors, fontFamily, fontSize, fontWeight, spacing } = useTheme();

  const fields = [
    { label: 'Telefone', value: item.phone },
    { label: 'Email', value: item.contactEmail },
    { label: 'Morada', value: buildAddressLine(item) },
    { label: 'Atividade', value: item.caeDescription },
  ].filter((f): f is { label: string; value: string } => !!f.value);

  return (
    <Card padding={0} style={styles.row}>
      <View style={styles.rowHeader}>
        <Pressable
          onPress={() => router.push(`/(app)/companies/${item.id}`)}
          style={[styles.nameArea, { padding: spacing[6] }]}
        >
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: fontSize.md,
              fontWeight: fontWeight.bold,
              color: colors.textPrimary,
            }}
          >
            {item.name}
          </Text>
          {!!item.tradeName && (
            <Text
              style={{
                fontFamily: fontFamily.body,
                fontSize: fontSize.sm,
                color: colors.textSecondary,
                marginTop: spacing[1],
              }}
            >
              {item.tradeName}
            </Text>
          )}
        </Pressable>
        <IconButton
          icon="chevron-right"
          label={expanded ? 'Colapsar detalhes' : 'Expandir detalhes'}
          onPress={onToggle}
          style={[styles.chevron, { transform: [{ rotate: expanded ? '90deg' : '0deg' }] }]}
        />
      </View>

      {expanded && (
        <View
          style={[
            styles.details,
            { borderTopColor: colors.borderSubtle, padding: spacing[6], gap: spacing[3] },
          ]}
        >
          {fields.length > 0 ? (
            fields.map(f => (
              <Text
                key={f.label}
                style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary }}
              >
                <Text style={{ fontWeight: fontWeight.semibold, color: colors.textPrimary }}>{f.label}: </Text>
                {f.value}
              </Text>
            ))
          ) : (
            <Text
              style={{
                fontFamily: fontFamily.body,
                fontSize: fontSize.sm,
                color: colors.textTertiary,
                fontStyle: 'italic',
              }}
            >
              Sem contactos disponíveis.
            </Text>
          )}
        </View>
      )}
    </Card>
  );
}

export default function CompaniesScreen() {
  const { user } = useAuth();
  const { colors, fontFamily, fontSize, spacing, radius } = useTheme();
  const canCreate = user?.role === 'Admin' || user?.role === 'Associado';

  const [entries, setEntries] = useState<CompanyDirectoryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, validate, clearErrors, applyApiError } = useFormValidation<FormState>();

  const requestIdRef = useRef(0);
  const isFirstRunRef = useRef(true);

  async function loadPage(pageToLoad: number, name: string, replace: boolean) {
    const requestId = ++requestIdRef.current;
    if (replace) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }
    try {
      const result = await companiesApi.directory({
        page: pageToLoad,
        pageSize: PAGE_SIZE,
        name: name || undefined,
      });
      if (requestId !== requestIdRef.current) return;
      startTransition(() => {
        setEntries(prev => (replace ? result.items : [...prev, ...result.items]));
        setPage(result.page);
        setTotalPages(result.totalPages);
        if (replace) setExpandedIds(new Set());
      });
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      startTransition(() =>
        setError(e instanceof ApiError ? e.message : 'Erro ao carregar empresas.')
      );
    } finally {
      if (requestId === requestIdRef.current) {
        startTransition(() => {
          setLoading(false);
          setLoadingMore(false);
        });
      }
    }
  }

  useEffect(() => {
    const name = search.trim();
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      loadPage(1, name, true);
      return;
    }
    const handle = setTimeout(() => {
      loadPage(1, name, true);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleEndReached() {
    if (loading || loadingMore) return;
    if (page >= totalPages) return;
    loadPage(page + 1, search.trim(), false);
  }

  function openCreate() {
    setForm(DEFAULT_FORM);
    clearErrors();
    setModalVisible(true);
  }

  async function handleSave() {
    const isValid = validate(form, {
      name: required('O nome é obrigatório.'),
      leadDestinationEmail: combine(required('O email de destino é obrigatório.'), emailFormat()),
      leadCooldownMinutes: value => {
        const cooldown = parseInt(value, 10);
        return Number.isNaN(cooldown) || cooldown < 0 ? 'O cooldown deve ser um número positivo.' : undefined;
      },
    });
    if (!isValid) return;

    setSaving(true);
    try {
      const payload: CreateCompanyRequest = {
        name: form.name.trim(),
        description: form.description.trim(),
        leadCooldownMinutes: parseInt(form.leadCooldownMinutes, 10),
        leadDestinationEmail: form.leadDestinationEmail.trim(),
      };
      await companiesApi.create(payload);
      setModalVisible(false);
      loadPage(1, search.trim(), true);
    } catch (e) {
      applyApiError(e, {
        Name: 'name',
        Description: 'description',
        LeadCooldownMinutes: 'leadCooldownMinutes',
        LeadDestinationEmail: 'leadDestinationEmail',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceApp }]}>
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.surfaceCard, borderBottomColor: colors.borderSubtle, padding: spacing[6] },
        ]}
      >
        <Input value={search} onChangeText={setSearch} placeholder="Pesquisar empresas..." />
      </View>

      {loading && entries.length === 0 ? (
        <LoadingSpinner />
      ) : error && entries.length === 0 ? (
        <ErrorState message={error} onRetry={() => loadPage(1, search.trim(), true)} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <CompanyDirectoryRow
              item={item}
              expanded={expandedIds.has(item.id)}
              onToggle={() => toggleExpand(item.id)}
            />
          )}
          contentContainerStyle={[styles.list, { padding: spacing[6], gap: spacing[5] }]}
          ListEmptyComponent={<EmptyState message="Nenhuma empresa encontrada." />}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <LoadingSpinner size="small" />
            ) : error && entries.length > 0 ? (
              <View style={{ padding: spacing[6], alignItems: 'center', gap: spacing[4] }}>
                <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.error }}>
                  {error}
                </Text>
                <Button variant="secondary" size="sm" onPress={() => loadPage(page + 1, search.trim(), false)}>
                  Tentar novamente
                </Button>
              </View>
            ) : null
          }
        />
      )}

      {canCreate && (
        <Button onPress={openCreate} style={styles.fab}>
          + Nova Empresa
        </Button>
      )}

      <Modal
        visible={modalVisible}
        title="Nova Empresa"
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        saving={saving}
      >
        {formError && (
          <View
            style={{
              backgroundColor: colors.errorBg,
              borderRadius: radius.sm,
              padding: spacing[5],
              marginBottom: spacing[6],
            }}
          >
            <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.error }}>
              {formError}
            </Text>
          </View>
        )}

        <Input
          label="Nome"
          required
          value={form.name}
          onChangeText={text => setForm(f => ({ ...f, name: text }))}
          placeholder="Nome da empresa"
          autoFocus
          error={fieldErrors.name}
        />

        <Input
          label="Descrição"
          value={form.description}
          onChangeText={text => setForm(f => ({ ...f, description: text }))}
          placeholder="Descrição da empresa"
          multiline
          numberOfLines={3}
          error={fieldErrors.description}
        />

        <Input
          label="Email de destino de leads"
          required
          value={form.leadDestinationEmail}
          onChangeText={text => setForm(f => ({ ...f, leadDestinationEmail: text }))}
          placeholder="leads@empresa.com"
          keyboardType="email-address"
          autoCapitalize="none"
          error={fieldErrors.leadDestinationEmail}
        />

        <Input
          label="Cooldown de leads (minutos)"
          value={form.leadCooldownMinutes}
          onChangeText={text => setForm(f => ({ ...f, leadCooldownMinutes: text }))}
          placeholder="60"
          keyboardType="number-pad"
          error={fieldErrors.leadCooldownMinutes}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { borderBottomWidth: 1 },
  list: {},
  row: { overflow: 'hidden' },
  rowHeader: { flexDirection: 'row', alignItems: 'center' },
  nameArea: { flex: 1 },
  chevron: { marginRight: 8 },
  details: { borderTopWidth: 1 },
  fab: { position: 'absolute', bottom: 24, right: 20 },
});
