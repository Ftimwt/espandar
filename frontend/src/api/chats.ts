import { authClient } from './api.ts';
import type { AxiosResponse } from 'axios';
import { useTokenStore } from '../store/useToken.ts';
import { useQuery } from '@tanstack/react-query';

export const getChatListAPI = (token: string) => {
  return authClient(token).get<ChatListResponse, AxiosResponse<ChatListResponse>, void>(
    '/chats/latest',
    {},
  );
};

export const useGetChatList = () => {
  const { token } = useTokenStore();

  return useQuery({
    queryKey: ['chats', 'messages'],
    queryFn: () => getChatListAPI(token!),
  });
};
