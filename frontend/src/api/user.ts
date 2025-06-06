import { authClient } from './api.ts';
import { useTokenStore } from '../store/useToken.ts';
import { useQuery } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';

export const getUserInfo = (token: string) => {
  return authClient(token).get<UserInfoResponse, AxiosResponse<UserInfoResponse>, void>(
    '/auth/me',
    {},
  );
};

export const getUserListAPI = (token: string, req: UsersListRequest) => {
  return authClient(token).get<
    UsersListResponse,
    AxiosResponse<UsersListResponse>,
    UsersListRequest
  >('/users', { params: req });
};

export const useGetUserInfo = () => {
  const { token } = useTokenStore();

  return useQuery({
    queryKey: ['user'],
    queryFn: () => getUserInfo(token!),
  });
};

export const useGetUsersList = (req: UsersListRequest) => {
  const { token } = useTokenStore();

  return useQuery({
    queryKey: ['users', req],
    queryFn: () => getUserListAPI(token!, req),
  });
};
