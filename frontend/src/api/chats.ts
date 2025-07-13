import { authClient } from './api.ts';
import type { AxiosResponse } from 'axios';
import { useTokenStore } from '../store/useToken.ts';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ChannelRouteType } from './message.ts';

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

export const useGetChatByID = <
  T extends ChannelRouteType,
  R = T extends 'users' ? UserResponse : T extends 'channels' ? ChannelResponse : GroupResponse,
>(
  receiverType: T,
  id: number,
): UseQueryResult<AxiosResponse<R, any>, Error> => {
  const { token } = useTokenStore();
  return useQuery({
    queryKey: ['chats', 'users', 'channels', 'groups', `chat_${receiverType}_${id}`],
    queryFn: () => authClient(token!).get<R, AxiosResponse<R>, void>(`/${receiverType}/${id}`),
  });
};
