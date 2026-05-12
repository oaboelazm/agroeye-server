export interface AuthUser {
  user_id: number;
  username: string;
  email: string;
  role: string;
  phone?: string;
}

export interface LoginResponse {
  status: string;
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface SignupResponse {
  status: string;
  message: string;
}
