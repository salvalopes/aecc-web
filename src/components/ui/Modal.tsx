import { useEffect } from 'react';
import { Modal as RNModal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';

interface ModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave?: () => void;
  saving?: boolean;
  saveLabel?: string;
  children: React.ReactNode;
}

// Locks background scroll while the modal is open. React Native Web's Modal
// renders as a raw `position: fixed` overlay with no scroll lock of its own;
// on iOS Safari, letting the page behind it rubber-band while the user
// scrolls inside the modal is what makes the fixed header (Guardar/Cancelar)
// jump or momentarily disappear.
function useBodyScrollLock(visible: boolean) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;

    const { body } = document;
    const scrollY = window.scrollY;
    const previousStyle = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      body.style.position = previousStyle.position;
      body.style.top = previousStyle.top;
      body.style.width = previousStyle.width;
      body.style.overflow = previousStyle.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [visible]);
}

export function Modal({ visible, title, onClose, onSave, saving = false, saveLabel = 'Guardar', children }: ModalProps) {
  const { colors, fontFamily, fontSize, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();
  useBodyScrollLock(visible);

  return (
    <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderSubtle,
          }}
        >
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textSecondary }}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: fontFamily.display, fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary }}>
            {title}
          </Text>
          {onSave ? (
            <TouchableOpacity onPress={onSave} disabled={saving}>
              <Text
                style={{
                  fontFamily: fontFamily.body,
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.bold,
                  color: colors.accentPrimary,
                  opacity: saving ? 0.4 : 1,
                }}
              >
                {saving ? '...' : saveLabel}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        <ScrollView
          style={{ flex: 1, padding: 16 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </RNModal>
  );
}
