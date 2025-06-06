import type { AxiosResponse } from 'axios';
import { authClient } from './api.ts';
import { useTokenStore } from '../store/useToken.ts';
import { useMutation } from '@tanstack/react-query';

type ReceiverType = 'users' | 'channels' | 'groups';

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

export const useSendMessage = (target: number, receiverType: ReceiverType) => {
  const { token } = useTokenStore();

  return useMutation<AxiosResponse<SendMessageResponse>, unknown, SendMessageRequest>({
    mutationKey: [`message_${receiverType}_${target}`],
    mutationFn: (data) => sendMessageAPI(token!, data, target, receiverType),
  });
};
