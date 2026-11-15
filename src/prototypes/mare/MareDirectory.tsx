// B · Maré — Diretório (T3 Lista). Mobile: horizonte + vidro + lista agrupada. Web ≥768: 1fr/3fr, Lista | Tabela.
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
import { CATEGORIES, domain } from '../data';
import { useDirectoryModel, topLevelOf, type DirectoryModel, type ModelInit } from '../model';
import {
  Bar,
  ContactAction,
  EmptyBlock,
  ErrorBlock,
  GlassGroup,
  GlassSurface,
  Highlight,
  PIcon,
  Plate,
  TABULAR,
} from '../shared';
import type { ProtoCompany, ProtoTokens } from '../types';

const LOGO = require('../../../assets/brand/aecc-logo.webp');
const hov = (s: unknown) => !!(s as { hovered?: boolean }).hovered;

function BrandPlate({ t }: { t: ProtoTokens }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: t.scheme === 'dark' ? 'rgba(246,248,250,0.92)' : 'rgba(255,255,255,0.92)',
        borderRadius: 10,
        borderCurve: 'continuous',
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}
    >
      <Image
        source={LOGO}
        style={{ width: 67, height: 28 }}
        resizeMode="contain"
        accessibilityLabel="AECC"
      />
    </View>
  );
}

function Hero({ t, m }: { t: ProtoTokens; m: DirectoryModel }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={t.type.title}>Quem faz Cascais</Text>
      <Text style={[t.type.meta, TABULAR]} testID="proto.count">
        {m.totalLabel}
      </Text>
    </View>
  );
}

function SearchCapsule({ t, m }: { t: ProtoTokens; m: DirectoryModel }) {
  const [focus, setFocus] = useState(false);
  return (
    <GlassSurface
      t={t}
      radius={26}
      interactive
      style={{
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 18,
        paddingRight: 8,
        gap: 10,
      }}
    >
      <PIcon t={t} name="search" color={t.c.text2} />
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
            borderRadius: 26,
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
    >
      {(s) => (
        <GlassSurface
          t={t}
          radius={20}
          interactive
          flat
          tintColor={active ? t.c.accent : undefined}
          solid={
            active
              ? s.pressed
                ? t.c.accentPressed
                : t.c.accent
              : s.pressed
                ? t.c.border
                : undefined
          }
          hovered={hov(s)}
          style={{ height: 40, paddingHorizontal: 16, justifyContent: 'center' }}
        >
          <Text
            style={{
              fontFamily: active ? t.f.semibold : t.f.medium,
              fontSize: 14,
              color: active ? t.c.onAccent : t.c.text,
            }}
          >
            {label}
          </Text>
        </GlassSurface>
      )}
    </Pressable>
  );
}

function ChipRows({ t, m }: { t: ProtoTokens; m: DirectoryModel }) {
  const top = topLevelOf(m.cat);
  const children = CATEGORIES.find((c) => c.id === top)?.children ?? [];
  return (
    <View style={{ gap: 8 }} testID="proto.chips">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20 }}
      >
        <GlassGroup spacing={10} style={{ flexDirection: 'row', gap: 8 }}>
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
        </GlassGroup>
      </ScrollView>
      {children.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          <GlassGroup spacing={10} style={{ flexDirection: 'row', gap: 8 }}>
            {children.map((c) => (
              <Chip
                key={c.id}
                t={t}
                label={c.name}
                active={m.cat === c.id}
                onPress={() => m.setCat(m.cat === c.id ? top : c.id)}
              />
            ))}
          </GlassGroup>
        </ScrollView>
      )}
    </View>
  );
}

/* ───────── superfície agrupada: linhas ───────── */

const primaryName = (c: ProtoCompany) => c.tradeName ?? c.name;

function Row({
  t,
  c,
  q,
  first,
  wide,
}: {
  t: ProtoTokens;
  c: ProtoCompany;
  q: string;
  first: boolean;
  wide: boolean;
}) {
  const plate = wide ? 40 : 48;
  const pad = 16;
  return (
    <View>
      {!first && (
        <View style={{ height: 1, backgroundColor: t.c.border, marginLeft: pad + plate + 12 }} />
      )}
      <Pressable
        testID={`proto.row.${c.id}`}
        style={(s) => ({
          minHeight: wide ? 64 : 72,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: pad,
          paddingVertical: 10,
          backgroundColor: s.pressed || hov(s) ? t.c.sunken : 'transparent',
        })}
      >
        <Plate t={t} company={c} size={plate} radius={12} />
        <View style={{ flex: 1, gap: 1 }}>
          <Highlight t={t} text={primaryName(c)} query={q} style={t.type.name} numberOfLines={2} />
          {c.caeDescription ? (
            <Highlight
              t={t}
              text={c.caeDescription}
              query={q}
              style={t.type.meta}
              numberOfLines={1}
            />
          ) : null}
          {c.locality && !wide ? (
            <Text style={[t.type.meta, { color: t.c.text3 }]}>{c.locality}</Text>
          ) : null}
        </View>
        {wide ? (
          <View style={{ alignItems: 'flex-end', gap: 1, minWidth: 170 }}>
            {c.locality ? (
              <Text style={[t.type.meta, { color: t.c.text3 }]}>{c.locality}</Text>
            ) : null}
            {c.phone ? <Text style={[t.type.meta, TABULAR]}>{c.phone}</Text> : null}
            {c.website ? (
              <Text style={[t.type.meta, { fontSize: 12, lineHeight: 15, color: t.c.text3 }]}>
                {domain(c.website)}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {c.phone ? (
              <ContactAction t={t} name="phone" label={`Ligar a ${primaryName(c)}`} size={34} />
            ) : null}
            {c.website ? (
              <ContactAction
                t={t}
                name="globe"
                label={`Abrir o site de ${primaryName(c)}`}
                size={34}
              />
            ) : null}
          </View>
        )}
        <PIcon t={t} name="chevron" size={14} color={t.c.text3} />
      </Pressable>
    </View>
  );
}

function SkeletonRow({
  t,
  i,
  first,
  wide,
}: {
  t: ProtoTokens;
  i: number;
  first: boolean;
  wide: boolean;
}) {
  const widths = ['58%', '46%', '66%', '52%', '62%', '42%'] as const;
  const plate = wide ? 40 : 48;
  return (
    <View>
      {!first && (
        <View style={{ height: 1, backgroundColor: t.c.border, marginLeft: 16 + plate + 12 }} />
      )}
      <View
        style={{
          minHeight: wide ? 64 : 72,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <View
          style={{
            width: plate,
            height: plate,
            borderRadius: 12,
            borderCurve: 'continuous',
            backgroundColor: t.c.sunken,
          }}
        />
        <View style={{ flex: 1, gap: 8 }}>
          <Bar t={t} w={widths[i % 6]} h={14} />
          <Bar t={t} w="40%" h={11} />
        </View>
      </View>
    </View>
  );
}

const COLS = { empresa: 3.2, atividade: 3, localidade: 1.8, telefone: 2, site: 2 } as const;

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
        paddingHorizontal: 16,
        backgroundColor: t.c.sunken,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderCurve: 'continuous',
        ...({ position: 'sticky', top: 0, zIndex: 2 } as unknown as ViewStyle),
      }}
    >
      {cell('Empresa', COLS.empresa)}
      {cell('Atividade', COLS.atividade)}
      {cell('Localidade', COLS.localidade)}
      {cell('Telefone', COLS.telefone)}
      {cell('Site', COLS.site)}
    </View>
  );
}

function TableRow({ t, c, q }: { t: ProtoTokens; c: ProtoCompany; q: string }) {
  const dash = <Text style={[t.type.meta, { color: t.c.text3 }]}>—</Text>;
  return (
    <Pressable
      testID={`proto.trow.${c.id}`}
      style={(s) => ({
        flexDirection: 'row',
        gap: 16,
        height: 48,
        alignItems: 'center',
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: t.c.border,
        backgroundColor: s.pressed || hov(s) ? t.c.sunken : 'transparent',
      })}
    >
      <View style={{ flex: COLS.empresa, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Plate t={t} company={c} size={30} radius={9} />
        <Highlight
          t={t}
          text={primaryName(c)}
          query={q}
          style={[t.type.body, { fontFamily: t.f.semibold, flex: 1 }]}
          numberOfLines={1}
        />
      </View>
      <View style={{ flex: COLS.atividade }}>
        {c.caeDescription ? (
          <Highlight
            t={t}
            text={c.caeDescription}
            query={q}
            style={t.type.meta}
            numberOfLines={1}
          />
        ) : (
          dash
        )}
      </View>
      <View style={{ flex: COLS.localidade }}>
        {c.locality ? (
          <Text style={t.type.meta} numberOfLines={1}>
            {c.locality}
          </Text>
        ) : (
          dash
        )}
      </View>
      <View style={{ flex: COLS.telefone }}>
        {c.phone ? <Text style={[t.type.meta, TABULAR]}>{c.phone}</Text> : dash}
      </View>
      <View style={{ flex: COLS.site }}>
        {c.website ? (
          <Text style={[t.type.meta, { color: t.c.accentText }]} numberOfLines={1}>
            {domain(c.website)}
          </Text>
        ) : (
          dash
        )}
      </View>
    </Pressable>
  );
}

function SkeletonTableRow({ t, i }: { t: ProtoTokens; i: number }) {
  const w = ['68%', '52%', '62%', '46%', '58%', '50%'] as const;
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 16,
        height: 48,
        alignItems: 'center',
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: t.c.border,
      }}
    >
      <View style={{ flex: COLS.empresa, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            borderCurve: 'continuous',
            backgroundColor: t.c.sunken,
          }}
        />
        <Bar t={t} w={w[i % 6]} h={13} />
      </View>
      {[COLS.atividade, COLS.localidade, COLS.telefone, COLS.site].map((f, k) => (
        <View key={k} style={{ flex: f }}>
          <Bar t={t} w="62%" h={11} />
        </View>
      ))}
    </View>
  );
}

/* ───────── sidebar (web) + alternador ───────── */

function Sidebar({ t, m }: { t: ProtoTokens; m: DirectoryModel }) {
  const top = topLevelOf(m.cat);
  const item = (label: string, active: boolean, onPress: () => void, indent = false) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={(s) => ({
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 40,
        marginLeft: indent ? 16 : 0,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderCurve: 'continuous',
        backgroundColor: s.pressed || hov(s) ? t.c.sunken : 'transparent',
      })}
    >
      {active ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 8,
            bottom: 8,
            width: 3,
            borderRadius: 2,
            backgroundColor: t.c.accent,
          }}
        />
      ) : null}
      <Text
        style={{
          fontFamily: active ? t.f.semibold : t.f.medium,
          fontSize: 14,
          color: active ? t.c.text : t.c.text2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
  return (
    <GlassSurface t={t} radius={20} style={{ padding: 8, gap: 2 }}>
      <Text style={[t.type.label, { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 }]}>
        CATEGORIAS
      </Text>
      {item('Todas', !m.cat, () => m.setCat(null))}
      {CATEGORIES.map((c) => (
        <View key={c.id}>
          {item(c.name, m.cat === c.id, () => m.setCat(c.id))}
          {top === c.id &&
            c.children.map((ch) => item(ch.name, m.cat === ch.id, () => m.setCat(ch.id), true))}
        </View>
      ))}
    </GlassSurface>
  );
}

function ViewToggle({ t, m }: { t: ProtoTokens; m: DirectoryModel }) {
  const opt = (v: 'primary' | 'table', label: string, icon: 'list' | 'table') => {
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
          paddingHorizontal: 14,
          borderRadius: 17,
          borderCurve: 'continuous',
          backgroundColor: on ? t.c.accent : 'transparent',
        }}
      >
        <PIcon t={t} name={icon} size={18} color={on ? t.c.onAccent : t.c.text2} />
        <Text
          style={{
            fontFamily: on ? t.f.semibold : t.f.medium,
            fontSize: 14,
            color: on ? t.c.onAccent : t.c.text2,
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
        borderRadius: 20,
        borderCurve: 'continuous',
        backgroundColor: t.c.sunken,
        borderWidth: 1,
        borderColor: t.c.border,
      }}
    >
      {opt('primary', 'Lista', 'list')}
      {opt('table', 'Tabela', 'table')}
    </View>
  );
}

/* ───────── ecrã ───────── */

export function MareDirectory({ t, init }: { t: ProtoTokens; init: ModelInit }) {
  const m = useDirectoryModel(init);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 768;

  const group: ViewStyle = {
    backgroundColor: t.c.surface,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: t.c.border,
  };

  const body = m.loading ? (
    wide && m.view === 'table' ? (
      <View style={group}>
        <TableHeader t={t} />
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonTableRow key={i} t={t} i={i} />
        ))}
      </View>
    ) : (
      <View style={group} testID="proto.skeleton">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} t={t} i={i} first={i === 0} wide={wide} />
        ))}
      </View>
    )
  ) : m.empty ? (
    <View style={group}>
      <EmptyBlock
        t={t}
        query={m.q}
        categoryName={m.categoryName}
        onClear={m.clearFilters}
        radius={14}
      />
    </View>
  ) : wide && m.view === 'table' ? (
    <View style={group} testID="proto.table">
      <TableHeader t={t} />
      {m.items.map((c) => (
        <TableRow key={c.id} t={t} c={c} q={m.q} />
      ))}
    </View>
  ) : (
    <View style={group} testID="proto.list">
      {m.items.map((c, i) => (
        <Row key={c.id} t={t} c={c} q={m.q} first={i === 0} wide={wide} />
      ))}
    </View>
  );

  const errorBlock = m.error ? (
    <View style={{ marginBottom: 16, marginHorizontal: wide ? 0 : 20 }}>
      <ErrorBlock t={t} onRetry={m.retry} radius={20} />
    </View>
  ) : null;

  if (wide) {
    return (
      <ScrollView
        testID="proto.screen"
        style={{ flex: 1, backgroundColor: t.c.bg }}
        contentContainerStyle={{ paddingBottom: 64 }}
      >
        <View style={{ backgroundColor: t.c.horizon, height: 260 }}>
          <View
            style={{
              width: '100%',
              maxWidth: 1240,
              alignSelf: 'center',
              paddingHorizontal: 32,
              paddingTop: 28,
              flex: 1,
            }}
          >
            <BrandPlate t={t} />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: 64,
                marginTop: 'auto',
                paddingBottom: 56,
              }}
            >
              <View style={{ flex: 1 }}>
                <Hero t={t} m={m} />
              </View>
              <View style={{ flex: 1 }}>
                <SearchCapsule t={t} m={m} />
              </View>
            </View>
          </View>
        </View>
        <View
          style={{
            width: '100%',
            maxWidth: 1240,
            alignSelf: 'center',
            paddingHorizontal: 32,
            marginTop: -32,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 32,
          }}
        >
          <View
            style={{
              flex: 1,
              minWidth: 220,
              ...({ position: 'sticky', top: 24 } as unknown as ViewStyle),
            }}
          >
            <Sidebar t={t} m={m} />
          </View>
          <View style={{ flex: 3, paddingTop: 52 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 }}>
              <ViewToggle t={t} m={m} />
            </View>
            {errorBlock}
            {body}
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      testID="proto.screen"
      style={{ flex: 1, backgroundColor: t.c.bg }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
    >
      <View
        style={{
          backgroundColor: t.c.horizon,
          height: 200 + insets.top,
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          gap: 18,
        }}
      >
        <BrandPlate t={t} />
        <Hero t={t} m={m} />
      </View>
      <View style={{ paddingHorizontal: 20, marginTop: -26, zIndex: 2 }}>
        <SearchCapsule t={t} m={m} />
      </View>
      <View style={{ marginTop: 16, marginBottom: 20 }}>
        <ChipRows t={t} m={m} />
      </View>
      {errorBlock}
      <View style={{ marginHorizontal: 20 }}>{body}</View>
    </ScrollView>
  );
}
