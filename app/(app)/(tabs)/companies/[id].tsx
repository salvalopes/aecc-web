import { Linking, View } from 'react-native';
import { useCallback, useRef, useState, startTransition } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useBreakpoint } from '@/theme/useBreakpoint';
import { companiesApi } from '@/api/companies.api';
import { productsApi } from '@/api/products.api';
import { ApiError } from '@/api/client';
import { confirmDestructive } from '@/utils/confirm';
import { formatAddressLine } from '@/utils/address';
import { absoluteUrl, displayDomain, mapsUrl, telUrl } from '@/utils/text';
import type { Company, Product } from '@/types/api';
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
// (2fr). As ações do dono saíram do header do `Stack` para junto da identidade. Editar e
// "Novo produto" são ecrãs T7 próprios (B12); ao voltar, o detalhe recarrega sem esqueleto.
const factory = createStyles(({ colors, spacing, size, radii }) => ({
  container: { flex: 1 },
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
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

  const isOwner = !!user && !!company && company.ownerUserId === user.id;

  // 1.ª vez com esqueleto; ao voltar de um formulário T7 (editar, novo produto), em silêncio.
  async function load(silent = false) {
    if (!id) return;
    if (!silent) setLoading(true);
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

  const loaded = useRef(false);
  useFocusEffect(
    useCallback(() => {
      load(loaded.current);
      loaded.current = true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]),
  );

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
          onRetry={() => load()}
        />
      </DetailScaffold>
    );
  }

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
            onPress={() => router.push(`/my-companies/${company.id}/edit`)}
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
    <View style={s.container}>
      <DetailScaffold
        overTabs
        testID="company-detail.screen"
        lead={lead}
        refreshing={loading}
        onRefresh={() => load()}
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
                onPress={() => router.push(`/products/new?companyId=${company.id}`)}
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
    </View>
  );
}
