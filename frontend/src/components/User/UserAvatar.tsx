import type { AvatarProps } from 'antd';
import { Avatar } from 'antd';
import { useMemo } from 'react';
import { hashColor } from '../../utils/ui.ts';
import { prefixUrl } from '../../api/api.ts';

interface Props extends AvatarProps {
  user?: UserModel;
}

const UserAvatar = (props: Props) => {
  const firstLetter = useMemo(
    () => (props.user?.username && props.user?.username[0].toUpperCase()) || '?',
    [props.user],
  );

  const avatarSrc = useMemo(() => {
    const src = props.user?.avatar;
    if (!src) return undefined;
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    return prefixUrl(src);
  }, [props.user?.avatar]);

  return (
    <Avatar
      src={avatarSrc}
      {...props}
      style={{ backgroundColor: hashColor(props.user?.username || 'unknown') }}
    >
      {firstLetter}
    </Avatar>
  );
};

export default UserAvatar;