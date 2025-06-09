interface ChannelModel {
  id: number;
  name: string;
  type: string;
  creator: UserModel;
  avatar: string;
  last_message_time: string;
  members: UserModel[];
}

interface ChannelResponse {
  channel: ChannelModel;
}

interface CreateChannelRequest {
  name: string;
  description?: string;
  members: number[];
}
