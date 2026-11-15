import { View } from 'react-native';
import { createStyles, useStyles } from '@/theme/createStyles';
import { combine, emailFormat, required, type FieldRule } from '@/utils/validators';
import { Button, Plate, TextField } from '@/components/ds';
import { FormField, FormSection } from '@/components/templates/FormLayout';

// Campos da empresa (T7, B12): os mesmos em "Nova empresa" e "Editar empresa".
// O logo só existe no editar, porque o upload precisa do id da empresa.

export interface CompanyFormState {
  name: string;
  description: string;
  leadCooldownMinutes: string;
  leadDestinationEmail: string;
}

export const EMPTY_COMPANY_FORM: CompanyFormState = {
  name: '',
  description: '',
  leadCooldownMinutes: '60',
  leadDestinationEmail: '',
};

const cooldownRule: FieldRule = (value) => {
  const minutes = Number(value.trim());
  return value.trim() === '' || !Number.isInteger(minutes) || minutes < 0
    ? 'Indique um número inteiro de minutos (0 ou mais).'
    : undefined;
};

export const companyRules = {
  name: required('O nome é obrigatório.'),
  leadDestinationEmail: combine(required('O email de destino é obrigatório.'), emailFormat()),
  leadCooldownMinutes: cooldownRule,
};

/** Chaves do FluentValidation → campos do formulário. */
export const companyApiFields: Record<string, keyof CompanyFormState> = {
  Name: 'name',
  Description: 'description',
  LeadCooldownMinutes: 'leadCooldownMinutes',
  LeadDestinationEmail: 'leadDestinationEmail',
};

/** Estado do formulário → corpo do pedido (criar ou atualizar têm a mesma forma). */
export function companyPayload(form: CompanyFormState) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    leadCooldownMinutes: Number(form.leadCooldownMinutes.trim()),
    leadDestinationEmail: form.leadDestinationEmail.trim(),
  };
}

const factory = createStyles(({ spacing }) => ({
  logo: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
}));

export interface CompanyFieldsProps {
  value: CompanyFormState;
  onChange: (patch: Partial<CompanyFormState>) => void;
  errors: Partial<Record<keyof CompanyFormState, string>>;
  /** `company-create` ou `company-edit`: prefixo dos `testID` dos campos. */
  testIDPrefix: string;
  /** Só no editar: pré-visualização (o logo atual ou o escolhido) e a ação de escolher. */
  logo?: {
    uri: string | null;
    onPick: () => void;
  };
}

export function CompanyFields({ value, onChange, errors, testIDPrefix, logo }: CompanyFieldsProps) {
  const s = useStyles(factory);
  return (
    <>
      <FormSection label="IDENTIDADE" description="Como a empresa aparece no diretório da AECC.">
        {logo ? (
          <FormField label="Logo" hint="Imagem quadrada. Aparece ao lado do nome nas listas.">
            <View style={s.logo}>
              <Plate company={{ name: value.name, tradeName: null, logoUrl: logo.uri }} size="lg" />
              <Button
                testID={`${testIDPrefix}.logo-upload`}
                label={logo.uri ? 'Alterar logo' : 'Escolher logo'}
                variant="secondary"
                size="sm"
                onPress={logo.onPick}
              />
            </View>
          </FormField>
        ) : null}
        <TextField
          testID={`${testIDPrefix}.name`}
          label="Nome"
          value={value.name}
          onChangeText={(name) => onChange({ name })}
          placeholder="Nome da empresa"
          autoComplete="organization"
          error={errors.name}
        />
        <TextField
          testID={`${testIDPrefix}.description`}
          label="Descrição"
          optional
          value={value.description}
          onChangeText={(description) => onChange({ description })}
          placeholder="O que a empresa faz, para quem e onde"
          multiline
          error={errors.description}
        />
      </FormSection>

      <FormSection
        label="PEDIDOS DE CONTACTO"
        description="Os pedidos dos associados chegam a este email. O intervalo evita pedidos repetidos da mesma pessoa."
      >
        <TextField
          testID={`${testIDPrefix}.lead-email`}
          label="Email de destino"
          value={value.leadDestinationEmail}
          onChangeText={(leadDestinationEmail) => onChange({ leadDestinationEmail })}
          placeholder="pedidos@empresa.pt"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={errors.leadDestinationEmail}
        />
        <TextField
          testID={`${testIDPrefix}.lead-cooldown`}
          label="Intervalo mínimo entre pedidos"
          hint="Em minutos. 0 para não limitar."
          value={value.leadCooldownMinutes}
          onChangeText={(leadCooldownMinutes) => onChange({ leadCooldownMinutes })}
          placeholder="60"
          keyboardType="number-pad"
          error={errors.leadCooldownMinutes}
        />
      </FormSection>
    </>
  );
}
