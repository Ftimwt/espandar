import React, { useState } from 'react';
import { Box, Paper, Typography, Menu, MenuItem, Avatar } from '@mui/material';
import { Done, DoneAll } from '@mui/icons-material';
import { API_URL } from '../../constants/config';
import { deleteMessage, updateMessage } from '../../api';

const MessageList = ({ messages, userId, navigate, setEditingMessage }) => {
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const handleContextMenu = (event, msg) => {
    event.preventDefault();
    setContextMenu({ mouseX: event.clientX + 2, mouseY: event.clientY - 6 });
    setSelectedMessage(msg);
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

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
        messages.map((msg) => (
          <Paper
           key={msg.message_id || msg.ID}
            onContextMenu={(e) => handleContextMenu(e, msg)}
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
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
  <Avatar
    src={`${API_URL}${msg.Sender?.ProfileImage || msg.SenderProfileImage || '/Uploads/profile/default.png'}`}
    sx={{ width: 32, height: 32, mr: 1 }}
  />
  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
    {msg.Sender?.Username || msg.SenderUsername || 'کاربر'}
  </Typography>
</Box>
            <Typography variant="body1">
              {msg.Content?.split(' ').map((part, partIndex) => {
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
              const type = (file.Type || '').toLowerCase();
              const path = file.FilePath || file.file_path;
              const isVoice = type === 'voice' || path?.match(/\.(webm|mp3|wav)$/i);
              const isPicture = type === 'picture' || path?.match(/\.(jpg|jpeg|png|gif)$/i);
              const isVideo = type === 'video' && !isVoice;
              return (
                <Box key={file.ID || `${msg.ID}-${Math.random()}`}>
                  {isPicture && path && (
                    <img
                      src={`${API_URL}${path}`}
                      alt="attachment"
                      style={{ maxWidth: '200px', marginTop: 8 }}
                    />
                  )}
                  {isVoice && path && (
                    <audio controls src={`${API_URL}${path}`} style={{ marginTop: 8 }} />
                  )}
                  {isVideo && path && (
                    <video
                      controls
                      src={`${API_URL}${path}`}
                      style={{ maxWidth: '200px', marginTop: 8 }}
                    />
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
                  {msg.seen ? (
                    <DoneAll sx={{ fontSize: 16, color: 'blue' }} />
                  ) : msg.is_received ? (
                    <DoneAll sx={{ fontSize: 16, color: 'gray' }} />
                  ) : (
                    <Done sx={{ fontSize: 16, color: 'gray', opacity: 0.5 }} />
                  )}
                </>
              )}
            </Box>
          </Paper>
        ))
      ) : (
        <Typography>پیامی برای نمایش وجود ندارد</Typography>
      )}

<Menu
  open={contextMenu !== null}
  onClose={handleCloseContextMenu}
  anchorReference="anchorPosition"
  anchorPosition={
    contextMenu !== null
      ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
      : undefined
  }
>
  {selectedMessage?.SenderID === parseInt(userId) &&
    [
      <MenuItem
        key="edit"
        onClick={() => {
          setEditingMessage(selectedMessage);
          handleCloseContextMenu();
        }}
      >
        ویرایش
      </MenuItem>,
      <MenuItem
        key="delete"
        onClick={() => {
          if (window.confirm("آیا از حذف پیام مطمئن هستید؟")) {
            deleteMessage(localStorage.getItem("token"), selectedMessage.message_id).then(() =>
              window.location.reload()
            );
          }
          handleCloseContextMenu();
        }}
      >
        حذف
      </MenuItem>,
    ]}
</Menu>
    </Box>
  );
};

export default MessageList;
