import { useState } from 'react';
import { SmileOutlined } from '@ant-design/icons';
import EmojiPicker from 'emoji-picker-react';

type Props = {
  onSelect: (emoji: string) => void;
};

const EmojiPickerButton = ({ onSelect }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <SmileOutlined
        onClick={() => setOpen(!open)}
        style={{ fontSize: 24, opacity: 0.6 }}
        className="cursor-pointer"
      />
      {open && (
        <div className="absolute bottom-12 left-0 z-50">
          <EmojiPicker
            onEmojiClick={(emojiObject) => {
              onSelect(emojiObject.emoji);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default EmojiPickerButton;
