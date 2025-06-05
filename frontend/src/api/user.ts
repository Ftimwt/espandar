import {authClient} from "./api.ts";
import {useTokenStore} from "../store/useToken.ts";
import {useQuery} from "@tanstack/react-query";

export const getUserInfo = (token: string) => {
  return authClient(token).get('/auth/me', {});
}

export const useGetUserInfo = () => {
  const {token} = useTokenStore();

  return useQuery({
    queryKey: ['user'],
    queryFn: () => getUserInfo(token!),
  });
}