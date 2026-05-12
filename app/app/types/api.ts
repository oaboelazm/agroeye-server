export type AuthUser = {
  user_id: number;
  username: string;
  email: string;
  role: string;
};

export type LoginResponse = {
  status: "success";
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export type SignupResponse = {
  status: "success";
  message: string;
};
