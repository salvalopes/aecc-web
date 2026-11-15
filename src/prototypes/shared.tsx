// Peças partilhadas pelas duas direções. Só leem tokens (ProtoTokens); nada aqui toca em src/theme.
import { useEffect, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import {
  GlassContainer,
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import { ICON_PATHS, type IconName } from './icons-paths';
import { initials, splitByTerm } from './data';
import type { ProtoCompany, ProtoTokens } from './types';

/* ───────────────────────── ícones ───────────────────────── */

export function PIcon({
  t,
  name,
  size = 20,
  color,
}: {
  t: ProtoTokens;
  name: IconName;
  size?: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256">
      <Path d={ICON_PATHS[t.iconWeight][name]} fill={color} />
    </Svg>
  );
}

/* ───────────────────────── vidro (3 ramos) ───────────────────────── */

export interface GlassCapability {
  /** iOS 26 com Liquid Glass real e Reduce Transparency desligado. */
  native: boolean;
  liquidGlass: boolean;
  glassApi: boolean;
  reduceTransparency: boolean;
}

let logged = false;
export function useGlassCapability(): GlassCapability {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AccessibilityInfo.isReduceTransparencyEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduce);
    return () => sub.remove();
  }, []);
  const liquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();
  const glassApi = Platform.OS === 'ios' && isGlassEffectAPIAvailable();
  if (!logged && Platform.OS === 'ios') {
    logged = true;
    // Verificação exigida pela Fase B: o build tem de ser Xcode 26 e devolver true.
    console.log(
      `[proto] isLiquidGlassAvailable()=${liquidGlass} isGlassEffectAPIAvailable()=${glassApi} reduceTransparency=${reduce}`,
    );
  }
  return {
    native: liquidGlass && glassApi && !reduce,
    liquidGlass,
    glassApi,
    reduceTransparency: reduce,
  };
}

/** Sem overflow:hidden (quebra o GlassView); borderCurve contínuo; boxShadow no lugar de shadow*. */
export function GlassSurface({
  t,
  radius,
  style,
  tintColor,
  interactive,
  solid,
  hovered,
  flat,
  testID,
  children,
}: {
  t: ProtoTokens;
  radius: number;
  style?: StyleProp<ViewStyle>;
  /** Tint do vidro nativo (chip ativo da B). No fallback, vira o fundo sólido. */
  tintColor?: string;
  interactive?: boolean;
  /** Fundo sólido de fallback (substitui glassSolid) — p.ex. chip ativo dourado. */
  solid?: string;
  hovered?: boolean;
  /** Sem sombra exterior (chips pequenos): só o highlight inset. */
  flat?: boolean;
  testID?: string;
  children?: ReactNode;
}) {
  const cap = useGlassCapability();
  const base: ViewStyle = { borderRadius: radius, borderCurve: 'continuous' };
  if (Platform.OS === 'ios' && cap.native) {
    return (
      <GlassView
        testID={testID}
        glassEffectStyle="regular"
        tintColor={tintColor}
        isInteractive={interactive}
        colorScheme={t.scheme}
        style={[base, style]}
      >
        {children}
      </GlassView>
    );
  }
  if (Platform.OS === 'web') {
    const web = {
      backgroundColor: tintColor ?? (hovered ? t.c.glassTintHover : t.c.glassTint),
      backdropFilter: t.id === 'mare' ? 'blur(24px) saturate(170%)' : 'blur(20px) saturate(150%)',
      WebkitBackdropFilter:
        t.id === 'mare' ? 'blur(24px) saturate(170%)' : 'blur(20px) saturate(150%)',
      borderWidth: 1,
      borderColor: t.c.glassBorder,
      boxShadow: flat
        ? `inset 0 1px 0 ${t.c.glassHighlight}`
        : t.id === 'mare'
          ? `inset 0 1px 0 ${t.c.glassHighlight}, 0 12px 32px ${t.c.shadowTint}`
          : `inset 0 1px 0 ${t.c.glassHighlight}, 0 8px 24px ${t.c.shadowTint}`,
    } as unknown as ViewStyle;
    return (
      <View testID={testID} style={[base, web, style]}>
        {children}
      </View>
    );
  }
  // iOS < 26 / Reduce Transparency / Android: superfície sólida + hairline + highlight inset (S12)
  const fallback = {
    backgroundColor: solid ?? t.c.glassSolid,
    borderWidth: 1,
    borderColor: t.c.glassBorder,
    boxShadow: `inset 0 1px 0 ${t.c.glassHighlight}`,
  } as unknown as ViewStyle;
  return (
    <View testID={testID} style={[base, fallback, style]}>
      {children}
    </View>
  );
}

/** Funde os filhos GlassView no iOS 26; nos outros ramos é um simples contentor. */
export function GlassGroup({
  spacing,
  children,
  style,
}: {
  spacing: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const cap = useGlassCapability();
  if (Platform.OS === 'ios' && cap.native) {
    return (
      <GlassContainer spacing={spacing} style={style}>
        {children}
      </GlassContainer>
    );
  }
  return <View style={style}>{children}</View>;
}

/* ───────────────────────── logos fictícios + plate ───────────────────────── */

// "logoUrl: 'mock:<id>'" → marca desenhada localmente (o protótipo não faz pedidos de rede).
function Mark({ id }: { id: string }) {
  switch (id) {
    case 'mare':
      return (
        <>
          <Circle cx="24" cy="24" r="22" fill="#12456B" />
          <Path d="M6 27c4-5 8-5 12 0s8 5 12 0 8-5 12 0v6H6z" fill="#E9F2F7" />
          <Path
            d="M6 20c4-5 8-5 12 0s8 5 12 0 8-5 12 0"
            stroke="#E9F2F7"
            strokeWidth="2.4"
            fill="none"
          />
        </>
      );
    case 'oficina':
      return (
        <>
          <Rect x="3" y="3" width="42" height="42" rx="9" fill="#B4442B" />
          <Circle cx="24" cy="24" r="10" stroke="#FBE9E3" strokeWidth="5" fill="none" />
          <Rect x="22" y="6" width="4" height="9" fill="#FBE9E3" />
          <Rect x="22" y="33" width="4" height="9" fill="#FBE9E3" />
        </>
      );
    case 'dental':
      return (
        <>
          <Circle cx="24" cy="24" r="22" fill="#2B8C86" />
          <Path
            d="M15 16c3-3 6-1 9-1s6-2 9 1c3 4 0 9-1 13-1 5-2 7-4 7s-2-5-4-5-2 5-4 5-3-2-4-7c-1-4-4-9-1-13z"
            fill="#FFFFFF"
          />
        </>
      );
    case 'padaria':
      return (
        <>
          <Rect x="3" y="3" width="42" height="42" rx="21" fill="#E3B15A" />
          <Path d="M10 27c0-9 6-13 14-13s14 4 14 13c0 3-2 5-5 5H15c-3 0-5-2-5-5z" fill="#8A5A22" />
          <Path
            d="M17 21l3 5M24 19l2 6M31 21l2 5"
            stroke="#E3B15A"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </>
      );
    case 'contas':
      return (
        <>
          <Rect x="3" y="3" width="42" height="42" rx="8" fill="#1F3D2E" />
          <Rect x="11" y="28" width="6" height="10" fill="#9ED3B1" />
          <Rect x="21" y="20" width="6" height="18" fill="#9ED3B1" />
          <Rect x="31" y="11" width="6" height="27" fill="#9ED3B1" />
        </>
      );
    case 'pescador':
      return (
        <>
          <Circle cx="24" cy="24" r="22" fill="#8E1F2F" />
          <Path d="M9 24c5-8 13-8 18-3l8-5v16l-8-5c-5 5-13 5-18-3z" fill="#F6E3D6" />
          <Circle cx="15" cy="23" r="1.8" fill="#8E1F2F" />
        </>
      );
    case 'advogados':
      return (
        <>
          <Rect x="3" y="3" width="42" height="42" rx="6" fill="#2B2A33" />
          <Path
            d="M24 10v26M12 36h24M14 16h20M14 16l-5 11h10zM34 16l-5 11h10z"
            stroke="#E7D3A0"
            strokeWidth="2.2"
            fill="none"
          />
        </>
      );
    case 'padel':
      return (
        <>
          <Circle cx="24" cy="24" r="22" fill="#2F6B3A" />
          <Circle cx="24" cy="24" r="11" fill="#D5E84B" />
          <Path
            d="M15 18c5 3 5 9 0 12M33 18c-5 3-5 9 0 12"
            stroke="#2F6B3A"
            strokeWidth="2"
            fill="none"
          />
        </>
      );
    case 'farmacia':
      return (
        <>
          <Rect x="3" y="3" width="42" height="42" rx="10" fill="#1E7F4F" />
          <Path d="M20 12h8v8h8v8h-8v8h-8v-8h-8v-8h8z" fill="#FFFFFF" />
        </>
      );
    default:
      return null;
  }
}

export function Plate({
  t,
  company,
  size,
  radius,
}: {
  t: ProtoTokens;
  company: Pick<ProtoCompany, 'name' | 'tradeName' | 'logoUrl'>;
  size: number;
  radius: number;
}) {
  const hasLogo = !!company.logoUrl;
  const inner = Math.round(size * 0.68);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        borderCurve: 'continuous',
        backgroundColor: hasLogo ? t.c.logoPlate : t.c.accentSoft,
        borderWidth: 1,
        borderColor: hasLogo ? t.c.border : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {hasLogo ? (
        <Svg width={inner} height={inner} viewBox="0 0 48 48">
          <Mark id={company.logoUrl!.replace('mock:', '')} />
        </Svg>
      ) : (
        <Text
          style={{
            fontFamily: t.id === 'mare' ? t.f.bold : t.f.display,
            fontSize: Math.round(size * 0.34),
            color: t.c.accentSoftText,
            letterSpacing: 0.2,
          }}
        >
          {initials(company)}
        </Text>
      )}
    </View>
  );
}

/* ───────────────────────── texto com realce do termo ───────────────────────── */

export function Highlight({
  t,
  text,
  query,
  style,
  numberOfLines,
}: {
  t: ProtoTokens;
  text: string;
  query: string;
  style: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const parts = splitByTerm(text, query);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((p, i) =>
        p.hit ? (
          <Text
            key={i}
            style={{
              backgroundColor: t.c.accentSoft,
              color: t.c.accentSoftText,
              fontFamily: t.f.semibold,
            }}
          >
            {p.text}
          </Text>
        ) : (
          p.text
        ),
      )}
    </Text>
  );
}

/* ───────────────────────── skeleton / estados ───────────────────────── */

export function Bar({
  t,
  w,
  h = 12,
  r = 6,
}: {
  t: ProtoTokens;
  w: number | `${number}%`;
  h?: number;
  r?: number;
}) {
  return <View style={{ width: w, height: h, borderRadius: r, backgroundColor: t.c.sunken }} />;
}

export function PButton({
  t,
  label,
  onPress,
  variant,
  radius = 12,
  testID,
}: {
  t: ProtoTokens;
  label: string;
  onPress: () => void;
  variant: 'primary' | 'secondary';
  radius?: number;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={(s) => {
        const hovered = (s as { hovered?: boolean }).hovered;
        const on = s.pressed || hovered;
        return {
          alignSelf: 'flex-start',
          minHeight: 44,
          paddingHorizontal: 20,
          borderRadius: radius,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor:
            variant === 'primary'
              ? on
                ? t.c.accentPressed
                : t.c.accent
              : on
                ? t.c.sunken
                : 'transparent',
          borderWidth: variant === 'primary' ? 0 : 1,
          borderColor: t.c.border,
        };
      }}
    >
      <Text
        style={{
          fontFamily: t.f.semibold,
          fontSize: 15,
          color: variant === 'primary' ? t.c.onAccent : t.id === 'mare' ? t.c.text : t.c.accentText,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function EmptyBlock({
  t,
  query,
  categoryName,
  onClear,
  radius,
}: {
  t: ProtoTokens;
  query: string;
  categoryName: string | null;
  onClear: () => void;
  radius: number;
}) {
  const subject = query.trim()
    ? `«${query.trim()}»`
    : categoryName
      ? `«${categoryName}»`
      : 'estes filtros';
  const hints = [
    'Experimente outra grafia',
    'pesquise pela localidade',
    categoryName ? `ou retire o filtro ${categoryName}.` : 'ou escolha uma categoria.',
  ];
  return (
    <View
      testID="proto.empty"
      style={{ paddingHorizontal: 20, paddingVertical: 28, gap: 12, alignItems: 'flex-start' }}
    >
      <PIcon t={t} name="search" size={28} color={t.c.text3} />
      <Text style={[t.type.heading, { maxWidth: 420 }]}>Nenhuma empresa para {subject}</Text>
      <Text style={[t.type.body, { color: t.c.text2, maxWidth: 420 }]}>
        {hints[0]}, {hints[1]}, {hints[2]}
      </Text>
      <PButton
        t={t}
        label="Limpar filtros"
        onPress={onClear}
        variant="secondary"
        radius={radius}
        testID="proto.clear"
      />
    </View>
  );
}

export function ErrorBlock({
  t,
  onRetry,
  radius,
}: {
  t: ProtoTokens;
  onRetry: () => void;
  radius: number;
}) {
  return (
    <View
      testID="proto.error"
      accessibilityRole="alert"
      style={{
        backgroundColor: t.c.errorBg,
        borderRadius: radius,
        borderCurve: 'continuous',
        padding: 16,
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <PIcon t={t} name="warning" size={22} color={t.c.error} />
        <Text style={[t.type.name, { color: t.c.text, flexShrink: 1 }]}>
          Não foi possível carregar o diretório.
        </Text>
      </View>
      <Text style={[t.type.meta, { color: t.c.text2 }]}>
        A lista abaixo é a última que foi carregada. Verifique a ligação e tente outra vez.
      </Text>
      <PButton
        t={t}
        label="Tentar novamente"
        onPress={onRetry}
        variant="primary"
        radius={radius - 4 > 8 ? radius - 4 : 10}
        testID="proto.retry"
      />
    </View>
  );
}

/* Ações de contacto (telefone / site). No protótipo não abrem nada. */
export function ContactAction({
  t,
  name,
  label,
  size = 40,
}: {
  t: ProtoTokens;
  name: 'phone' | 'globe';
  label: string;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={(s) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor:
          s.pressed || (s as { hovered?: boolean }).hovered ? t.c.sunken : 'transparent',
      })}
    >
      <PIcon t={t} name={name} size={20} color={t.id === 'mare' ? t.c.accentText : t.c.accent} />
    </Pressable>
  );
}

export const TABULAR = { fontVariant: ['tabular-nums'] } as TextStyle;
