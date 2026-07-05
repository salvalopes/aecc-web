import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState, startTransition } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme/ThemeContext';
import { companiesApi } from '@/api/companies.api';
import { ApiError } from '@/api/client';
import type { Company, CreateCompanyRequest } from '@/types/api';
import { Icon, Button, Input, Badge, Card, Modal, EmptyState, ErrorState, LoadingSpinner } from '@/components/ui';

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

function CompanyCard({
  company,
  isOwner,
  onEdit,
  onDelete,
}: {
  company: Company;
  isOwner: boolean;
  onEdit: (c: Company) => void;
  onDelete: (c: Company) => void;
}) {
  const { colors, fontFamily, fontSize, fontWeight, spacing } = useTheme();

  return (
    <Card interactive onPress={() => router.push(`/(app)/companies/${company.id}`)}>
      <View style={[styles.cardHeader, { gap: spacing[4] }]}>
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: fontSize.md,
            fontWeight: fontWeight.bold,
            color: colors.textPrimary,
            flex: 1,
          }}
        >
          {company.name}
        </Text>
        {isOwner && <Badge tone="info">Minha</Badge>}
      </View>
      {!!company.description && (
        <Text
          style={{
            fontFamily: fontFamily.body,
            fontSize: fontSize.sm,
            color: colors.textSecondary,
            marginBottom: spacing[4],
          }}
          numberOfLines={2}
        >
          {company.description}
        </Text>
      )}
      {isOwner && (
        <View style={[styles.cardActions, { gap: spacing[8], marginTop: spacing[2] }]}>
          <Pressable onPress={() => onEdit(company)} style={styles.actionBtn} hitSlop={8}>
            <Icon name="pencil" size={14} color={colors.accentPrimary} />
            <Text
              style={{
                fontFamily: fontFamily.body,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
                color: colors.accentPrimary,
              }}
            >
              Editar
            </Text>
          </Pressable>
          <Pressable onPress={() => onDelete(company)} style={styles.actionBtn} hitSlop={8}>
            <Icon name="trash-2" size={14} color={colors.error} />
            <Text
              style={{
                fontFamily: fontFamily.body,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
                color: colors.error,
              }}
            >
              Apagar
            </Text>
          </Pressable>
        </View>
      )}
    </Card>
  );
}

export default function CompaniesScreen() {
  const { user } = useAuth();
  const { colors, fontFamily, fontSize, spacing, radius } = useTheme();
  const canCreate = user?.role === 'Admin' || user?.role === 'Associado';

  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load(name?: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await companiesApi.list(name ? { name } : undefined);
      startTransition(() => setCompanies(data));
    } catch (e) {
      startTransition(() =>
        setError(e instanceof ApiError ? e.message : 'Erro ao carregar empresas.')
      );
    } finally {
      startTransition(() => setLoading(false));
    }
  }

  useEffect(() => {
    load();
  }, []);

  function isOwner(company: Company) {
    return !!user && company.ownerUserId === user.id;
  }

  function openCreate() {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setModalVisible(true);
  }

  function openEdit(company: Company) {
    setEditTarget(company);
    setForm({
      name: company.name,
      description: company.description,
      leadCooldownMinutes: String(company.leadCooldownMinutes),
      leadDestinationEmail: company.leadDestinationEmail,
    });
    setFormError(null);
    setModalVisible(true);
  }

  function handleDelete(company: Company) {
    Alert.alert(
      'Apagar empresa',
      `Tem a certeza que quer apagar "${company.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              await companiesApi.delete(company.id);
              load();
            } catch (e) {
              Alert.alert(
                'Erro',
                e instanceof ApiError ? e.message : 'Erro ao apagar empresa.'
              );
            }
          },
        },
      ]
    );
  }

  async function handleSave() {
    const cooldown = parseInt(form.leadCooldownMinutes, 10);
    if (!form.name.trim()) {
      setFormError('O nome é obrigatório.');
      return;
    }
    if (!form.leadDestinationEmail.trim()) {
      setFormError('O email de destino é obrigatório.');
      return;
    }
    if (Number.isNaN(cooldown) || cooldown < 0) {
      setFormError('O cooldown deve ser um número positivo.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload: CreateCompanyRequest = {
        name: form.name.trim(),
        description: form.description.trim(),
        leadCooldownMinutes: cooldown,
        leadDestinationEmail: form.leadDestinationEmail.trim(),
      };
      if (editTarget) {
        await companiesApi.update(editTarget.id, payload);
      } else {
        await companiesApi.create(payload);
      }
      setModalVisible(false);
      load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Erro ao guardar.');
    } finally {
      setSaving(false);
    }
  }

  const filtered = search.trim()
    ? companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : companies;

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceApp }]}>
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.surfaceCard, borderBottomColor: colors.borderSubtle, padding: spacing[6] },
        ]}
      >
        <Input
          value={search}
          onChangeText={text => {
            setSearch(text);
            if (text.trim().length > 1) load(text.trim());
            else if (text.trim().length === 0) load();
          }}
          placeholder="Pesquisar empresas..."
        />
      </View>

      {loading && companies.length === 0 ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <CompanyCard
              company={item}
              isOwner={isOwner(item)}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={[styles.list, { padding: spacing[6], gap: spacing[5] }]}
          ListEmptyComponent={<EmptyState message="Sem empresas." />}
          refreshing={loading}
          onRefresh={() => load()}
        />
      )}

      {canCreate && (
        <Button onPress={openCreate} style={styles.fab}>
          + Nova Empresa
        </Button>
      )}

      <Modal
        visible={modalVisible}
        title={editTarget ? 'Editar Empresa' : 'Nova Empresa'}
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
        />

        <Input
          label="Descrição"
          value={form.description}
          onChangeText={text => setForm(f => ({ ...f, description: text }))}
          placeholder="Descrição da empresa"
          multiline
          numberOfLines={3}
        />

        <Input
          label="Email de destino de leads"
          required
          value={form.leadDestinationEmail}
          onChangeText={text => setForm(f => ({ ...f, leadDestinationEmail: text }))}
          placeholder="leads@empresa.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="Cooldown de leads (minutos)"
          value={form.leadCooldownMinutes}
          onChangeText={text => setForm(f => ({ ...f, leadCooldownMinutes: text }))}
          placeholder="60"
          keyboardType="number-pad"
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { borderBottomWidth: 1 },
  list: {},
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardActions: { flexDirection: 'row' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  fab: { position: 'absolute', bottom: 24, right: 20 },
});
