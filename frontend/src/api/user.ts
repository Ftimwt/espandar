import { authClient } from './api.ts';
import { useTokenStore } from '../store/useToken.ts';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';

export const getUserInfo = (token: string) => {
  return authClient(token).get<UserInfoResponse, AxiosResponse<UserInfoResponse>, void>(
    '/auth/me',
    {},
  );
};

export const getUserMessages = (token: string, userID: number) => {
  return authClient(token).get<
    MessageResponse,
    AxiosResponse<MessageResponse>,
    UserMessagesRequest
  >(`/users/${userID}/messages`, {});
};

export const getUserByID = (token: string, userID: number) => {
  return authClient(token).get<UserResponse, AxiosResponse<UserResponse>, void>(
    `/users/${userID}`,
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

export const updateUserProfileAPI = (token: string, body: UpdateProfileRequest) => {
  return authClient(token).put<UserInfoResponse, AxiosResponse<UserInfoResponse>, UpdateProfileRequest>(
    '/users/me',
    body,
  );
};

export const useGetUserInfo = () => {
  const { token } = useTokenStore();

  return useQuery({
    queryKey: ['user'],
    queryFn: () => getUserInfo(token!),
    retry: false,
  });
};

export const useGetUsersList = (req?: UsersListRequest) => {
  const { token } = useTokenStore();

  return useQuery({
    queryKey: ['users', req],
    queryFn: () => getUserListAPI(token!, req || {}),
  });
};

export const useUpdateUserProfile = () => {
  const { token } = useTokenStore();

  return useMutation({
    mutationFn: (body: UpdateProfileRequest) => updateUserProfileAPI(token!, body),
  });
};

export const useGetUserMessages = (userID: number) => {
  const { token } = useTokenStore();

  return useQuery({
    queryKey: ['messages', 'user_messages', userID],
    queryFn: () => getUserMessages(token!, userID),
  });
};

export const useGetUserByID = (userID: number) => {
  const { token } = useTokenStore();

  return useQuery({
    queryKey: ['user', userID],
    queryFn: () => getUserByID(token!, userID),
  });
};