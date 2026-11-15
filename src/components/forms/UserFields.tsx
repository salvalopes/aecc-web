import { View } from 'react-native';
import { createStyles, useStyles } from '@/theme/createStyles';
import type { UserRole } from '@/types/api';
import { SegmentedControl, TextField } from '@/components/ui';
import { FormField, FormSection, FormSwitch } from '@/components/templates/FormLayout';
import { ROLE_HINT, ROLE_LABEL } from '@/utils/roles';

// Campos do utilizador (T7, B12). "Novo utilizador" pede email e password inicial; "Editar"
// não (o email é a identidade e a password é do próprio), mas tem o estado da conta.

export interface UserFormState {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

export const EMPTY_USER_FORM: UserFormState = {
  email: '',
  password: '',
  fullName: '',
  role: 'Cliente',
  isActive: true,
};

/** Códigos do Identity e chaves do FluentValidation → campos do formulário. */
export const userApiFields: Record<string, keyof UserFormState> = {
  Email: 'email',
  Password: 'password',
  FullName: 'fullName',
  DuplicateUserName: 'email',
  DuplicateEmail: 'email',
  InvalidEmail: 'email',
  PasswordTooShort: 'password',
  PasswordRequiresDigit: 'password',
  PasswordRequiresLower: 'password',
  PasswordRequiresUpper: 'password',
  PasswordRequiresNonAlphanumeric: 'password',
  PasswordRequiresUniqueChars: 'password',
};

const ROLE_OPTIONS: readonly { value: UserRole; label: string }[] = (
  ['Admin', 'Associado', 'Cliente'] as const
).map((value) => ({ value, label: ROLE_LABEL[value] }));

const factory = createStyles(() => ({
  segmented: { alignSelf: 'flex-start' },
}));

export interface UserFieldsProps {
  mode: 'create' | 'edit';
  value: UserFormState;
  onChange: (patch: Partial<UserFormState>) => void;
  errors: Partial<Record<keyof UserFormState, string>>;
  /** A conta é a de quem está a editar: papel e estado ficam só de leitura. */
  self?: boolean;
  /** `user-create` ou `user-edit`: prefixo dos `testID` dos campos. */
  testIDPrefix: string;
}

export function UserFields({
  mode,
  value,
  onChange,
  errors,
  self = false,
  testIDPrefix,
}: UserFieldsProps) {
  const s = useStyles(factory);
  return (
    <>
      <FormSection
        label="CONTA"
        description={
          mode === 'create'
            ? 'A pessoa recebe um email para confirmar o endereço e entra com esta password.'
            : 'O email identifica a conta e não se altera aqui.'
        }
      >
        {mode === 'create' ? (
          <>
            <TextField
              testID={`${testIDPrefix}.email`}
              label="Email"
              value={value.email}
              onChangeText={(email) => onChange({ email })}
              placeholder="nome@empresa.pt"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="off"
              error={errors.email}
            />
            <TextField
              testID={`${testIDPrefix}.password`}
              label="Password inicial"
              hint="Mínimo de 8 caracteres, com maiúscula, minúscula e número."
              value={value.password}
              onChangeText={(password) => onChange({ password })}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              error={errors.password}
            />
          </>
        ) : null}
        <TextField
          testID={`${testIDPrefix}.full-name`}
          label="Nome"
          value={value.fullName}
          onChangeText={(fullName) => onChange({ fullName })}
          placeholder="Nome completo"
          autoComplete="name"
          error={errors.fullName}
        />
      </FormSection>

      <FormSection
        label="ACESSO"
        description={
          self
            ? 'Não pode alterar o seu próprio papel nem desativar a sua conta.'
            : 'O papel decide o que a pessoa vê e pode gerir.'
        }
      >
        <FormField label="Papel" hint={ROLE_HINT[value.role]}>
          <View style={s.segmented}>
            <SegmentedControl
              accessibilityLabel="Papel"
              disabled={self}
              options={ROLE_OPTIONS.map((o) => ({
                ...o,
                testID: `${testIDPrefix}.role-${o.value.toLowerCase()}`,
              }))}
              value={value.role}
              onChange={(role) => onChange({ role })}
            />
          </View>
        </FormField>
        {mode === 'edit' ? (
          <FormSwitch
            testID={`${testIDPrefix}.active`}
            label="Conta ativa"
            description={
              value.isActive ? 'Pode entrar na app.' : 'Não consegue entrar até ser reativada.'
            }
            value={value.isActive}
            onValueChange={(isActive) => onChange({ isActive })}
            disabled={self}
          />
        ) : null}
      </FormSection>
    </>
  );
}
