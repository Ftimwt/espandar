interface GroupModel {
  id: number;
  name: string;
  type: string;
  creator: UserModel;
  avatar: string;
  last_message_time: string;
  members: UserModel[];
}

interface GroupResponse {
  group: GroupModel;
}

interface CreateGroupRequest {
  name: string;
  description?: string;
  members: number[];
}
