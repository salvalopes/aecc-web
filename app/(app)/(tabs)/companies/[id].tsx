import { Image, Linking, Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { useEffect, useRef, useState, startTransition } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useBreakpoint } from '@/theme/useBreakpoint';
import { companiesApi } from '@/api/companies.api';
import { productsApi } from '@/api/products.api';
import { categoriesApi } from '@/api/categories.api';
import { ApiError } from '@/api/client';
import { useFormValidation } from '@/hooks/useFormValidation';
import { required, requiredWhen } from '@/utils/validators';
import { confirmDestructive } from '@/utils/confirm';
import { formatAddressLine } from '@/utils/address';
import { absoluteUrl, displayDomain, mapsUrl, telUrl } from '@/utils/text';
import type {
  Category,
  Company,
  CreateProductRequest,
  Product,
  ProductType,
  UpdateCompanyRequest,
} from '@/types/api';
// Formulários (editar empresa, novo produto): continuam no `Modal` até à B12 (T7).
import { Chip, Icon, Input, Modal, Switch } from '@/components/ui';
import {
  Button,
  EmptyState,
  ErrorState,
  InlineAlert,
  ListGroup,
  Plate,
  Skeleton,
  SkeletonRow,
  StateScreen,
  Text,
} from '@/components/ds';
import { DetailScaffold, DetailSection } from '@/components/templates/DetailScaffold';
import { InfoGroup, type InfoItem } from '@/components/detail/InfoGroup';
import { ProductRow } from '@/components/detail/ProductRow';

// T4 Detalhe da empresa (B11). sm: identidade, ações do dono, contactos e depois "Sobre" e os
// produtos. md+: identidade e contactos numa coluna fixa à esquerda (1fr), conteúdo à direita
// (2fr). As ações do dono saíram do header do `Stack` para junto da identidade.
const factory = createStyles(({ colors, spacing, size, radii }) => ({
  identity: { gap: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  plateSkeleton: {
    width: size.plate.lg,
    height: size.plate.lg,
    borderRadius: radii.group,
    borderCurve: 'continuous',
    backgroundColor: colors.raised,
  },
  skeletonText: { gap: spacing.sm, marginTop: spacing.xl },
}));

const openExternal = (url: string) => {
  Linking.openURL(url).catch(() => {
    // Sem app para o esquema (ex.: `tel:` no simulador): não há nada a fazer aqui.
  });
};

interface FormState {
  name: string;
  description: string;
  leadCooldownMinutes: string;
  leadDestinationEmail: string;
}

interface ProductFormState {
  categoryId: string;
  type: ProductType;
  name: string;
  description: string;
  hasMemberBenefit: boolean;
  memberBenefitDescription: string;
}

const DEFAULT_PRODUCT_FORM: ProductFormState = {
  categoryId: '',
  type: 'Product',
  name: '',
  description: '',
  hasMemberBenefit: false,
  memberBenefitDescription: '',
};

function CompanyDetailSkeleton() {
  const s = useStyles(factory);
  const { spacing } = useTheme();
  return (
    <DetailScaffold
      overTabs
      testID="company-detail.loading"
      lead={
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={s.plateSkeleton} />
          <View style={s.skeletonText}>
            <Skeleton width="72%" height={spacing['2xl']} />
            <Skeleton width="44%" />
          </View>
        </View>
      }
    >
      <DetailSection label="PRODUTOS E SERVIÇOS">
        <ListGroup>
          {[0, 1, 2].map((i) => (
            <SkeletonRow key={i} index={i} last={i === 2} />
          ))}
        </ListGroup>
      </DetailSection>
    </DetailScaffold>
  );
}

export default function CompanyDetailScreen() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const { user } = useAuth();
  const theme = useTheme();
  const { colors, fontFamily, fontSize, fontWeight, spacing, radius } = theme;
  const s = useStyles(factory);
  const { isWide } = useBreakpoint();

  const [company, setCompany] = useState<Company | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  // Começa a carregar: sem isto, o 1.º render (antes do efeito) mostrava o estado de erro.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    leadCooldownMinutes: '60',
    leadDestinationEmail: '',
  });
  const [pendingLogoAsset, setPendingLogoAsset] = useState<ImagePicker.ImagePickerAsset | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>(DEFAULT_PRODUCT_FORM);
  const [productSaving, setProductSaving] = useState(false);
  const {
    fieldErrors: productFieldErrors,
    formError: productFormError,
    validate: validateProduct,
    clearErrors: clearProductErrors,
    applyApiError: applyProductApiError,
  } = useFormValidation<ProductFormState>();

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

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
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
      startTransition(() => {
        setNotFound(e instanceof ApiError && e.status === 404);
        setError(e instanceof ApiError ? e.message : 'Não foi possível carregar a empresa.');
      });
    } finally {
      startTransition(() => setLoading(false));
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  // Categorias só são precisas para o formulário de "Novo Produto", que só o
  // dono da empresa vê — evita o pedido extra para todos os outros visitantes.
  useEffect(() => {
    if (!isOwner) return;
    categoriesApi
      .list()
      .then((cats) => startTransition(() => setCategories(cats)))
      .catch(() => {});
  }, [isOwner]);

  async function handleDelete() {
    if (!company) return;
    const confirmed = await confirmDestructive({
      title: 'Apagar empresa',
      message: `Tem a certeza que quer apagar "${company.name}"?`,
      confirmLabel: 'Apagar',
    });
    if (!confirmed) return;
    setActionError(null);
    setDeleting(true);
    try {
      await companiesApi.delete(company.id);
      router.back();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Não foi possível apagar a empresa.');
    } finally {
      setDeleting(false);
    }
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
    if (!form.name.trim()) {
      setFormError('O nome é obrigatório.');
      return;
    }
    if (!form.leadDestinationEmail.trim()) {
      setFormError('O email de destino é obrigatório.');
      return;
    }
    if (Number.isNaN(cooldown) || cooldown < 0) {
      setFormError('Cooldown inválido.');
      return;
    }
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

  function openCreateProduct() {
    setProductForm(DEFAULT_PRODUCT_FORM);
    clearProductErrors();
    setProductModalVisible(true);
  }

  async function handleSaveProduct() {
    if (!company) return;
    const isValid = validateProduct(productForm, {
      name: required('O nome é obrigatório.'),
      categoryId: required('Selecione uma categoria.'),
      memberBenefitDescription: requiredWhen(
        (v) => v.hasMemberBenefit,
        'Descreva o benefício para membros.',
      ),
    });
    if (!isValid) return;

    setProductSaving(true);
    try {
      const payload: CreateProductRequest = {
        companyId: company.id,
        categoryId: productForm.categoryId,
        type: productForm.type,
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        hasMemberBenefit: productForm.hasMemberBenefit,
        memberBenefitDescription: productForm.hasMemberBenefit
          ? productForm.memberBenefitDescription.trim() || null
          : null,
      };
      await productsApi.create(payload);
      setProductModalVisible(false);
      const prods = await productsApi.list({ companyId: company.id });
      startTransition(() => setProducts(prods));
    } catch (e) {
      applyProductApiError(e, {
        CategoryId: 'categoryId',
        Name: 'name',
        Description: 'description',
        MemberBenefitDescription: 'memberBenefitDescription',
      });
    } finally {
      setProductSaving(false);
    }
  }

  if (loading && !company) return <CompanyDetailSkeleton />;

  if (!company) {
    if (notFound) {
      return (
        <StateScreen
          testID="company-detail.not-found"
          icon="magnifying-glass"
          title="Empresa não encontrada"
          description="A empresa pode ter saído do diretório ou o endereço está errado."
          actionLabel="Ver o diretório"
          onAction={() => router.replace('/companies')}
        />
      );
    }
    return (
      <DetailScaffold overTabs>
        <ErrorState
          testID="company-detail.error"
          message={error ?? 'Não foi possível carregar a empresa.'}
          onRetry={load}
        />
      </DetailScaffold>
    );
  }

  const currentLogoUri = pendingLogoAsset?.uri ?? company.logoUrl;
  const flatCategories = (function flatten(cats: Category[]): Category[] {
    return cats.flatMap((c) => [c, ...flatten(c.children)]);
  })(categories);
  const productLabelStyle = {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as any,
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 6,
  };

  const title = company.tradeName ?? company.name;
  const address = formatAddressLine(company);
  const contacts: InfoItem[] = [];
  if (company.phone) {
    const phone = company.phone;
    contacts.push({
      key: 'phone',
      icon: 'phone',
      label: 'Telefone',
      value: phone,
      tabular: true,
      onPress: () => openExternal(telUrl(phone)),
      accessibilityLabel: `Ligar para ${title}, ${phone}`,
      testID: 'company-detail.phone',
    });
  }
  if (company.contactEmail) {
    const email = company.contactEmail;
    contacts.push({
      key: 'email',
      icon: 'envelope-simple',
      label: 'Email',
      value: email,
      onPress: () => openExternal(`mailto:${email}`),
      accessibilityLabel: `Enviar email para ${title}, ${email}`,
      testID: 'company-detail.email',
    });
  }
  if (company.website) {
    const site = company.website;
    contacts.push({
      key: 'website',
      icon: 'globe',
      label: 'Site',
      value: displayDomain(site),
      onPress: () => openExternal(absoluteUrl(site)),
      accessibilityLabel: `Abrir o site de ${title}, ${displayDomain(site)}`,
      testID: 'company-detail.website',
    });
  }
  if (address) {
    contacts.push({
      key: 'address',
      icon: 'map-pin',
      label: 'Morada',
      value: address,
      onPress: () => openExternal(mapsUrl(address)),
      accessibilityLabel: `Ver no mapa: ${address}`,
      testID: 'company-detail.address',
    });
  }

  const lead = (
    <>
      <Plate company={company} size="lg" />
      <View style={s.identity}>
        <Text variant="title" testID="company-detail.title" accessibilityRole="header">
          {title}
        </Text>
        {company.tradeName && company.tradeName !== company.name ? (
          <Text variant="meta">{company.name}</Text>
        ) : null}
        {company.caeDescription ? (
          <Text variant="meta" color="text3">
            {company.caeDescription}
          </Text>
        ) : null}
      </View>
      {isOwner ? (
        <View style={s.actions}>
          <Button
            testID="company-detail.edit"
            label="Editar"
            variant="secondary"
            size="sm"
            onPress={openEdit}
          />
          <Button
            testID="company-detail.delete"
            label="Apagar"
            variant="destructive"
            size="sm"
            loading={deleting}
            onPress={handleDelete}
          />
        </View>
      ) : null}
      {actionError ? (
        <InlineAlert tone="error" message={actionError} testID="company-detail.action-error" />
      ) : null}
      {contacts.length > 0 ? <InfoGroup items={contacts} testID="company-detail.contacts" /> : null}
    </>
  );

  return (
    <View style={styles.container}>
      <DetailScaffold
        overTabs
        testID="company-detail.screen"
        lead={lead}
        refreshing={loading}
        onRefresh={load}
      >
        {company.description ? (
          <DetailSection label="SOBRE">
            <Text variant="body" color="text2">
              {company.description}
            </Text>
          </DetailSection>
        ) : null}

        <DetailSection
          label={`PRODUTOS E SERVIÇOS · ${products.length}`}
          action={
            isOwner ? (
              <Button
                testID="company-detail.create-product"
                label="Novo produto"
                size="sm"
                onPress={openCreateProduct}
              />
            ) : undefined
          }
        >
          <ListGroup>
            {products.length === 0 ? (
              <EmptyState
                testID="company-detail.products-empty"
                align="start"
                icon="basket"
                title="Ainda sem produtos ou serviços"
                description={
                  isOwner
                    ? 'Usa "Novo produto" para publicar o primeiro.'
                    : 'Esta empresa ainda não publicou produtos ou serviços.'
                }
              />
            ) : (
              products.map((p, i) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  last={i === products.length - 1}
                  density={isWide ? 'compact' : 'regular'}
                  onPress={() => router.push(`/products/${p.id}`)}
                />
              ))
            )}
          </ListGroup>
        </DetailSection>

        {isOwner ? (
          <DetailSection label="PEDIDOS DE CONTACTO">
            <InfoGroup
              testID="company-detail.leads"
              items={[
                {
                  key: 'lead-email',
                  label: 'Email de destino',
                  value: company.leadDestinationEmail,
                },
                {
                  key: 'lead-cooldown',
                  label: 'Intervalo mínimo entre pedidos',
                  value: `${company.leadCooldownMinutes} min`,
                  tabular: true,
                },
              ]}
            />
          </DetailSection>
        ) : null}
      </DetailScaffold>

      <Modal
        visible={modalVisible}
        title="Editar Empresa"
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        saveTestID="company-edit.save"
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
            <RNText
              style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.error }}
            >
              {formError}
            </RNText>
          </View>
        )}

        <RNText
          style={{
            fontFamily: fontFamily.body,
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            color: colors.textSecondary,
            marginBottom: spacing[3],
          }}
        >
          Logo
        </RNText>
        <Pressable
          testID="company-edit.logo-upload"
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
            <Image
              source={{ uri: currentLogoUri }}
              style={[styles.logoPreview, { borderRadius: radius.lg }]}
            />
          ) : (
            <>
              <Icon name="image-square" size={20} color={colors.textTertiary} />
              <RNText
                style={{
                  fontFamily: fontFamily.body,
                  fontSize: fontSize.sm,
                  color: colors.textTertiary,
                  textAlign: 'center',
                  marginTop: spacing[3],
                }}
              >
                Escolher imagem…
              </RNText>
            </>
          )}
        </Pressable>
        {!!currentLogoUri && (
          <Pressable onPress={pickLogo} style={{ marginTop: spacing[4] }}>
            <RNText
              style={{
                fontFamily: fontFamily.body,
                fontSize: fontSize.sm,
                color: colors.accentText,
              }}
            >
              Alterar logo
            </RNText>
          </Pressable>
        )}

        <View style={{ marginTop: spacing[8], gap: spacing[6] }}>
          <Input
            testID="company-edit.name"
            label="Nome"
            required
            value={form.name}
            onChangeText={(text) => setForm((f) => ({ ...f, name: text }))}
            autoFocus
          />

          <Input
            testID="company-edit.description"
            label="Descrição"
            value={form.description}
            onChangeText={(text) => setForm((f) => ({ ...f, description: text }))}
            multiline
            numberOfLines={3}
          />

          <Input
            testID="company-edit.lead-email"
            label="Email de destino de leads"
            required
            value={form.leadDestinationEmail}
            onChangeText={(text) => setForm((f) => ({ ...f, leadDestinationEmail: text }))}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            testID="company-edit.lead-cooldown"
            label="Cooldown de leads (minutos)"
            value={form.leadCooldownMinutes}
            onChangeText={(text) => setForm((f) => ({ ...f, leadCooldownMinutes: text }))}
            keyboardType="number-pad"
          />
        </View>
      </Modal>

      <Modal
        visible={productModalVisible}
        title="Novo Produto"
        onClose={() => setProductModalVisible(false)}
        onSave={handleSaveProduct}
        saving={productSaving}
        saveLabel="Guardar"
      >
        {productFormError && (
          <View
            style={{
              backgroundColor: colors.errorBg,
              borderRadius: radius.sm,
              padding: spacing[5],
              marginBottom: spacing[6],
            }}
          >
            <RNText
              style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.error }}
            >
              {productFormError}
            </RNText>
          </View>
        )}

        <RNText style={productLabelStyle}>Categoria *</RNText>
        {productFieldErrors.categoryId && (
          <RNText
            style={{
              fontFamily: fontFamily.body,
              fontSize: fontSize.xs,
              color: colors.error,
              marginBottom: 4,
            }}
          >
            {productFieldErrors.categoryId}
          </RNText>
        )}
        {flatCategories.map((cat) => {
          const selected = productForm.categoryId === cat.id;
          return (
            <Pressable
              key={cat.id}
              style={[
                styles.pickerOption,
                {
                  borderColor: selected ? colors.accentPrimary : colors.borderDefault,
                  backgroundColor: selected ? colors.infoBg : colors.surfaceSunken,
                },
              ]}
              onPress={() => setProductForm((f) => ({ ...f, categoryId: cat.id }))}
            >
              <RNText
                style={{
                  fontFamily: fontFamily.body,
                  fontSize: fontSize.base,
                  fontWeight: selected ? fontWeight.semibold : fontWeight.regular,
                  color: selected ? colors.accentText : colors.textPrimary,
                }}
              >
                {cat.name}
              </RNText>
              {selected && <Icon name="check" size={16} color={colors.accentText} />}
            </Pressable>
          );
        })}

        <RNText style={productLabelStyle}>Tipo *</RNText>
        <View style={styles.typeToggle}>
          {(['Product', 'Service'] as const).map((t) => (
            <Chip
              key={t}
              active={productForm.type === t}
              onPress={() => setProductForm((f) => ({ ...f, type: t }))}
              style={styles.typeChip}
            >
              {t === 'Product' ? 'Produto' : 'Serviço'}
            </Chip>
          ))}
        </View>

        <Input
          label="Nome"
          required
          value={productForm.name}
          onChangeText={(text) => setProductForm((f) => ({ ...f, name: text }))}
          placeholder="Nome do produto ou serviço"
          style={styles.fieldSpacing}
          error={productFieldErrors.name}
        />

        <Input
          label="Descrição"
          value={productForm.description}
          onChangeText={(text) => setProductForm((f) => ({ ...f, description: text }))}
          placeholder="Descrição"
          multiline
          numberOfLines={3}
          style={styles.fieldSpacing}
          error={productFieldErrors.description}
        />

        <View style={styles.switchRow}>
          <RNText
            style={{
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
              color: colors.textSecondary,
            }}
          >
            Tem benefício para membros
          </RNText>
          <Switch
            value={productForm.hasMemberBenefit}
            onValueChange={(v) => setProductForm((f) => ({ ...f, hasMemberBenefit: v }))}
          />
        </View>

        {productForm.hasMemberBenefit && (
          <Input
            label="Descrição do benefício"
            value={productForm.memberBenefitDescription}
            onChangeText={(text) =>
              setProductForm((f) => ({ ...f, memberBenefitDescription: text }))
            }
            placeholder="Descreva o benefício para membros"
            multiline
            numberOfLines={2}
            style={styles.fieldSpacing}
            error={productFieldErrors.memberBenefitDescription}
          />
        )}
      </Modal>
    </View>
  );
}

// Só os formulários (`Modal`) usam estes estilos; saem com a B12 (T7).
const styles = StyleSheet.create({
  container: { flex: 1 },
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
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 4,
  },
  typeToggle: { flexDirection: 'row', gap: 8 },
  typeChip: { flex: 1, justifyContent: 'center' },
  fieldSpacing: { marginTop: 16 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
});
