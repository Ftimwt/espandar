import { type AxiosResponse } from 'axios';
import { apiClient } from './api.ts';

export const LoginRequest = async (req: LoginRequest) => {
  return apiClient.post<LoginResponse, AxiosResponse<LoginResponse>, LoginRequest>('/auth/login', {
    ...req,
  });
};
