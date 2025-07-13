import { authClient } from './api.ts';
import type { AxiosResponse } from 'axios';
import { useTokenStore } from '../store/useToken.ts';
import { useMutation } from '@tanstack/react-query';

export const createGroupAPI = async (token: string, data: CreateGroupRequest) => {
  return authClient(token).post<GroupResponse, AxiosResponse<GroupResponse>, CreateGroupRequest>(
    '/groups',
    data,
  );
};

export const useCreateGroup = () => {
  const { token } = useTokenStore();

  return useMutation<AxiosResponse<GroupResponse>, unknown, CreateGroupRequest>({
    mutationKey: ['groups', 'group'],
    mutationFn: (data) => createGroupAPI(token!, data),
  });
};
