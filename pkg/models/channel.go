package models

import "time"

type ChannelType string

const (
	ChannelTypePrivateChat ChannelType = "private_chat"
	ChannelTypeGroupChat   ChannelType = "group_chat"
	ChannelTypeChannel     ChannelType = "channel"
)

type Channel struct {
	ID              uint        `json:"id" gorm:"primaryKey"`
	Name            string      `json:"name"`
	CreatorID       uint        `json:"-"`
	Creator         User        `json:"creator,omitempty" gorm:"foreignKey:CreatorID"`
	Description     string      `json:"description"`
	Members         []User      `json:"members,omitempty" gorm:"many2many:channel_users;"`
	Messages        []Message   `json:"messages,omitempty" gorm:"many2many:channel_chat_messages;"`
	Type            ChannelType `json:"type"`
	LastMessageTime time.Time   `json:"last_message_time"`
}
