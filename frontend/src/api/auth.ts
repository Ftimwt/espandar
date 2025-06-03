import axios from 'axios';
import { prefixUrl } from './api.ts';

export const Login = (req: LoginRequest) => {
  return axios.post<LoginResponse, LoginRequest>(prefixUrl(`/auth/login`), req);
};
