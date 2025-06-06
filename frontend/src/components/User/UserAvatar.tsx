import type { AvatarProps } from 'antd';
import { Avatar } from 'antd';
import { useMemo } from 'react';

interface Props extends AvatarProps {
  user?: UserModel;
}

const UserAvatar = (props: Props) => {
  const firstLetter = useMemo(
    () => (props.user?.username && props.user?.username[0].toUpperCase()) || '?',
    [props.user],
  );

  return <Avatar src={props.user?.avatar}>{firstLetter}</Avatar>;
};

export default UserAvatar;
