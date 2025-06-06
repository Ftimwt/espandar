interface ChannelModel {
  id: number;
  name: string;
  type: string;
  creator: UserModel;
  last_message_time: string;
  members: UserModel[];
}

interface ChannelResponse {
  data: ChannelModel;
}

interface CreateChannelRequest {
  name: string;
  description?: string;
  members: number[];
}
