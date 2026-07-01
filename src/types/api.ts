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

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: Category[];
}

export interface Company {
  id: string;
  ownerUserId: string;
  name: string;
  description: string;
  logoUrl: string | null;
  coverUrl: string | null;
  leadCooldownMinutes: number;
  leadDestinationEmail: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
