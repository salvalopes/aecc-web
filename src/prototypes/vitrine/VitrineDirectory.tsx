// A · Vitrine — Diretório (T3 Lista). Mobile: linhas com hairline. Web ≥768: cabeçalho 7fr/5fr + Grelha | Tabela.
import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIES, domain, findCategory } from '../data';
import { useDirectoryModel, topLevelOf, type DirectoryModel, type ModelInit } from '../model';
import {
  Bar,
  ContactAction,
  EmptyBlock,
  ErrorBlock,
  GlassSurface,
  Highlight,
  PIcon,
  Plate,
  TABULAR,
} from '../shared';
import type { ProtoCompany, ProtoTokens } from '../types';

const LOGO = require('../../../assets/brand/aecc-logo.webp');
const hov = (s: unknown) => !!(s as { hovered?: boolean }).hovered;

/* ───────── cabeçalho ───────── */

function BrandLogo({ t, height = 28 }: { t: ProtoTokens; height?: number }) {
  const w = Math.round((height * 239) / 100);
  const img = (
    <Image
      source={LOGO}
      style={{ width: w, height }}
      resizeMode="contain"
      accessibilityLabel="AECC"
    />
  );
  if (t.scheme === 'light') return img;
  // dark: o lockup é navy sobre transparente → plate claro com raio 8
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: t.c.logoPlate,
        borderRadius: 8,
        borderCurve: 'continuous',
        padding: 4,
      }}
    >
      {img}
    </View>
  );
}

function SearchField({ t, m, wide }: { t: ProtoTokens; m: DirectoryModel; wide?: boolean }) {
  const [focus, setFocus] = useState(false);
  return (
    <GlassSurface
      t={t}
      radius={14}
      style={{
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 16,
        paddingRight: 8,
        gap: 10,
        ...(wide ? null : ({ boxShadow: `0 8px 24px ${t.c.shadowTint}` } as unknown as ViewStyle)),
      }}
    >
      <PIcon t={t} name="search" color={t.c.text3} />
      <TextInput
        testID="proto.search"
        value={m.q}
        onChangeText={m.setQ}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder="Nome, atividade ou localidade"
        placeholderTextColor={t.c.text3}
        selectionColor={t.c.accent}
        autoCorrect={false}
        style={[
          t.type.body,
          { flex: 1, fontSize: 16, height: 52, padding: 0 },
          { outlineStyle: 'none' } as unknown as object,
        ]}
        accessibilityLabel="Pesquisar empresas"
      />
      {m.q ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Limpar pesquisa"
          onPress={() => m.setQ('')}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <PIcon t={t} name="close" size={18} color={t.c.text2} />
        </Pressable>
      ) : null}
      {focus ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -1,
            left: -1,
            right: -1,
            bottom: -1,
            borderRadius: 14,
            borderCurve: 'continuous',
            borderWidth: 2,
            borderColor: t.c.accent,
          }}
        />
      ) : null}
    </GlassSurface>
  );
}

function Chip({
  t,
  label,
  active,
  onPress,
}: {
  t: ProtoTokens;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={(s) => ({
        height: 36,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderCurve: 'continuous',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: active ? t.c.accentSoft : t.c.border,
        backgroundColor: active ? t.c.accentSoft : s.pressed || hov(s) ? t.c.sunken : 'transparent',
      })}
    >
      <Text
        style={{
          fontFamily: active ? t.f.semibold : t.f.medium,
          fontSize: 14,
          color: active ? t.c.accentSoftText : t.c.text2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Chips({ t, m, wrap }: { t: ProtoTokens; m: DirectoryModel; wrap?: boolean }) {
  const top = topLevelOf(m.cat);
  const children = findCategory(top)?.children ?? [];
  const rowStyle: ViewStyle = wrap
    ? { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }
    : { flexDirection: 'row', gap: 8, paddingHorizontal: 20 };
  const row = (nodes: React.ReactNode) =>
    wrap ? (
      <View style={rowStyle}>{nodes}</View>
    ) : (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={rowStyle}
      >
        {nodes}
      </ScrollView>
    );
  return (
    <View style={{ gap: 8 }} testID="proto.chips">
      {row(
        <>
          <Chip t={t} label="Todas" active={!m.cat} onPress={() => m.setCat(null)} />
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              t={t}
              label={c.name}
              active={top === c.id}
              onPress={() => m.setCat(c.id)}
            />
          ))}
        </>,
      )}
      {children.length > 0 &&
        row(
          <>
            {children.map((c) => (
              <Chip
                key={c.id}
                t={t}
                label={c.name}
                active={m.cat === c.id}
                onPress={() => m.setCat(top === c.id ? top : c.id)}
              />
            ))}
          </>,
        )}
    </View>
  );
}

/* ───────── linhas / tiles / tabela ───────── */

function primaryName(c: ProtoCompany) {
  return c.tradeName ?? c.name;
}
function subline(c: ProtoCompany) {
  return [c.caeDescription, c.locality].filter(Boolean).join(' · ');
}

function Row({ t, c, q, first }: { t: ProtoTokens; c: ProtoCompany; q: string; first: boolean }) {
  return (
    <Pressable
      testID={`proto.row.${c.id}`}
      style={(s) => ({
        minHeight: 80,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: t.c.border,
        backgroundColor: s.pressed || hov(s) ? t.c.sunken : 'transparent',
      })}
    >
      <Plate t={t} company={c} size={56} radius={10} />
      <View style={{ flex: 1, gap: 2 }}>
        <Highlight t={t} text={primaryName(c)} query={q} style={t.type.name} numberOfLines={2} />
        {c.tradeName ? (
          <Highlight t={t} text={c.name} query={q} style={t.type.meta} numberOfLines={1} />
        ) : null}
        {subline(c) ? (
          <Highlight
            t={t}
            text={subline(c)}
            query={q}
            style={[t.type.meta, { color: t.c.text3 }]}
            numberOfLines={1}
          />
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {c.phone ? (
          <ContactAction t={t} name="phone" label={`Ligar a ${primaryName(c)}`} size={36} />
        ) : null}
        {c.website ? (
          <ContactAction t={t} name="globe" label={`Abrir o site de ${primaryName(c)}`} size={36} />
        ) : null}
        <PIcon t={t} name="chevron" size={16} color={t.c.text3} />
      </View>
    </Pressable>
  );
}

function SkeletonRow({ t, i, first }: { t: ProtoTokens; i: number; first: boolean }) {
  const widths = ['62%', '48%', '70%', '55%', '66%', '44%'] as const;
  return (
    <View
      style={{
        minHeight: 80,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: t.c.border,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 10,
          borderCurve: 'continuous',
          backgroundColor: t.c.sunken,
        }}
      />
      <View style={{ flex: 1, gap: 9 }}>
        <Bar t={t} w={widths[i % 6]} h={14} />
        <Bar t={t} w="38%" h={11} />
        <Bar t={t} w="54%" h={11} />
      </View>
    </View>
  );
}

function Tile({ t, c, q }: { t: ProtoTokens; c: ProtoCompany; q: string }) {
  return (
    <Pressable
      testID={`proto.tile.${c.id}`}
      accessibilityRole="button"
      style={(s) => ({
        flexBasis: '48.5%',
        flexGrow: 1,
        minHeight: 272,
        padding: 20,
        gap: 14,
        borderRadius: 16,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: hov(s) ? t.c.text3 : t.c.border,
        backgroundColor: s.pressed ? t.c.sunken : t.c.surface,
      })}
    >
      <Plate t={t} company={c} size={96} radius={12} />
      <View style={{ gap: 3 }}>
        <Highlight t={t} text={primaryName(c)} query={q} style={t.type.name} numberOfLines={2} />
        {c.tradeName ? (
          <Highlight t={t} text={c.name} query={q} style={t.type.meta} numberOfLines={1} />
        ) : null}
        {c.caeDescription ? (
          <Highlight
            t={t}
            text={c.caeDescription}
            query={q}
            style={t.type.meta}
            numberOfLines={2}
          />
        ) : null}
        {c.locality ? <Text style={[t.type.meta, { color: t.c.text3 }]}>{c.locality}</Text> : null}
      </View>
      <View style={{ marginTop: 'auto', flexDirection: 'row', gap: 12, minHeight: 20 }}>
        {c.phone ? <Text style={[t.type.meta, TABULAR]}>{c.phone}</Text> : null}
        {c.website ? (
          <Text style={[t.type.meta, { color: t.c.accentText }]}>{domain(c.website)}</Text>
        ) : null}
        {!c.phone && !c.website ? (
          <Text style={[t.type.meta, { color: t.c.text3 }]}>Sem contactos</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function SkeletonTile({ t }: { t: ProtoTokens }) {
  return (
    <View
      style={{
        flexBasis: '48.5%',
        flexGrow: 1,
        minHeight: 272,
        padding: 20,
        gap: 14,
        borderRadius: 16,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: t.c.border,
        backgroundColor: t.c.surface,
      }}
    >
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 12,
          borderCurve: 'continuous',
          backgroundColor: t.c.sunken,
        }}
      />
      <View style={{ gap: 9 }}>
        <Bar t={t} w="58%" h={16} />
        <Bar t={t} w="72%" h={12} />
        <Bar t={t} w="30%" h={12} />
      </View>
      <View style={{ marginTop: 'auto' }}>
        <Bar t={t} w="46%" h={12} />
      </View>
    </View>
  );
}

const COLS = { empresa: 3.2, atividade: 3, localidade: 2, contacto: 2.6 } as const;

function TableHeader({ t }: { t: ProtoTokens }) {
  const cell = (label: string, flex: number) => (
    <Text style={[t.type.label, { flex }]}>{label.toUpperCase()}</Text>
  );
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 16,
        height: 44,
        alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: t.c.sunken,
        borderBottomWidth: 1,
        borderBottomColor: t.c.border,
        ...({ position: 'sticky', top: 0, zIndex: 2 } as unknown as ViewStyle),
      }}
    >
      {cell('Empresa', COLS.empresa)}
      {cell('Atividade', COLS.atividade)}
      {cell('Localidade', COLS.localidade)}
      {cell('Contacto', COLS.contacto)}
    </View>
  );
}

function TableRow({ t, c, q }: { t: ProtoTokens; c: ProtoCompany; q: string }) {
  return (
    <Pressable
      testID={`proto.trow.${c.id}`}
      style={(s) => ({
        flexDirection: 'row',
        gap: 16,
        height: 52,
        alignItems: 'center',
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: t.c.border,
        backgroundColor: s.pressed || hov(s) ? t.c.sunken : 'transparent',
      })}
    >
      <View style={{ flex: COLS.empresa, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Plate t={t} company={c} size={32} radius={8} />
        <View style={{ flex: 1 }}>
          <Highlight
            t={t}
            text={primaryName(c)}
            query={q}
            style={[t.type.body, { fontFamily: t.f.semibold, lineHeight: 18 }]}
            numberOfLines={1}
          />
          {c.tradeName ? (
            <Highlight
              t={t}
              text={c.name}
              query={q}
              style={[t.type.meta, { fontSize: 12, lineHeight: 15 }]}
              numberOfLines={1}
            />
          ) : null}
        </View>
      </View>
      <View style={{ flex: COLS.atividade }}>
        {c.caeDescription ? (
          <Highlight
            t={t}
            text={c.caeDescription}
            query={q}
            style={t.type.meta}
            numberOfLines={2}
          />
        ) : (
          <Text style={[t.type.meta, { color: t.c.text3 }]}>—</Text>
        )}
      </View>
      <Text
        style={[t.type.meta, { flex: COLS.localidade, color: c.locality ? t.c.text2 : t.c.text3 }]}
        numberOfLines={1}
      >
        {c.locality ?? '—'}
      </Text>
      <View style={{ flex: COLS.contacto }}>
        {c.phone ? (
          <Text style={[t.type.meta, TABULAR]}>{c.phone}</Text>
        ) : (
          <Text style={[t.type.meta, { color: t.c.text3 }]}>—</Text>
        )}
        {c.website ? (
          <Text style={[t.type.meta, { fontSize: 12, lineHeight: 15, color: t.c.accentText }]}>
            {domain(c.website)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function SkeletonTableRow({ t, i }: { t: ProtoTokens; i: number }) {
  const w = ['70%', '55%', '64%', '48%', '60%', '52%'] as const;
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 16,
        height: 52,
        alignItems: 'center',
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: t.c.border,
      }}
    >
      <View style={{ flex: COLS.empresa, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            borderCurve: 'continuous',
            backgroundColor: t.c.sunken,
          }}
        />
        <Bar t={t} w={w[i % 6]} h={13} />
      </View>
      <View style={{ flex: COLS.atividade }}>
        <Bar t={t} w="75%" h={11} />
      </View>
      <View style={{ flex: COLS.localidade }}>
        <Bar t={t} w="50%" h={11} />
      </View>
      <View style={{ flex: COLS.contacto }}>
        <Bar t={t} w="60%" h={11} />
      </View>
    </View>
  );
}

function ViewToggle({ t, m }: { t: ProtoTokens; m: DirectoryModel }) {
  const opt = (v: 'primary' | 'table', label: string, icon: 'grid' | 'table') => {
    const on = m.view === v;
    return (
      <Pressable
        key={v}
        testID={`proto.view.${v}`}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        onPress={() => m.setView(v)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          height: 34,
          paddingHorizontal: 12,
          borderRadius: 9,
          borderCurve: 'continuous',
          backgroundColor: on ? t.c.surface : 'transparent',
          borderWidth: 1,
          borderColor: on ? t.c.border : 'transparent',
        }}
      >
        <PIcon t={t} name={icon} size={18} color={on ? t.c.accentText : t.c.text3} />
        <Text
          style={{
            fontFamily: on ? t.f.semibold : t.f.medium,
            fontSize: 14,
            color: on ? t.c.text : t.c.text2,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };
  return (
    <View
      style={{
        flexDirection: 'row',
        padding: 3,
        gap: 2,
        borderRadius: 12,
        borderCurve: 'continuous',
        backgroundColor: t.c.sunken,
      }}
    >
      {opt('primary', 'Grelha', 'grid')}
      {opt('table', 'Tabela', 'table')}
    </View>
  );
}

/* ───────── ecrã ───────── */

export function VitrineDirectory({ t, init }: { t: ProtoTokens; init: ModelInit }) {
  const m = useDirectoryModel(init);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 768;

  const state = m.loading ? (
    wide ? (
      m.view === 'table' ? (
        <View
          style={{
            borderRadius: 16,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: t.c.border,
            backgroundColor: t.c.surface,
          }}
        >
          <TableHeader t={t} />
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonTableRow key={i} t={t} i={i} />
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonTile key={i} t={t} />
          ))}
        </View>
      )
    ) : (
      <View testID="proto.skeleton">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} t={t} i={i} first={i === 0} />
        ))}
      </View>
    )
  ) : m.empty ? (
    <EmptyBlock
      t={t}
      query={m.q}
      categoryName={m.categoryName}
      onClear={m.clearFilters}
      radius={12}
    />
  ) : wide ? (
    m.view === 'table' ? (
      <View
        testID="proto.table"
        style={{
          borderRadius: 16,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: t.c.border,
          backgroundColor: t.c.surface,
        }}
      >
        <TableHeader t={t} />
        {m.items.map((c) => (
          <TableRow key={c.id} t={t} c={c} q={m.q} />
        ))}
      </View>
    ) : (
      <View testID="proto.grid" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        {m.items.map((c) => (
          <Tile key={c.id} t={t} c={c} q={m.q} />
        ))}
      </View>
    )
  ) : (
    <View testID="proto.list">
      {m.items.map((c, i) => (
        <Row key={c.id} t={t} c={c} q={m.q} first={i === 0} />
      ))}
    </View>
  );

  const errorBlock = m.error ? (
    <View style={{ marginHorizontal: wide ? 0 : 20, marginBottom: 16 }}>
      <ErrorBlock t={t} onRetry={m.retry} radius={14} />
    </View>
  ) : null;

  if (wide) {
    return (
      <ScrollView
        testID="proto.screen"
        style={{ flex: 1, backgroundColor: t.c.bg }}
        contentContainerStyle={{ paddingBottom: 64 }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 1200,
            alignSelf: 'center',
            paddingHorizontal: 32,
            paddingTop: 32,
          }}
        >
          {/* cabeçalho dividido 7fr / 5fr */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 48, marginBottom: 28 }}>
            <View style={{ flex: 7, gap: 14 }}>
              <BrandLogo t={t} />
              <View style={{ gap: 4 }}>
                <Text style={t.type.title}>Diretório</Text>
                <Text style={[t.type.meta, TABULAR]} testID="proto.count">
                  {m.totalLabel}
                </Text>
              </View>
            </View>
            <View style={{ flex: 5 }}>
              <SearchField t={t} m={m} wide />
            </View>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 24,
              marginBottom: 20,
            }}
          >
            <View style={{ flex: 1 }}>
              <Chips t={t} m={m} wrap />
            </View>
            <ViewToggle t={t} m={m} />
          </View>
          {errorBlock}
          {state}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      testID="proto.screen"
      style={{ flex: 1, backgroundColor: t.c.bg }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      stickyHeaderIndices={[1]}
    >
      <View
        style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 12, gap: 14 }}
      >
        <BrandLogo t={t} />
        <View style={{ gap: 4 }}>
          <Text style={t.type.title}>Diretório</Text>
          <Text style={[t.type.meta, TABULAR]} testID="proto.count">
            {m.totalLabel}
          </Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 14 }}>
        <SearchField t={t} m={m} />
      </View>
      <View style={{ paddingBottom: 16 }}>
        <Chips t={t} m={m} />
      </View>
      {errorBlock}
      {state}
    </ScrollView>
  );
}
