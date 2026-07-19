export interface UserResponse {
  id: string;
  email: string;
  username: string;
  display_name: string;
  is_active: boolean;
  is_admin: boolean;
  email_verified_at: string | null;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  locale: string;
  timezone: string;
  is_active: boolean;
  is_admin: boolean;
  deletion_scheduled_at: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  display_name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  locale?: string;
  timezone?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface ApiErrorBody {
  detail: string | { msg: string; loc: (string | number)[] }[];
}
