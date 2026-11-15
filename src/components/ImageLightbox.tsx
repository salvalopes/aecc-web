import { useEffect, useState } from 'react';
import { Image, Modal, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createStyles, useStyles } from '@/theme/createStyles';
import { IconButton, Text } from '@/components/ui';

interface LightboxImage {
  id: string;
  imageUrl: string;
}

interface ImageLightboxProps {
  visible: boolean;
  images: LightboxImage[];
  initialIndex: number;
  onClose: () => void;
}

// T4 (B11): só tokens. O fundo é `bg` opaco, como o visor de fotos do sistema: o `scrim`
// (40% no light) deixava a página competir com a imagem. Os controlos são `IconButton`
// (alvo de 44) e a navegação por teclado (Esc, ←, →) vale para o web.
const factory = createStyles(({ colors, spacing, layout, size }) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.sm,
  },
  // `minHeight` a zero + imagem com `flex: 1`: no web, a altura a 100% não ficava limitado pelo palco
  // e uma imagem alta saía do ecrã.
  stage: { flex: 1, minHeight: spacing[0], paddingBottom: spacing['2xl'] },
  image: { flex: 1, width: '100%' },
  nav: {
    position: 'absolute',
    top: '50%',
    marginTop: -size.hitTarget / 2,
  },
  prev: { left: layout.gutter },
  next: { right: layout.gutter },
}));

export function ImageLightbox({ visible, images, initialIndex, onClose }: ImageLightboxProps) {
  const s = useStyles(factory);
  const [index, setIndex] = useState(initialIndex);
  const count = images.length;

  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex]);

  const showPrev = () => setIndex((i) => (i - 1 + count) % count);
  const showNext = () => setIndex((i) => (i + 1) % count);

  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (count > 1 && e.key === 'ArrowLeft') setIndex((i) => (i - 1 + count) % count);
      else if (count > 1 && e.key === 'ArrowRight') setIndex((i) => (i + 1) % count);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, count, onClose]);

  if (!visible || count === 0) return null;

  const current = images[Math.min(index, count - 1)];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={s.root} testID="lightbox">
        <View style={s.bar}>
          <Text variant="meta" tabular accessibilityLiveRegion="polite">
            {count > 1 ? `${index + 1} de ${count}` : ''}
          </Text>
          <IconButton testID="lightbox.close" icon="x" label="Fechar" onPress={onClose} />
        </View>
        <View style={s.stage}>
          <Image
            source={{ uri: current.imageUrl }}
            style={s.image}
            resizeMode="contain"
            accessibilityLabel={`Imagem ${index + 1} de ${count}`}
          />
          {count > 1 ? (
            <>
              <IconButton
                testID="lightbox.prev"
                variant="contact"
                icon="caret-left"
                label="Imagem anterior"
                onPress={showPrev}
                style={[s.nav, s.prev]}
              />
              <IconButton
                testID="lightbox.next"
                variant="contact"
                icon="caret-right"
                label="Imagem seguinte"
                onPress={showNext}
                style={[s.nav, s.next]}
              />
            </>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
