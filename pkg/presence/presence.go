package presence

import (
	"sync"
	"time"
)

type Service struct {
	onlineUsers map[uint]time.Time
	mu          sync.RWMutex
}

func New() *Service {
	return &Service{
		onlineUsers: make(map[uint]time.Time),
	}
}

func (p *Service) SetOnline(userID uint) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.onlineUsers[userID] = time.Now()
}

func (p *Service) SetOffline(userID uint) {
	p.mu.Lock()
	defer p.mu.Unlock()
	delete(p.onlineUsers, userID)
}

func (p *Service) IsOnline(userID uint) bool {
	p.mu.RLock()
	defer p.mu.RUnlock()
	_, ok := p.onlineUsers[userID]
	return ok
}
