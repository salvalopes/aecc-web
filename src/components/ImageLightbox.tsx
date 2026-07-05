import { useEffect, useState } from 'react';
import { Image, Modal, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Icon } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

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

export function ImageLightbox({ visible, images, initialIndex, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const { width, height } = useWindowDimensions();
  const theme = useTheme();

  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex]);

  if (!visible || images.length === 0) return null;

  const current = images[Math.min(index, images.length - 1)];

  function showPrev() {
    setIndex(i => (i - 1 + images.length) % images.length);
  }

  function showNext() {
    setIndex(i => (i + 1) % images.length);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' }}>
        <TouchableOpacity
          style={{ position: 'absolute', top: 48, right: 20, zIndex: 10, padding: 8 }}
          onPress={onClose}
          hitSlop={12}
        >
          <Icon name="x" size={24} color="#fff" />
        </TouchableOpacity>

        <Image source={{ uri: current.imageUrl }} style={{ width, height: height * 0.7 }} resizeMode="contain" />

        {images.length > 1 && (
          <>
            <TouchableOpacity
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                marginTop: -24,
                padding: 12,
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: theme.radius.round,
              }}
              onPress={showPrev}
              hitSlop={12}
            >
              <Icon name="chevron-left" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                marginTop: -24,
                padding: 12,
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: theme.radius.round,
              }}
              onPress={showNext}
              hitSlop={12}
            >
              <Icon name="chevron-right" size={22} color="#fff" />
            </TouchableOpacity>
            <Text
              style={{
                position: 'absolute',
                bottom: 40,
                color: '#fff',
                fontFamily: theme.fontFamily.body,
                fontSize: theme.fontSize.sm,
              }}
            >
              {index + 1} / {images.length}
            </Text>
          </>
        )}
      </View>
    </Modal>
  );
}
