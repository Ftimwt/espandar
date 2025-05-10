import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { API_URL } from '../../constants/config';

const MessageList = ({ messages, userId, navigate }) => {
  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
      {Array.isArray(messages) && messages.length > 0 ? (
        messages.map((msg, index) => (
          <Paper
            key={`${msg.ID}-${index}`}
            sx={{
              p: 2,
              mb: 2,
              maxWidth: '70%',
              alignSelf: msg.SenderID === parseInt(userId) ? 'flex-end' : 'flex-start',
            }}
          >
            <Typography>
              {msg.Content.split(' ').map((part, partIndex) => {
                if (part.startsWith('@') || part.startsWith('#')) {
                  const tag = msg.Tags?.find((t) => t.name === part.slice(1));
                  if (tag) {
                    return (
                      <span
                        key={partIndex}
                        style={{ color: 'blue', cursor: 'pointer' }}
                        onClick={() => {
                          if (tag.type === 'user') navigate(`/profile/${tag.id}`);
                          else if (tag.type === 'file') window.open(tag.name, '_blank');
                        }}
                      >
                        {part}{' '}
                      </span>
                    );
                  }
                }
                return <span key={partIndex}>{part} </span>;
              })}
            </Typography>
            {msg.Files?.map((file) => {
              const isVoice = file.Type === 'voice' || file.file_path?.match(/\.(webm|mp3|wav)$/i);
              const isPicture = file.Type === 'picture' || file.file_path?.match(/\.(jpg|jpeg|png|gif)$/i);
              const isVideo = file.Type === 'video' && !isVoice;
              return (
                <Box key={file.ID || `${msg.ID}-file-${file.FilePath}`}>
                  {isPicture && file.file_path && (
                    <img src={`${API_URL}${file.file_path}`} alt="attachment" style={{ maxWidth: '200px' }} />
                  )}
                  {isVoice && file.file_path && <audio controls src={`${API_URL}${file.file_path}`} />}
                  {isVideo && file.file_path && (
                    <video controls src={`${API_URL}${file.file_path}`} style={{ maxWidth: '200px' }} />
                  )}
                </Box>
              );
            })}
          </Paper>
        ))
      ) : (
        <Typography>پیامی برای نمایش وجود ندارد</Typography>
      )}
    </Box>
  );
};

export default MessageList;