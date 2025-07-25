import {authClient} from "./api.ts";
import type {AxiosResponse} from "axios";
import {useTokenStore} from "../store/useToken.ts";
import {useMutation} from "@tanstack/react-query";


export const createConference = async (token: string,data: CreateConferenceRequest) => {
    return authClient(token).post<
        CreateConferenceResponse,
        AxiosResponse<CreateConferenceResponse>,
        CreateConferenceRequest>
    ("/conferences", data);
}

export const useCreateConference = () => {
    const { token } = useTokenStore();

  return useMutation<AxiosResponse<CreateConferenceResponse>, unknown, CreateConferenceRequest>({
    mutationKey: ['channels', 'channel'],
    mutationFn: (data) => createConference(token!, data),
  });
};