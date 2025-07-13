import { type AxiosResponse } from 'axios';
import { apiClient } from './api.ts';

export const LoginRequest = async (req: LoginRequest) => {
  return apiClient.post<LoginResponse, AxiosResponse<LoginResponse>, LoginRequest>('/auth/login', {
    ...req,
  });
};


export const SignupRequest = async (req: SignupRequest) => {
  return apiClient.post<SignupResponse, AxiosResponse<SignupResponse>, SignupRequest>('/auth/signup', {
    ...req,
  });
};