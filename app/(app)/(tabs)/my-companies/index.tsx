import { Text, View } from 'react-native';
import { useEffect, useState, startTransition } from 'react';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { companiesApi } from '@/api/companies.api';
import { ApiError } from '@/api/client';
import { useFormValidation } from '@/hooks/useFormValidation';
import { required, emailFormat, combine } from '@/utils/validators';
import type { Company, CreateCompanyRequest } from '@/types/api';
import { Input, Modal } from '@/components/ui';
import {
  Button,
  CompanyRow,
  EmptyState,
  ErrorState,
  ListGroup,
  SkeletonRow,
} from '@/components/ds';
import { ListScaffold } from '@/components/templates/ListScaffold';
import { useRequireRole } from '@/hooks/useRequireRole';
import { ForbiddenState, SessionLoadingState } from '@/components/templates/StateTemplates';

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

function MyCompanyRow({ company, last }: { company: Company; last: boolean }) {
  return (
    <CompanyRow
      testID="my-companies.card"
      company={company}
      last={last}
      onPress={() => router.push(`/companies/${company.id}`)}
      actions={
        <Button
          testID="my-companies.edit"
          label="Editar"
          variant="secondary"
          size="sm"
          onPress={() => router.push(`/companies/${company.id}?edit=1`)}
        />
      }
    />
  );
}

export default function MyCompaniesScreen() {
  // O papel decide antes de montar o conteúdo (e os seus efeitos de dados).
  const { allowed, checking } = useRequireRole(['Associado', 'Admin']);
  if (checking) return <SessionLoadingState />;
  if (!allowed) return <ForbiddenState />;
  return <MyCompaniesContent />;
}

function MyCompaniesContent() {
  const { colors, fontFamily, fontSize, spacing, radius } = useTheme();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, validate, clearErrors, applyApiError } =
    useFormValidation<FormState>();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await companiesApi.getMine();
      startTransition(() => setCompanies(data));
    } catch (e) {
      startTransition(() =>
        setError(e instanceof ApiError ? e.message : 'Erro ao carregar as suas empresas.'),
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
      leadCooldownMinutes: (value) => {
        const cooldown = parseInt(value, 10);
        return Number.isNaN(cooldown) || cooldown < 0
          ? 'O cooldown deve ser um número positivo.'
          : undefined;
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

  const count = companies.length;
  return (
    <>
      <ListScaffold
        testID="my-companies.screen"
        horizon={{
          eyebrow: 'ÁREA DO ASSOCIADO',
          title: 'As minhas empresas',
          meta:
            loading && count === 0
              ? 'A carregar…'
              : count === 0
                ? 'Nenhuma empresa no diretório'
                : count === 1
                  ? '1 empresa no diretório'
                  : `${count} empresas no diretório`,
          aside: <Button testID="my-companies.create" label="Nova empresa" onPress={openCreate} />,
        }}
        refreshing={loading && count > 0}
        onRefresh={load}
      >
        {error && count === 0 && !loading ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <ListGroup>
            {loading && count === 0
              ? [0, 1, 2].map((i) => <SkeletonRow key={i} index={i} last={i === 2} />)
              : null}
            {!loading && count === 0 ? (
              <EmptyState
                align="start"
                icon="storefront"
                title="Ainda não tem empresas"
                description="Crie a ficha da sua empresa para aparecer no diretório da AECC e receber pedidos de contacto dos associados."
              />
            ) : null}
            {companies.map((c, i) => (
              <MyCompanyRow key={c.id} company={c} last={i === count - 1} />
            ))}
          </ListGroup>
        )}
      </ListScaffold>

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
            <Text
              style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.error }}
            >
              {formError}
            </Text>
          </View>
        )}

        <Input
          label="Nome"
          required
          value={form.name}
          onChangeText={(text) => setForm((f) => ({ ...f, name: text }))}
          placeholder="Nome da empresa"
          autoFocus
          error={fieldErrors.name}
        />

        <Input
          label="Descrição"
          value={form.description}
          onChangeText={(text) => setForm((f) => ({ ...f, description: text }))}
          placeholder="Descrição da empresa"
          multiline
          numberOfLines={3}
          error={fieldErrors.description}
        />

        <Input
          label="Email de destino de leads"
          required
          value={form.leadDestinationEmail}
          onChangeText={(text) => setForm((f) => ({ ...f, leadDestinationEmail: text }))}
          placeholder="leads@empresa.com"
          keyboardType="email-address"
          autoCapitalize="none"
          error={fieldErrors.leadDestinationEmail}
        />

        <Input
          label="Cooldown de leads (minutos)"
          value={form.leadCooldownMinutes}
          onChangeText={(text) => setForm((f) => ({ ...f, leadCooldownMinutes: text }))}
          placeholder="60"
          keyboardType="number-pad"
          error={fieldErrors.leadCooldownMinutes}
        />
      </Modal>
    </>
  );
}
