import type { AxiosResponse } from 'axios';
import { authClient } from './api.ts';
import { useTokenStore } from '../store/useToken.ts';
import { useMutation, useQuery } from '@tanstack/react-query';

type ReceiverType = 'users' | 'channels' | 'groups';

export interface SendMessageRequest {
  text: string;
  files?: number[];
}

export const sendMessageAPI = async (
  token: string,
  data: SendMessageRequest,
  target: number,
  receiverType: ReceiverType,
) => {
  return authClient(token).post<
    SendMessageResponse,
    AxiosResponse<SendMessageResponse>,
    SendMessageRequest
  >(`/${receiverType}/${target}/send`, data, {
    method: 'POST',
  });
};

export type ChannelRouteType = 'users' | 'channels' | 'groups';

export const getMessagesListAPI = async (
  token: string,
  channelType: ChannelRouteType,
  targetID: number,
) => {
  return authClient(token).get<MessagesResponse, AxiosResponse<MessagesResponse>, void>(
    `/${channelType}/${targetID}/messages`,
  );
};

export const uploadFileAPI = async (token: string, blob: Blob, fileName: string) => {
  const formData = new FormData();
  formData.append('file', blob, fileName);
  return authClient(token).post<FileModel, AxiosResponse<FileModel>, FormData>(
    '/chats/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
};

export const markAllAsRead = (token: string, target: number, receiverType: ReceiverType) => {
  return authClient(token).put<void, AxiosResponse<void>, void>(
    `/${receiverType}/${target}/messages/read`,
  );
};

export const useSendMessage = (target: number, receiverType: ReceiverType) => {
  const { token } = useTokenStore();

  return useMutation<AxiosResponse<SendMessageResponse>, unknown, SendMessageRequest>({
    mutationKey: [`message_${receiverType}_${target}`],
    mutationFn: (data) => sendMessageAPI(token!, data, target, receiverType),
  });
};

export const useGetMessagesList = (channelType: ChannelRouteType, targetID: number) => {
  const { token } = useTokenStore();

  return useQuery({
    queryKey: ['messages', `messages_${channelType}_${targetID}`],
    queryFn: () => getMessagesListAPI(token!, channelType, targetID),
  });
};

export const useMarkAllAsRead = (target: number, receiverType: ReceiverType) => {
  const { token } = useTokenStore();

  return useMutation<AxiosResponse<void>, unknown, void>({
    mutationKey: ['messages', `messages_${receiverType}_${target}`],
    mutationFn: () => markAllAsRead(token!, target, receiverType),
  });
};

export const useUploadFile = () => {
  const { token } = useTokenStore();
  return useMutation<AxiosResponse<FileModel>, unknown, FileRequest>({
    mutationFn: (data) => uploadFileAPI(token!, data.file, data.name),
  });
};

export function useUpdateMessage(channelID: number, messageID: number) {
  const { token } = useTokenStore();
  return useMutation({
    mutationKey: ['message_update', channelID, messageID],
    mutationFn: (text: string) =>
      authClient(token!).put(`/channels/${channelID}/messages/${messageID}`, { text }),
  });
}

export const useDeleteMessage = (channelID: number) => {
  const { token } = useTokenStore();
  return useMutation<AxiosResponse<any>, Error, number>({
    mutationFn: (messageID: number) =>
      authClient(token!).delete(`/channels/${channelID}/messages/${messageID}`),
  });
};

export const useForwardMessage = () => {
  const { token } = useTokenStore();
  return useMutation<{ targetChannelID: number; messageID: number }, Error, { targetChannelID: number; messageID: number }>({
    mutationFn: ({ targetChannelID, messageID }) =>
      authClient(token!).post(`/channels/${targetChannelID}/messages/${messageID}/forward`),
  });
};



