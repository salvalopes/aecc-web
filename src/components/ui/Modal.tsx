import { Modal as RNModal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export function Modal({ visible, title, onClose, onSave, saving = false, saveLabel = 'Guardar', children }: ModalProps) {
  const { colors, fontFamily, fontSize, fontWeight } = useTheme();

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

        <ScrollView style={{ flex: 1, padding: 16 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </SafeAreaView>
    </RNModal>
  );
}
