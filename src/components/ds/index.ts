// Primitivas da Fase 3 / B5 (direção Maré). Sem consumidores até à B6+.
// Vivem ao lado de `ui/` porque Button/Chip/IconButton/EmptyState/ErrorState já existem lá
// e têm consumidores; a B14 apaga os antigos e move esta pasta para `ui/`.
export { Text, type TextProps } from './Text';
export { Button, type ButtonProps } from './Button';
export { IconButton, type IconButtonProps } from './IconButton';
export { TextField, type TextFieldProps } from './TextField';
export { SearchField, type SearchFieldProps } from './SearchField';
export { Chip, type ChipProps } from './Chip';
export { Plate, type PlateProps } from './Plate';
export { Highlight } from './Highlight';
export { Skeleton, SkeletonRow } from './Skeleton';
export { Surface } from './Surface';
export { ListGroup, ListRow, type ListRowProps } from './ListGroup';
export { CompanyRow, type CompanyRowProps } from './CompanyRow';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { ErrorState } from './ErrorState';
export { InlineAlert } from './InlineAlert';
export { StateScreen, type StateScreenProps } from './StateScreen';
