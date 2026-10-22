export type Role = 'ADMIN' | 'OPERATOR' | 'CUSTOMER';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
}
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
export interface LoginResponse {
  user: User;
  expiresIn: number;
}
