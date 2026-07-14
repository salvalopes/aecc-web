import { Pressable, FlatList, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState, startTransition } from 'react';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { companiesApi } from '@/api/companies.api';
import { ApiError } from '@/api/client';
import { useFormValidation } from '@/hooks/useFormValidation';
import { required, emailFormat, combine } from '@/utils/validators';
import type { Company, CreateCompanyRequest } from '@/types/api';
import { Button, Input, Card, Modal, EmptyState, ErrorState, LoadingSpinner } from '@/components/ui';

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

function MyCompanyCard({ company }: { company: Company }) {
  const { colors, fontFamily, fontSize, fontWeight, spacing } = useTheme();

  return (
    <Card padding={0} style={styles.row}>
      <View style={styles.rowHeader}>
        <Pressable
          onPress={() => router.push(`/(app)/companies/${company.id}`)}
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
            {company.name}
          </Text>
          {!!company.description && (
            <Text
              style={{
                fontFamily: fontFamily.body,
                fontSize: fontSize.sm,
                color: colors.textSecondary,
                marginTop: spacing[1],
              }}
              numberOfLines={2}
            >
              {company.description}
            </Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => router.push(`/(app)/companies/${company.id}?edit=1`)}
          style={[styles.editBtn, { paddingHorizontal: spacing[6] }]}
          hitSlop={8}
        >
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
      </View>
    </Card>
  );
}

export default function MyCompaniesScreen() {
  const { colors, fontFamily, fontSize, spacing, radius } = useTheme();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, validate, clearErrors, applyApiError } = useFormValidation<FormState>();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await companiesApi.getMine();
      startTransition(() => setCompanies(data));
    } catch (e) {
      startTransition(() =>
        setError(e instanceof ApiError ? e.message : 'Erro ao carregar as suas empresas.')
      );
    } finally {
      startTransition(() => setLoading(false));
    }
  }

  useEffect(() => {
    load();
  }, []);

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
      load();
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
      {loading && companies.length === 0 ? (
        <LoadingSpinner />
      ) : error && companies.length === 0 ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <FlatList
          data={companies}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <MyCompanyCard company={item} />}
          contentContainerStyle={[styles.list, { padding: spacing[6], gap: spacing[5] }]}
          ListEmptyComponent={<EmptyState message="Ainda não tem empresas." />}
          refreshing={loading}
          onRefresh={load}
        />
      )}

      <Button onPress={openCreate} style={styles.fab}>
        + Nova Empresa
      </Button>

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
  list: {},
  row: { overflow: 'hidden' },
  rowHeader: { flexDirection: 'row', alignItems: 'center' },
  nameArea: { flex: 1 },
  editBtn: { alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 20 },
});
