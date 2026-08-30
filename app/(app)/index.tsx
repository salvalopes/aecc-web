import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useCallback, useEffect, useState, startTransition } from 'react';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme/ThemeContext';
import { focusRingStyle, suppressNativeOutline } from '@/theme/tokens';
import { categoriesApi } from '@/api/categories.api';
import { companiesApi } from '@/api/companies.api';
import { ApiError } from '@/api/client';
import type { Category, CompanyDirectoryEntry } from '@/types/api';
import { Button, Card, CategoryTile, Icon, LoadingSpinner } from '@/components/ui';

const VALUE_PROPS = [
  { icon: 'buildings' as const, label: 'Descubra\nempresas locais' },
  { icon: 'users-three' as const, label: 'Conecte-se com\nprofissionais' },
  { icon: 'seal-check' as const, label: 'Valorize o que é\nde Cascais' },
  { icon: 'trend-up' as const, label: 'Impulsione\nnegócios' },
];

function SectionHeader({ title, onAction }: { title: string; onAction: () => void }) {
  const { colors, fontFamily, fontSize, fontWeight } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={{ fontFamily: fontFamily.display, fontWeight: fontWeight.bold, fontSize: fontSize.md, color: colors.textPrimary }}>
        {title}
      </Text>
      <Pressable onPress={onAction}>
        <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.accentGoldText }}>
          Ver todas
        </Text>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const { colors, glass, glassRadius, fontFamily, fontSize, fontWeight, lineHeight, spacing } = theme;
  const { width } = useWindowDimensions();

  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<CompanyDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([categoriesApi.list(), companiesApi.directory({ pageSize: 3 })])
      .then(([cats, companiesPage]) =>
        startTransition(() => {
          setCategories(cats);
          setCompanies(companiesPage.items);
        })
      )
      .catch(e =>
        startTransition(() => setError(e instanceof ApiError ? e.message : 'Erro ao carregar o início.'))
      )
      .finally(() => startTransition(() => setLoading(false)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function goToCompanies(params?: { search?: string; categoryId?: string; name?: string }) {
    router.push({ pathname: '/(app)/companies', params });
  }

  const numColumns = width >= 900 ? 4 : width >= 600 ? 3 : 2;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surfaceApp }} contentContainerStyle={styles.scrollContent}>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <View style={[styles.hero, { backgroundColor: colors.surfaceSunken, borderBottomColor: colors.borderSubtle }]}>
        <View style={[styles.heroPanel, glass.heroPanel.shadow, { borderRadius: glassRadius.panel, borderColor: glass.heroPanel.border }]}>
          <BlurView intensity={glass.heroPanel.blurIntensity} tint={glass.heroPanel.blurTint} style={StyleSheet.absoluteFillObject} />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: glass.heroPanel.tint, borderRadius: glassRadius.panel }]} />

          <Image
            source={require('../../assets/brand/aecc-logo.webp')}
            style={styles.heroLogo}
            resizeMode="contain"
            accessibilityLabel="AECC — Associação Empresarial do Concelho de Cascais"
          />
          <Text
            style={{
              fontFamily: fontFamily.body,
              fontSize: fontSize['2xs'],
              fontWeight: fontWeight.bold,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: colors.accentGoldText,
              marginBottom: spacing[8],
            }}
          >
            Diretório de Empresas
          </Text>
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontWeight: fontWeight.bold,
              fontSize: fontSize.xl,
              lineHeight: fontSize.xl * lineHeight.snug,
              color: colors.textPrimary,
              textAlign: 'center',
              maxWidth: 340,
            }}
          >
            Conectamos empresas.{'\n'}Fortalecemos a comunidade.{'\n'}Impulsionamos Cascais.
          </Text>

          <View style={styles.heroForm}>
            <View
              style={[
                styles.searchBar,
                {
                  borderRadius: glassRadius.control,
                  borderColor: glass.neutral.border,
                  backgroundColor: glass.neutral.tint,
                },
                focusRingStyle(colors.focusRing, searchFocused),
              ]}
            >
              <Icon name="magnifying-glass" size={18} color={colors.textTertiary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Pesquisar empresas..."
                placeholderTextColor={colors.textTertiary}
                style={[
                  { flex: 1, minWidth: 0, fontFamily: fontFamily.body, fontSize: fontSize.md, color: colors.textPrimary },
                  suppressNativeOutline,
                ]}
              />
            </View>
            <Button variant="gold" fullWidth onPress={() => goToCompanies({ search: search.trim() || undefined })}>
              Ver empresas
            </Button>
          </View>
        </View>
      </View>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <View style={styles.errorWrap}>
          <Icon name="warning-circle" size={18} color={colors.error} />
          <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.error, textAlign: 'center' }}>{error}</Text>
          <Button variant="secondary" size="sm" onPress={load}>
            Tentar novamente
          </Button>
        </View>
      ) : (
        <>
          {/* ── Value props ────────────────────────────────────────────────── */}
          <View style={styles.valueProps}>
            {VALUE_PROPS.map(v => (
              <View key={v.icon} style={styles.valueProp}>
                <View
                  style={[
                    styles.valuePropWell,
                    { borderRadius: 999, borderColor: glass.neutral.border, backgroundColor: glass.neutral.tint },
                  ]}
                >
                  <Icon name={v.icon} size={22} color={colors.accentPrimary} />
                </View>
                <Text
                  style={{
                    fontFamily: fontFamily.body,
                    fontSize: fontSize['2xs'],
                    fontWeight: fontWeight.semibold,
                    color: colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: fontSize['2xs'] * 1.3,
                  }}
                >
                  {v.label}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Categories ───────────────────────────────────────────────────── */}
          <SectionHeader title="Categorias" onAction={() => goToCompanies()} />
          <View style={[styles.grid, { paddingHorizontal: spacing[6] }]}>
            {categories.slice(0, 8).map(c => (
              <View key={c.id} style={{ width: `${100 / numColumns}%`, padding: spacing[3] }}>
                <CategoryTile slug={c.slug} label={c.name} onPress={() => goToCompanies({ categoryId: c.id, name: c.name })} />
              </View>
            ))}
          </View>

          {/* ── Featured companies ───────────────────────────────────────────── */}
          <SectionHeader title="Empresas em destaque" onAction={() => goToCompanies()} />
          <View style={[styles.companyList, { paddingHorizontal: spacing[6], gap: spacing[5] }]}>
            {companies.map(co => (
              <Card
                key={co.id}
                interactive
                padding={10}
                onPress={() => router.push(`/(app)/companies/${co.id}`)}
                style={styles.companyRow}
              >
                {co.logoUrl ? (
                  <Image source={{ uri: co.logoUrl }} style={[styles.companyLogo, { borderRadius: theme.radius.md }]} />
                ) : (
                  <View style={[styles.companyLogo, styles.companyLogoFallback, { backgroundColor: colors.surfaceSunken, borderRadius: theme.radius.md }]}>
                    <Icon name="storefront" size={20} color={colors.textTertiary} />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    style={{ fontFamily: fontFamily.body, fontWeight: fontWeight.bold, fontSize: fontSize.base, color: colors.textPrimary }}
                  >
                    {co.name}
                  </Text>
                  {!!co.locality && (
                    <View style={styles.companyLocality}>
                      <Icon name="house-line" size={11} color={colors.textTertiary} />
                      <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize['2xs'], color: colors.textTertiary }}>
                        {co.locality}
                      </Text>
                    </View>
                  )}
                </View>
                <Icon name="caret-right" size={16} color={colors.textTertiary} />
              </Card>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 24 },
  hero: { padding: 20, borderBottomWidth: 1 },
  heroPanel: { alignItems: 'center', padding: 20, borderWidth: 1, overflow: 'hidden' },
  heroLogo: { width: '70%', maxWidth: 220, height: 64, marginBottom: 6 },
  heroForm: { width: '100%', maxWidth: 320, marginTop: 20, gap: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 14, borderWidth: 1 },
  errorWrap: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 48 },
  valueProps: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingTop: 20 },
  valueProp: { width: '25%', alignItems: 'center', gap: 7, paddingHorizontal: 4, marginBottom: 8 },
  valuePropWell: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  companyList: { flexDirection: 'column', paddingBottom: 8 },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  companyLogo: { width: 46, height: 46 },
  companyLogoFallback: { alignItems: 'center', justifyContent: 'center' },
  companyLocality: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
});
