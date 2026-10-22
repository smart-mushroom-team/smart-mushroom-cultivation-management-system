export type Role = 'ADMIN' | 'OPERATOR' | 'CUSTOMER';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status?: 'ACTIVE' | 'INACTIVE';
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type LoginResponse = TokenPair & { user: User };
