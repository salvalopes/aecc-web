import { Platform } from 'react-native';

interface UploadableImageAsset {
  uri: string;
  mimeType?: string | null;
  file?: File;
}

export function createImageFormData(asset: UploadableImageAsset, fieldName = 'file'): FormData {
  const formData = new FormData();

  if (Platform.OS === 'web' && asset.file) {
    formData.append(fieldName, asset.file);
    return formData;
  }

  const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mime = asset.mimeType ?? (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
  formData.append(fieldName, { uri: asset.uri, name: `photo.${ext}`, type: mime } as unknown as Blob);
  return formData;
}
