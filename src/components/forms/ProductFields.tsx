import { View } from 'react-native';
import { createStyles, useStyles } from '@/theme/createStyles';
import { required, requiredWhen } from '@/utils/validators';
import type { Category, Product, ProductType } from '@/types/api';
import { Chip, SegmentedControl, TextField } from '@/components/ds';
import { FormField, FormSection, FormSwitch } from '@/components/templates/FormLayout';

// Campos do produto (T7, B12): os mesmos em "Novo produto" e "Editar produto".
// A galeria (só no editar) vive em `ImageManager`, porque as imagens gravam-se logo.

export interface ProductFormState {
  categoryId: string;
  type: ProductType;
  name: string;
  description: string;
  hasMemberBenefit: boolean;
  memberBenefitDescription: string;
}

export const EMPTY_PRODUCT_FORM: ProductFormState = {
  categoryId: '',
  type: 'Product',
  name: '',
  description: '',
  hasMemberBenefit: false,
  memberBenefitDescription: '',
};

export function productForm(product: Product): ProductFormState {
  return {
    categoryId: product.categoryId,
    type: product.type,
    name: product.name,
    description: product.description,
    hasMemberBenefit: product.hasMemberBenefit,
    memberBenefitDescription: product.memberBenefitDescription ?? '',
  };
}

export const productRules = {
  name: required('O nome é obrigatório.'),
  categoryId: required('Escolha uma categoria.'),
  memberBenefitDescription: requiredWhen(
    (v: ProductFormState) => v.hasMemberBenefit,
    'Descreva o benefício para membros.',
  ),
};

/** Chaves do FluentValidation → campos do formulário. */
export const productApiFields: Record<string, keyof ProductFormState> = {
  CategoryId: 'categoryId',
  Type: 'type',
  Name: 'name',
  Description: 'description',
  MemberBenefitDescription: 'memberBenefitDescription',
};

/** Estado do formulário → corpo do pedido (sem o `companyId`, que só o criar leva). */
export function productPayload(form: ProductFormState) {
  return {
    categoryId: form.categoryId,
    type: form.type,
    name: form.name.trim(),
    description: form.description.trim(),
    hasMemberBenefit: form.hasMemberBenefit,
    memberBenefitDescription: form.hasMemberBenefit
      ? form.memberBenefitDescription.trim() || null
      : null,
  };
}

const TYPE_OPTIONS = [
  { value: 'Product', label: 'Produto' },
  { value: 'Service', label: 'Serviço' },
] as const;

const factory = createStyles(({ spacing }) => ({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  segmented: { alignSelf: 'flex-start' },
}));

/** Categoria (raiz) que contém o `id`: a própria, se for de topo, ou a mãe da subcategoria. */
function rootOf(categories: Category[], id: string): Category | undefined {
  return categories.find((c) => c.id === id || c.children.some((child) => child.id === id));
}

/**
 * Dois níveis, como no diretório: as categorias em cápsulas e, por baixo, as subcategorias da
 * escolhida. Tocar na subcategoria ativa volta à categoria (a subcategoria é opcional).
 */
function CategoryPicker({
  categories,
  value,
  onChange,
  error,
  testIDPrefix,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
  testIDPrefix: string;
}) {
  const s = useStyles(factory);
  const root = rootOf(categories, value);
  return (
    <>
      <FormField label="Categoria" error={error} testID={`${testIDPrefix}.category`}>
        <View style={s.chips} accessibilityRole="radiogroup" accessibilityLabel="Categoria">
          {categories.map((c) => (
            <Chip
              key={c.id}
              testID={`${testIDPrefix}.category-${c.slug}`}
              label={c.name}
              active={root?.id === c.id}
              onPress={() => onChange(c.id)}
            />
          ))}
        </View>
      </FormField>
      {root && root.children.length > 0 ? (
        <FormField label="Subcategoria" optional>
          <View style={s.chips} accessibilityRole="radiogroup" accessibilityLabel="Subcategoria">
            {root.children.map((c) => (
              <Chip
                key={c.id}
                testID={`${testIDPrefix}.category-${c.slug}`}
                label={c.name}
                active={value === c.id}
                onPress={() => onChange(value === c.id ? root.id : c.id)}
              />
            ))}
          </View>
        </FormField>
      ) : null}
    </>
  );
}

export interface ProductFieldsProps {
  value: ProductFormState;
  onChange: (patch: Partial<ProductFormState>) => void;
  errors: Partial<Record<keyof ProductFormState, string>>;
  categories: Category[];
  /** `product-create` ou `product-edit`: prefixo dos `testID` dos campos. */
  testIDPrefix: string;
}

export function ProductFields({
  value,
  onChange,
  errors,
  categories,
  testIDPrefix,
}: ProductFieldsProps) {
  const s = useStyles(factory);
  const service = value.type === 'Service';
  return (
    <>
      <FormSection
        label={service ? 'SERVIÇO' : 'PRODUTO'}
        description="Aparece na página da empresa e na pesquisa do diretório."
      >
        <FormField label="Tipo">
          <View style={s.segmented}>
            <SegmentedControl
              accessibilityLabel="Tipo"
              options={TYPE_OPTIONS.map((o) => ({
                ...o,
                testID: `${testIDPrefix}.type-${o.value.toLowerCase()}`,
              }))}
              value={value.type}
              onChange={(type) => onChange({ type })}
            />
          </View>
        </FormField>
        <TextField
          testID={`${testIDPrefix}.name`}
          label="Nome"
          value={value.name}
          onChangeText={(name) => onChange({ name })}
          placeholder={service ? 'Nome do serviço' : 'Nome do produto'}
          error={errors.name}
        />
        <TextField
          testID={`${testIDPrefix}.description`}
          label="Descrição"
          optional
          value={value.description}
          onChangeText={(description) => onChange({ description })}
          placeholder="O que inclui, para quem é, condições"
          multiline
          error={errors.description}
        />
      </FormSection>

      <FormSection label="CATEGORIA" description="Onde aparece quando se filtra o diretório.">
        <CategoryPicker
          categories={categories}
          value={value.categoryId}
          onChange={(categoryId) => onChange({ categoryId })}
          error={errors.categoryId}
          testIDPrefix={testIDPrefix}
        />
      </FormSection>

      <FormSection
        label="BENEFÍCIO PARA MEMBROS"
        description="Uma condição especial para os associados da AECC, em destaque na página."
      >
        <FormSwitch
          testID={`${testIDPrefix}.benefit-toggle`}
          label="Tem benefício para membros"
          value={value.hasMemberBenefit}
          onValueChange={(hasMemberBenefit) => onChange({ hasMemberBenefit })}
        />
        {value.hasMemberBenefit ? (
          <TextField
            testID={`${testIDPrefix}.benefit`}
            label="Descrição do benefício"
            value={value.memberBenefitDescription}
            onChangeText={(memberBenefitDescription) => onChange({ memberBenefitDescription })}
            placeholder="Ex.: 10% de desconto mediante o cartão de associado"
            multiline
            error={errors.memberBenefitDescription}
          />
        ) : null}
      </FormSection>
    </>
  );
}
