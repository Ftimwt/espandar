interface LoginResponse {
  token: string;
  message: string;
  user: UserModel;
}

interface LoginRequest {
  username: string;
  password: string;
}

interface SignupResponse {
  token: string;
  message: string;
  user: UserModel;
}

interface SignupRequest {
  username: string;
  password: string;
  firstname: string;
  lastname: string;
}