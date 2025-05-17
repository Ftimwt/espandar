import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { Done, DoneAll } from '@mui/icons-material';
import { API_URL } from '../../constants/config';

const MessageList = ({ messages, userId, navigate }) => {
  // فرمت کردن تاریخ و ساعت به فرمت فارسی
  const formatDateTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'نامشخص';
    }
  };

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
              bgcolor: msg.SenderID === parseInt(userId) ? '#e3f2fd' : '#fff',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography variant="body1">
              {msg.Content.split(' ').map((part, partIndex) => {
                if (part.startsWith('@') || part.startsWith('#')) {
                  const tag = Array.isArray(msg.Tags)
                    ? msg.Tags.find((t) => t?.name === part.slice(1))
                    : null;
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
              const isPicture =
                file.Type === 'picture' || file.file_path?.match(/\.(jpg|jpeg|png|gif)$/i);
              const isVideo = file.Type === 'video' && !isVoice;
              return (
                <Box key={file.ID || `${msg.ID}-file-${file.FilePath}`}>
                  {isPicture && file.file_path && (
                    <img
                      src={`${API_URL}${file.file_path}`}
                      alt="attachment"
                      style={{ maxWidth: '200px' }}
                    />
                  )}
                  {isVoice && file.file_path && <audio controls src={`${API_URL}${file.file_path}`} />}
                  {isVideo && file.file_path && (
                    <video controls src={`${API_URL}${file.file_path}`} style={{ maxWidth: '200px' }} />
                  )}
                </Box>
              );
            })}
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, alignSelf: 'flex-end' }}>
              <Typography variant="caption" sx={{ mr: 1 }}>
                {formatDateTime(msg.CreatedAt)}
              </Typography>
              {msg.SenderID === parseInt(userId) && (
  <>
    {console.log('Message status:', msg.ID, 'seen:', msg.seen, 'is_received:', msg.is_received)}
    {msg.seen ? (
      <DoneAll sx={{ fontSize: 16, color: 'blue' }} />
    ) : msg.is_received ? (
      <Done sx={{ fontSize: 16, color: 'grey' }} />
    ) : (
      <Done sx={{ fontSize: 16, color: 'grey', opacity: 0.5 }} />
    )}
  </>
)}
            </Box>
          </Paper>
        ))
      ) : (
        <Typography>پیامی برای نمایش وجود ندارد</Typography>
      )}
    </Box>
  );
};

export default MessageList;