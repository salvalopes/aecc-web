import { useEffect, useState } from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

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
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <Image
          source={{ uri: current.imageUrl }}
          style={{ width, height: height * 0.7 }}
          resizeMode="contain"
        />

        {images.length > 1 && (
          <>
            <TouchableOpacity style={[styles.navBtn, styles.navBtnLeft]} onPress={showPrev} hitSlop={12}>
              <Text style={styles.navText}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.navBtn, styles.navBtnRight]} onPress={showNext} hitSlop={12}>
              <Text style={styles.navText}>›</Text>
            </TouchableOpacity>
            <Text style={styles.counter}>{index + 1} / {images.length}</Text>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: { position: 'absolute', top: 48, right: 20, zIndex: 10, padding: 8 },
  closeText: { color: '#fff', fontSize: 24 },
  navBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
  },
  navBtnLeft: { left: 12 },
  navBtnRight: { right: 12 },
  navText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  counter: {
    position: 'absolute',
    bottom: 40,
    color: '#fff',
    fontSize: 14,
  },
});
