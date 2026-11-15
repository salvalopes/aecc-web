import { View } from 'react-native';
import { useCallback, useRef, useState, startTransition } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useBreakpoint } from '@/theme/useBreakpoint';
import { Icon } from '@/components/ui/Icon';
import {
  Button,
  CompanyRow,
  ErrorState,
  InlineAlert,
  ListGroup,
  Skeleton,
  StateScreen,
  Text,
} from '@/components/ui';
import { DetailScaffold, DetailSection } from '@/components/templates/DetailScaffold';
import { InfoGroup } from '@/components/detail/InfoGroup';
import { GalleryPlaceholder, ProductGallery } from '@/components/detail/ProductGallery';
import { productTypeLabel } from '@/components/detail/ProductRow';
import { productsApi } from '@/api/products.api';
import { companiesApi } from '@/api/companies.api';
import { categoriesApi } from '@/api/categories.api';
import { ApiError } from '@/api/client';
import { confirmDestructive } from '@/utils/confirm';
import { ImageLightbox } from '@/components/ImageLightbox';
import type { Product, Company, Category } from '@/types/api';

// T4 Detalhe do produto (B11). sm: galeria (se houver imagens) e depois a informação.
// md+: galeria à esquerda (3fr, fixa no web) e informação à direita (2fr). As ações do dono
// saíram do header do `Stack` para junto do título. Editar (e gerir as imagens) é um ecrã
// T7 próprio (`/products/:id/edit`, B12); ao voltar, o detalhe recarrega sem esqueleto.
const factory = createStyles(({ colors, spacing, radius }) => ({
  container: { flex: 1 },
  identity: { gap: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  benefit: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.group,
    borderCurve: 'continuous',
    backgroundColor: colors.accentSoft,
  },
  benefitHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  benefitText: { color: colors.accentSoftText },
  mediaSkeleton: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.group,
    borderCurve: 'continuous',
    backgroundColor: colors.raised,
  },
  skeletonText: { gap: spacing.sm },
}));

function ProductDetailSkeleton() {
  const s = useStyles(factory);
  const { spacing } = useTheme();
  return (
    <DetailScaffold
      testID="product-detail.loading"
      leadFlex={3}
      lead={<View style={s.mediaSkeleton} />}
    >
      <View
        style={s.skeletonText}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Skeleton width="24%" />
        <Skeleton width="80%" height={spacing['2xl']} />
        <Skeleton width="92%" />
        <Skeleton width="64%" />
      </View>
    </DetailScaffold>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useTheme();
  const s = useStyles(factory);
  const { isWide } = useBreakpoint();

  const [product, setProduct] = useState<Product | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  // Começa a carregar: sem isto, o 1.º render (antes do efeito) mostrava o estado de erro.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const isOwner = !!user && !!company && company.ownerUserId === user.id;

  // 1.ª vez com esqueleto; ao voltar de "Editar", em silêncio (o conteúdo fica no ecrã).
  async function load(silent = false) {
    if (!id) return;
    if (!silent) setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const prod = await productsApi.get(id);
      const [co, cats] = await Promise.all([
        companiesApi.get(prod.companyId),
        categoriesApi.list(),
      ]);
      startTransition(() => {
        setProduct(prod);
        setCompany(co);
        setCategories(cats);
      });
    } catch (e) {
      startTransition(() => {
        setNotFound(e instanceof ApiError && e.status === 404);
        setError(e instanceof ApiError ? e.message : 'Não foi possível carregar o produto.');
      });
    } finally {
      startTransition(() => setLoading(false));
    }
  }

  const loaded = useRef(false);
  useFocusEffect(
    useCallback(() => {
      load(loaded.current);
      loaded.current = true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]),
  );

  async function handleDelete() {
    if (!product) return;
    const confirmed = await confirmDestructive({
      title: 'Apagar produto',
      message: `Tem a certeza que quer apagar "${product.name}"?`,
      confirmLabel: 'Apagar',
    });
    if (!confirmed) return;
    setActionError(null);
    setDeleting(true);
    try {
      await productsApi.delete(product.id);
      router.back();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Não foi possível apagar o produto.');
    } finally {
      setDeleting(false);
    }
  }

  const flatCategories = (function flatten(cats: Category[]): Category[] {
    return cats.flatMap((c) => [c, ...flatten(c.children)]);
  })(categories);

  const currentCategory = flatCategories.find((c) => c.id === product?.categoryId);

  if (loading && !product) return <ProductDetailSkeleton />;

  if (!product) {
    if (notFound) {
      return (
        <StateScreen
          testID="product-detail.not-found"
          icon="magnifying-glass"
          title="Produto não encontrado"
          description="O produto pode ter sido retirado pela empresa ou o endereço está errado."
          actionLabel="Ver o diretório"
          onAction={() => router.replace('/companies')}
        />
      );
    }
    return (
      <DetailScaffold>
        <ErrorState
          testID="product-detail.error"
          message={error ?? 'Não foi possível carregar o produto.'}
          onRetry={() => load()}
        />
      </DetailScaffold>
    );
  }

  const hasImages = product.images.length > 0;
  const lead = hasImages ? (
    <ProductGallery images={product.images} onOpen={setLightboxIndex} />
  ) : isWide ? (
    <GalleryPlaceholder service={product.type === 'Service'} />
  ) : undefined;

  const details = currentCategory
    ? [{ key: 'category', label: 'Categoria', value: currentCategory.name }]
    : [];

  return (
    <View style={s.container}>
      <DetailScaffold
        testID="product-detail.screen"
        lead={lead}
        leadFlex={3}
        refreshing={loading}
        onRefresh={() => load()}
      >
        <View style={s.identity}>
          <Text variant="label" color="accentText">
            {productTypeLabel(product).toUpperCase()}
          </Text>
          <Text variant="title" testID="product-detail.title" accessibilityRole="header">
            {product.name}
          </Text>
        </View>

        {isOwner ? (
          <View style={s.actions}>
            <Button
              testID="product-detail.edit"
              label="Editar"
              variant="secondary"
              size="sm"
              onPress={() => router.push(`/products/${product.id}/edit`)}
            />
            <Button
              testID="product-detail.delete"
              label="Apagar"
              variant="destructive"
              size="sm"
              loading={deleting}
              onPress={handleDelete}
            />
          </View>
        ) : null}
        {actionError ? (
          <InlineAlert tone="error" message={actionError} testID="product-detail.action-error" />
        ) : null}

        {product.description ? (
          <Text variant="body" color="text2">
            {product.description}
          </Text>
        ) : null}

        {product.hasMemberBenefit ? (
          <View style={s.benefit} testID="product-detail.benefit">
            <View style={s.benefitHead}>
              <Icon name="star" size={theme.size.icon.sm} color={theme.colors.accentSoftText} />
              <Text variant="label" style={s.benefitText}>
                BENEFÍCIO PARA MEMBROS
              </Text>
            </View>
            {product.memberBenefitDescription ? (
              <Text variant="body" style={s.benefitText}>
                {product.memberBenefitDescription}
              </Text>
            ) : null}
          </View>
        ) : null}

        {company ? (
          <DetailSection label="EMPRESA">
            <ListGroup>
              <CompanyRow
                testID="product-detail.company"
                company={company}
                last
                density={isWide ? 'compact' : 'regular'}
                onPress={() => router.push(`/companies/${company.id}`)}
              />
            </ListGroup>
          </DetailSection>
        ) : null}

        {details.length > 0 ? (
          <DetailSection label="DETALHES">
            <InfoGroup items={details} testID="product-detail.details" />
          </DetailSection>
        ) : null}
      </DetailScaffold>

      <ImageLightbox
        visible={lightboxIndex !== null}
        images={product.images}
        initialIndex={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
      />
    </View>
  );
}
