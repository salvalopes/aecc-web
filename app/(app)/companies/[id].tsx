import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useLayoutEffect, useRef, useState, startTransition } from 'react';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme/ThemeContext';
import { companiesApi } from '@/api/companies.api';
import { productsApi } from '@/api/products.api';
import { ApiError } from '@/api/client';
import type { Company, Product, UpdateCompanyRequest } from '@/types/api';
import { Icon, Badge, Card, Input, Modal, EmptyState, ErrorState, LoadingSpinner } from '@/components/ui';

interface FormState {
  name: string;
  description: string;
  leadCooldownMinutes: string;
  leadDestinationEmail: string;
}

function buildAddressLine(company: Company): string | null {
  const parts = [company.address, company.postalCode, company.postalCodeLocality ?? company.locality].filter(
    (part): part is string => !!part && part.trim().length > 0
  );
  return parts.length > 0 ? parts.join(', ') : null;
}

function ProductItem({ product }: { product: Product }) {
  const { colors, fontFamily, fontSize, fontWeight, spacing } = useTheme();

  return (
    <Card interactive onPress={() => router.push(`/(app)/products/${product.id}`)} style={styles.productCard}>
      <View style={[styles.productHeader, { gap: spacing[4] }]}>
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: fontSize.base,
            fontWeight: fontWeight.bold,
            color: colors.textPrimary,
            flex: 1,
          }}
        >
          {product.name}
        </Text>
        <Badge tone={product.type === 'Product' ? 'success' : 'info'}>
          {product.type === 'Product' ? 'Produto' : 'Serviço'}
        </Badge>
      </View>
      {!!product.description && (
        <Text
          style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary }}
          numberOfLines={2}
        >
          {product.description}
        </Text>
      )}
      {product.hasMemberBenefit && (
        <View style={[styles.benefitTag, { marginTop: spacing[3], gap: spacing[2] }]}>
          <Icon name="star" size={13} color={colors.accentPrimary} />
          <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.accentPrimary }}>
            Benefício membro
          </Text>
        </View>
      )}
    </Card>
  );
}

export default function CompanyDetailScreen() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const { user } = useAuth();
  const navigation = useNavigation();
  const theme = useTheme();
  const { colors, fontFamily, fontSize, fontWeight, spacing, radius, lineHeight } = theme;

  const [company, setCompany] = useState<Company | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    leadCooldownMinutes: '60',
    leadDestinationEmail: '',
  });
  const [pendingLogoAsset, setPendingLogoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isOwner = !!user && !!company && company.ownerUserId === user.id;
  const autoOpenHandledRef = useRef(false);

  // Permite ao ecrã "As minhas empresas" abrir diretamente o modal de edição
  // via ?edit=1, sem duplicar o formulário (que já vive só aqui, com upload de logo).
  useEffect(() => {
    if (autoOpenHandledRef.current) return;
    if (!company || !isOwner) return;
    if (edit === '1') {
      autoOpenHandledRef.current = true;
      openEdit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company, isOwner, edit]);

  useLayoutEffect(() => {
    if (isOwner) {
      navigation.setOptions({
        headerRight: () => (
          <View style={styles.headerActions}>
            <Pressable onPress={handleDelete} style={styles.headerBtn} hitSlop={8}>
              <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.error }}>
                Apagar
              </Text>
            </Pressable>
            <Pressable onPress={openEdit} style={styles.headerBtn} hitSlop={8}>
              <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.accentPrimary }}>
                Editar
              </Text>
            </Pressable>
          </View>
        ),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, navigation]);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [co, prods] = await Promise.all([
        companiesApi.get(id),
        productsApi.list({ companyId: id }),
      ]);
      startTransition(() => {
        setCompany(co);
        setProducts(prods);
      });
    } catch (e) {
      startTransition(() =>
        setError(e instanceof ApiError ? e.message : 'Erro ao carregar empresa.')
      );
    } finally {
      startTransition(() => setLoading(false));
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  function handleDelete() {
    if (!company) return;
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
              router.back();
            } catch (e) {
              Alert.alert('Erro', e instanceof ApiError ? e.message : 'Erro ao apagar empresa.');
            }
          },
        },
      ]
    );
  }

  function openEdit() {
    if (!company) return;
    setForm({
      name: company.name,
      description: company.description,
      leadCooldownMinutes: String(company.leadCooldownMinutes),
      leadDestinationEmail: company.leadDestinationEmail,
    });
    setPendingLogoAsset(null);
    setFormError(null);
    setModalVisible(true);
  }

  async function pickLogo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      startTransition(() => setPendingLogoAsset(result.assets[0]));
    }
  }

  async function handleSave() {
    const cooldown = parseInt(form.leadCooldownMinutes, 10);
    if (!form.name.trim()) { setFormError('O nome é obrigatório.'); return; }
    if (!form.leadDestinationEmail.trim()) { setFormError('O email de destino é obrigatório.'); return; }
    if (Number.isNaN(cooldown) || cooldown < 0) { setFormError('Cooldown inválido.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const payload: UpdateCompanyRequest = {
        name: form.name.trim(),
        description: form.description.trim(),
        leadCooldownMinutes: cooldown,
        leadDestinationEmail: form.leadDestinationEmail.trim(),
      };
      let updated = await companiesApi.update(id!, payload);

      if (pendingLogoAsset) {
        await companiesApi.uploadLogo(id!, pendingLogoAsset);
        updated = await companiesApi.get(id!);
      }

      startTransition(() => {
        setCompany(updated);
        setModalVisible(false);
        setPendingLogoAsset(null);
      });
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Erro ao guardar.');
    } finally {
      setSaving(false);
    }
  }

  if (loading && !company) {
    return (
      <View style={[styles.center, { backgroundColor: colors.surfaceApp }]}>
        <LoadingSpinner />
      </View>
    );
  }

  if (error || !company) {
    return (
      <View style={[styles.center, { backgroundColor: colors.surfaceApp }]}>
        <ErrorState message={error ?? 'Empresa não encontrada.'} onRetry={load} />
      </View>
    );
  }

  const currentLogoUri = pendingLogoAsset?.uri ?? company.logoUrl;
  const profileFields = [
    { label: 'Atividade', value: company.caeDescription },
    { label: 'Telefone', value: company.phone },
    { label: 'Email', value: company.contactEmail },
    { label: 'Website', value: company.website },
    { label: 'Morada', value: buildAddressLine(company) },
  ].filter((f): f is { label: string; value: string } => !!f.value);

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceApp }]}>
      <FlatList
        data={products}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ProductItem product={item} />}
        ListHeaderComponent={
          <View>
            <View
              style={[
                styles.hero,
                { backgroundColor: colors.surfaceCard, borderBottomColor: colors.borderSubtle, padding: spacing[9] },
              ]}
            >
              {!!currentLogoUri && (
                <Image
                  source={{ uri: currentLogoUri }}
                  style={[styles.logo, { borderRadius: radius.md, marginBottom: spacing[6] }]}
                />
              )}
              <Text
                style={{
                  fontFamily: fontFamily.display,
                  fontSize: fontSize.xl,
                  fontWeight: fontWeight.black,
                  color: colors.textPrimary,
                  marginBottom: spacing[3],
                }}
              >
                {company.name}
              </Text>
              {!!company.tradeName && (
                <Text
                  style={{
                    fontFamily: fontFamily.body,
                    fontSize: fontSize.base,
                    color: colors.textSecondary,
                    marginBottom: spacing[3],
                  }}
                >
                  {company.tradeName}
                </Text>
              )}
              {!!company.description && (
                <Text
                  style={{
                    fontFamily: fontFamily.body,
                    fontSize: fontSize.base,
                    lineHeight: fontSize.base * lineHeight.normal,
                    color: colors.textSecondary,
                    marginBottom: spacing[4],
                  }}
                >
                  {company.description}
                </Text>
              )}
              {profileFields.length > 0 && (
                <View style={{ gap: spacing[3], marginBottom: spacing[4] }}>
                  {profileFields.map(f => (
                    <Text
                      key={f.label}
                      style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary }}
                    >
                      <Text style={{ fontWeight: fontWeight.semibold, color: colors.textPrimary }}>{f.label}: </Text>
                      {f.value}
                    </Text>
                  ))}
                </View>
              )}
              <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textTertiary }}>
                Cooldown leads: {company.leadCooldownMinutes} min
              </Text>
            </View>
            <Text
              style={[
                styles.sectionTitle,
                {
                  fontFamily: fontFamily.body,
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.bold,
                  color: colors.textSecondary,
                  paddingHorizontal: spacing[8],
                  paddingTop: spacing[9],
                  paddingBottom: spacing[4],
                },
              ]}
            >
              Produtos e Serviços
            </Text>
          </View>
        }
        ListEmptyComponent={<EmptyState message="Sem produtos para esta empresa." />}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
      />

      <Modal
        visible={modalVisible}
        title="Editar Empresa"
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

        <Text
          style={{
            fontFamily: fontFamily.body,
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            color: colors.textSecondary,
            marginBottom: spacing[3],
          }}
        >
          Logo
        </Text>
        <Pressable
          style={[
            styles.logoPicker,
            {
              borderRadius: radius.lg,
              borderColor: colors.borderDefault,
              backgroundColor: colors.surfaceSunken,
            },
          ]}
          onPress={pickLogo}
        >
          {currentLogoUri ? (
            <Image source={{ uri: currentLogoUri }} style={[styles.logoPreview, { borderRadius: radius.lg }]} />
          ) : (
            <>
              <Icon name="image" size={20} color={colors.textTertiary} />
              <Text
                style={{
                  fontFamily: fontFamily.body,
                  fontSize: fontSize.sm,
                  color: colors.textTertiary,
                  textAlign: 'center',
                  marginTop: spacing[3],
                }}
              >
                Escolher imagem…
              </Text>
            </>
          )}
        </Pressable>
        {!!currentLogoUri && (
          <Pressable onPress={pickLogo} style={{ marginTop: spacing[4] }}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.accentPrimary }}>
              Alterar logo
            </Text>
          </Pressable>
        )}

        <View style={{ marginTop: spacing[8], gap: spacing[6] }}>
          <Input
            label="Nome"
            required
            value={form.name}
            onChangeText={text => setForm(f => ({ ...f, name: text }))}
            autoFocus
          />

          <Input
            label="Descrição"
            value={form.description}
            onChangeText={text => setForm(f => ({ ...f, description: text }))}
            multiline
            numberOfLines={3}
          />

          <Input
            label="Email de destino de leads"
            required
            value={form.leadDestinationEmail}
            onChangeText={text => setForm(f => ({ ...f, leadDestinationEmail: text }))}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Cooldown de leads (minutos)"
            value={form.leadCooldownMinutes}
            onChangeText={text => setForm(f => ({ ...f, leadCooldownMinutes: text }))}
            keyboardType="number-pad"
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  hero: { borderBottomWidth: 1, alignItems: 'flex-start' },
  logo: { width: 64, height: 64 },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.5 },
  list: { paddingBottom: 24 },
  productCard: { marginHorizontal: 12, marginBottom: 8 },
  productHeader: { flexDirection: 'row', alignItems: 'center' },
  benefitTag: { flexDirection: 'row', alignItems: 'center' },
  headerActions: { flexDirection: 'row' },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  logoPicker: {
    width: 100,
    height: 100,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoPreview: { width: 100, height: 100 },
});
