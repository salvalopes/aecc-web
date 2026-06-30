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
  createdAt: string;
  updatedAt: string;
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
  updatedAt: string;
  company?: Company;
  category?: Category;
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

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
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

// Generic API response wrapper (se a API usar envelope)
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}
