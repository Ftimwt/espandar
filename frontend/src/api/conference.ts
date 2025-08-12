import {authClient} from "./api.ts";
import type {AxiosResponse} from "axios";
import {useTokenStore} from "../store/useToken.ts";
import {useMutation, useQuery} from "@tanstack/react-query";
import type {CreateConferenceApiRequest, CreateConferenceRequest, CreateConferenceResponse} from "../types/conference";

const createConference = async (
  token: string,
  data: CreateConferenceRequest
) => {
  const payload: CreateConferenceApiRequest = {
    title: data.title,
    participants: data.participants,
    scheduled_at: data.scheduled_at?.toISOString(),
  };

  return authClient(token).post<
    CreateConferenceResponse,
    AxiosResponse<CreateConferenceResponse>,
    CreateConferenceApiRequest
  >("/conferences", payload);
};

export const getConference = async (token: string, id: number) => {
  return authClient(token).get<void, AxiosResponse<CreateConferenceApiRequest>, void>(`/conferences/${id}`);
}

export const useConferenceByID = (id: number) => {
  const {token} = useTokenStore();
  return useQuery({
    queryKey: ['conferences'],
    queryFn: () => {
      return getConference(token!, id)
    }
  })
}

export const useCreateConference = (onSuccess?: () => void) => {
  const {token} = useTokenStore();

  return useMutation<
    AxiosResponse<CreateConferenceResponse>,
    unknown,
    CreateConferenceRequest
  >({
    mutationKey: ["conferences"],
    mutationFn: (data) => createConference(token!, data),
    onSuccess: () => {
      if (onSuccess) onSuccess();
    },
  });
};
