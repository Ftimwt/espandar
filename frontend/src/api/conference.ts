import { authClient } from "./api.ts";
import type { AxiosResponse } from "axios";
import { useTokenStore } from "../store/useToken.ts";
import { useMutation } from "@tanstack/react-query";
import type {
  CreateConferenceRequest,
  CreateConferenceResponse,
  CreateConferenceApiRequest
} from "../types/conference";

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

const getConference = async () => {
  return 
}

export const useCreateConference = (onSuccess?: () => void) => {
  const { token } = useTokenStore();

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
