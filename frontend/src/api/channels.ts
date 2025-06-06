import { authClient } from './api.ts';
import type { AxiosResponse } from 'axios';
import { useTokenStore } from '../store/useToken.ts';
import { useMutation } from '@tanstack/react-query';

export const createChannelAPI = async (token: string, data: CreateChannelRequest) => {
  return authClient(token).post<
    ChannelResponse,
    AxiosResponse<ChannelResponse>,
    CreateChannelRequest
  >('/channels', data);
};

export const useCreateChannel = () => {
  const { token } = useTokenStore();

  return useMutation<AxiosResponse<ChannelResponse>, unknown, CreateChannelRequest>({
    mutationKey: ['channels', 'channel'],
    mutationFn: (data) => createChannelAPI(token!, data),
  });
};
