// Enums — espelham AECC.Domain.Enums
export type UserRole = 'Admin' | 'Associado' | 'Cliente';
export type ProductType = 'Product' | 'Service';
export type LeadStatus = 'New' | 'Contacted' | 'Closed';

// Entities
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  emailConfirmed: boolean;
}

// Utilizador gerido no ecrã de administração (api/users) — inclui isActive/createdAt
// que a sessão autenticada (api/auth/me) não devolve.
export interface ManagedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  emailConfirmed: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: Category[];
}

export interface Company {
  id: string;
  ownerUserId: string | null;
  name: string;
  description: string;
  logoUrl: string | null;
  coverUrl: string | null;
  leadCooldownMinutes: number;
  leadDestinationEmail: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tradeName: string | null;
  caeDescription: string | null;
  phone: string | null;
  contactEmail: string | null;
  website: string | null;
  address: string | null;
  locality: string | null;
  postalCode: string | null;
  postalCodeLocality: string | null;
}

// Diretório público de empresas (GET /companies/directory) — sem TaxId/ownerUserId (RGPD).
export interface CompanyDirectoryEntry {
  id: string;
  name: string;
  tradeName: string | null;
  caeDescription: string | null;
  phone: string | null;
  contactEmail: string | null;
  website: string | null;
  address: string | null;
  locality: string | null;
  postalCode: string | null;
  postalCodeLocality: string | null;
  hasOwner: boolean;
  logoUrl: string | null;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ProductImage {
  id: string;
  imageUrl: string;
  isFeatured: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface Product {
  id: string;
  companyId: string;
  categoryId: string;
  type: ProductType;
  name: string;
  description: string;
  imageUrl: string | null;
  hasMemberBenefit: boolean;
  memberBenefitDescription: string | null;
  isActive: boolean;
  createdAt: string;
  images: ProductImage[];
}

export interface Lead {
  id: string;
  productId: string;
  companyId: string;
  requesterUserId: string;
  message: string;
  status: LeadStatus;
  createdAt: string;
}

// Auth payloads
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
}

// OAuth 2.0 token response (snake_case per spec)
export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

export interface ExchangeCodeParams {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export interface ConfirmEmailRequest {
  userId: string;
  token: string;
  fullName: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  userId: string;
  token: string;
  newPassword: string;
}

export interface CreateLeadRequest {
  productId: string;
  message: string;
}

// Category CRUD
export interface CreateCategoryRequest {
  name: string;
  slug: string;
  parentId?: string | null;
}

export interface UpdateCategoryRequest {
  name: string;
  slug: string;
  parentId?: string | null;
}

// Company CRUD
export interface CreateCompanyRequest {
  name: string;
  description: string;
  leadCooldownMinutes: number;
  leadDestinationEmail: string;
}

export interface UpdateCompanyRequest {
  name: string;
  description: string;
  leadCooldownMinutes: number;
  leadDestinationEmail: string;
}

// User CRUD (admin)
export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

// Product CRUD
export interface CreateProductRequest {
  companyId: string;
  categoryId: string;
  type: ProductType;
  name: string;
  description: string;
  hasMemberBenefit: boolean;
  memberBenefitDescription?: string | null;
}

export interface UpdateProductRequest {
  categoryId: string;
  type: ProductType;
  name: string;
  description: string;
  hasMemberBenefit: boolean;
  memberBenefitDescription?: string | null;
}
