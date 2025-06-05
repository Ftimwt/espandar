interface LoginResponse {
  token: string;
  message: string;
  user: UserModel;
}

interface LoginRequest {
  username: string;
  password: string;
}