import { prefixUrl } from '../../api/api.ts';

export interface MessageFileProps {
  file: FileModel;
}

const MessageFile = (props: MessageFileProps) => {
  const { file } = props;

  const fileURL = prefixUrl(file.path);

  if (file.type === 'image') {
    return <img src={fileURL} alt={file.name} />;
  } else if (file.type === 'audio') {
    return <audio src={fileURL} controls />;
  }
  return (
    <a href={fileURL} download>
      download
    </a>
  );
};

export default MessageFile;
