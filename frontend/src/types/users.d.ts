interface UserModel {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  status: string;
  avatar: string;
}

interface UserInfoResponse {
  user: UserModel;
}

interface UsersListRequest {
  limit?: number;
  offset?: number;
  query?: string;
}

interface UsersListResponse {
  users: UserModel[];
  total: number;
}

interface UserResponse {
  user: UserModel;
}