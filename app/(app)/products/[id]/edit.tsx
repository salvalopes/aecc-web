import { useEffect, useState, startTransition } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { productsApi } from '@/api/products.api';
import { companiesApi } from '@/api/companies.api';
import { categoriesApi } from '@/api/categories.api';
import { ApiError } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useFormValidation } from '@/hooks/useFormValidation';
import { confirmDestructive } from '@/utils/confirm';
import { closeForm } from '@/navigation/closeForm';
import type { Category, Company, Product, ProductImage } from '@/types/api';
import { ErrorState, StateScreen } from '@/components/ui';
import { DetailScaffold } from '@/components/templates/DetailScaffold';
import { FormLayout } from '@/components/templates/FormLayout';
import { ForbiddenState } from '@/components/templates/StateTemplates';
import { ImageLightbox } from '@/components/ImageLightbox';
import {
  EMPTY_PRODUCT_FORM,
  ProductFields,
  productApiFields,
  productForm,
  productPayload,
  productRules,
  type ProductFormState,
} from '@/components/forms/ProductFields';
import { ImageManager } from '@/components/forms/ImageManager';

// T7 (B12): "Editar produto" (`/products/:id/edit`), aberto a partir do detalhe. Substitui o
// `Modal`. Os campos gravam-se com Guardar; as imagens, logo em cada ação. Só o dono edita.
export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, validate, applyApiError } = useFormValidation<ProductFormState>();

  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    try {
      const prod = await productsApi.get(id);
      const [co, cats] = await Promise.all([
        companiesApi.get(prod.companyId),
        categoriesApi.list(),
      ]);
      startTransition(() => {
        setProduct(prod);
        setCompany(co);
        setCategories(cats);
        setForm(productForm(prod));
      });
    } catch (e) {
      startTransition(() => {
        setNotFound(e instanceof ApiError && e.status === 404);
        setLoadError(e instanceof ApiError ? e.message : 'Não foi possível carregar o produto.');
      });
    } finally {
      startTransition(() => setLoading(false));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave() {
    if (!id || !validate(form, productRules)) return;
    setSaving(true);
    try {
      await productsApi.update(id, productPayload(form));
      closeForm(`/products/${id}`);
    } catch (e) {
      applyApiError(e, productApiFields);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddImage() {
    if (!id) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setGalleryError(null);
    setUploading(true);
    try {
      const image = await productsApi.addImage(id, asset);
      startTransition(() =>
        setProduct((prev) => (prev ? { ...prev, images: [...prev.images, image] } : prev)),
      );
    } catch (e) {
      setGalleryError(e instanceof ApiError ? e.message : 'Não foi possível enviar a imagem.');
    } finally {
      setUploading(false);
    }
  }

  async function handleFeatureImage(img: ProductImage) {
    if (!product) return;
    setGalleryError(null);
    try {
      await productsApi.featureImage(product.id, img.id);
      startTransition(() =>
        setProduct((prev) =>
          prev
            ? {
                ...prev,
                imageUrl: img.imageUrl,
                images: prev.images.map((i) => ({ ...i, isFeatured: i.id === img.id })),
              }
            : prev,
        ),
      );
    } catch (e) {
      setGalleryError(e instanceof ApiError ? e.message : 'Não foi possível destacar a imagem.');
    }
  }

  async function handleDeleteImage(img: ProductImage) {
    if (!product) return;
    const confirmed = await confirmDestructive({
      title: 'Apagar imagem',
      message: 'A imagem sai da galeria do produto. Não é possível desfazer.',
      confirmLabel: 'Apagar',
    });
    if (!confirmed) return;
    setGalleryError(null);
    setDeletingImageId(img.id);
    try {
      await productsApi.deleteImage(product.id, img.id);
      startTransition(() =>
        setProduct((prev) => {
          if (!prev) return prev;
          const remaining = prev.images.filter((i) => i.id !== img.id);
          const featured = remaining.find((i) => i.isFeatured) ?? remaining[0];
          return { ...prev, imageUrl: featured?.imageUrl ?? null, images: remaining };
        }),
      );
    } catch (e) {
      setGalleryError(e instanceof ApiError ? e.message : 'Não foi possível apagar a imagem.');
    } finally {
      setDeletingImageId(null);
    }
  }

  if (!loading && !product) {
    if (notFound) {
      return (
        <StateScreen
          testID="product-edit.not-found"
          icon="magnifying-glass"
          title="Produto não encontrado"
          description="O produto pode ter sido retirado pela empresa ou o endereço está errado."
          actionLabel="Ver as minhas empresas"
          onAction={() => router.replace('/my-companies')}
        />
      );
    }
    return (
      <DetailScaffold>
        <ErrorState
          testID="product-edit.error"
          message={loadError ?? 'Não foi possível carregar o produto.'}
          onRetry={load}
        />
      </DetailScaffold>
    );
  }

  if (company && user && company.ownerUserId !== user.id) return <ForbiddenState />;

  return (
    <>
      <FormLayout
        testIDPrefix="product-edit"
        onSubmit={handleSave}
        onCancel={() => closeForm(`/products/${id}`)}
        submitting={saving}
        error={formError}
        loading={loading && !product}
      >
        <ProductFields
          testIDPrefix="product-edit"
          value={form}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          errors={fieldErrors}
          categories={categories}
        />
        {product ? (
          <ImageManager
            images={product.images}
            error={galleryError}
            uploading={uploading}
            deletingId={deletingImageId}
            onAdd={handleAddImage}
            onFeature={handleFeatureImage}
            onDelete={handleDeleteImage}
            onOpen={setLightboxIndex}
          />
        ) : null}
      </FormLayout>
      {product ? (
        <ImageLightbox
          visible={lightboxIndex !== null}
          images={product.images}
          initialIndex={lightboxIndex ?? 0}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </>
  );
}
