let socket;
let pc;
let localStream;

// اتصال به سوکت با JWT
function connectSocket() {
    const token = document.getElementById('token').value;
    if (!token) {
        alert('Please enter a valid JWT token');
        return;
    }

    socket = io('http://localhost:8080', {
        query: { Authorization: token }
    });

    socket.on('connect', () => {
        console.log('Connected to server with ID:', socket.id);
        document.getElementById('status').textContent = 'Connected';
    });

    socket.on('connect_error', (err) => {
        console.error('Connection error:', err.message);
        alert('Connection failed: ' + err.message);
        document.getElementById('status').textContent = 'Disconnected';
    });

    // مدیریت سیگنال‌های WebRTC
    socket.on('signal', async (msg) => {
        console.log('Received signal:', msg);
        if (!pc) {
            console.warn('No PeerConnection, creating new one');
            await setupPeerConnection();
        }

        try {
            switch (msg.event) {
                case 'answer':
                    const answer = JSON.parse(msg.data);
                    console.log('Applying answer:', answer);
                    if (!answer.sdp || !answer.type) {
                        console.error('Invalid answer:', answer);
                        return;
                    }
                    await pc.setRemoteDescription(new RTCSessionDescription(answer));
                    break;
                case 'candidate':
                    const candidate = JSON.parse(msg.data);
                    console.log('Applying candidate:', candidate);
                    if (!candidate.candidate) {
                        console.error('Invalid candidate:', candidate);
                        return;
                    }
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    break;
                case 'error':
                    console.error('Server error:', msg.data);
                    alert('Error from server: ' + msg.data);
                    break;
                default:
                    console.warn('Unknown signal event:', msg.event);
            }
        } catch (err) {
            console.error('Error handling signal:', err);
            alert('Signal error: ' + err.message);
        }
    });

    // اطلاع از شروع تماس گروهی
    socket.on('group_call_started', (groupID) => {
        console.log('Group call started in group:', groupID);
        alert(`Group call started in group ${groupID}. Join now?`);
    });

    // مدیریت خطاهای عمومی
    socket.on('error', (msg) => {
        console.error('Server error:', msg);
        alert('Error: ' + msg);
    });

    socket.on('disconnect', (reason) => {
        console.log('Disconnected:', reason);
        document.getElementById('status').textContent = 'Disconnected';
    });
}

// تنظیم PeerConnection
async function setupPeerConnection() {
    pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        console.log('Got local stream:', localStream.id);
        document.getElementById('localVideo').srcObject = localStream;
        localStream.getTracks().forEach(track => {
            console.log('Adding track:', track.kind);
            pc.addTrack(track, localStream);
        });
    } catch (err) {
        console.error('Error accessing media devices:', err);
        alert('Cannot access camera/microphone: ' + err.message);
        return;
    }

    pc.ontrack = (event) => {
        console.log('Received remote track:', event.streams[0].id);
        const video = document.createElement('video');
        video.autoplay = true;
        video.srcObject = event.streams[0];
        video.style.width = '320px';
        video.style.margin = '5px';
        document.getElementById('remoteVideos').appendChild(video);
    };

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('Sending candidate:', event.candidate);
            socket.emit('signal', { event: 'candidate', data: JSON.stringify(event.candidate) });
        }
    };

    pc.onconnectionstatechange = () => {
        console.log('PeerConnection state:', pc.connectionState);
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            alert('Connection failed or closed');
        }
    };

    pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
    };
}

// شروع تماس خصوصی
async function startPrivateCall() {
    const userID1 = parseInt(document.getElementById('userID').value);
    const userID2 = parseInt(document.getElementById('userID2').value);
    const username = document.getElementById('username').value;

    if (!socket || !socket.connected) {
        alert('Please connect to the server first');
        return;
    }

    if (!userID1 || !userID2 || !username) {
        alert('Please fill in all fields');
        return;
    }

    await setupPeerConnection();
    if (!pc) {
        alert('Failed to create PeerConnection');
        return;
    }

    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log('Sending offer:', offer);
        socket.emit('signal', { event: 'offer', data: JSON.stringify(offer) });
        socket.emit('startPrivateCall', userID1, userID2, username);
    } catch (err) {
        console.error('Error creating offer:', err);
        alert('Error creating offer: ' + err.message);
    }
}

// شروع تماس گروهی
async function startGroupCall() {
    const groupID = parseInt(document.getElementById('groupID').value);
    const userID = parseInt(document.getElementById('userID').value);
    const username = document.getElementById('username').value;

    if (!socket || !socket.connected) {
        alert('Please connect to the server first');
        return;
    }

    if (!groupID || !userID || !username) {
        alert('Please fill in all fields');
        return;
    }

    await setupPeerConnection();
    if (!pc) {
        alert('Failed to create PeerConnection');
        return;
    }

    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log('Sending offer:', offer);
        socket.emit('signal', { event: 'offer', data: JSON.stringify(offer) });
        socket.emit('startGroupCall', groupID, userID, username);
    } catch (err) {
        console.error('Error creating offer:', err);
        alert('Error creating offer: ' + err.message);
    }
}

// جوین به تماس گروهی
async function joinGroupCall() {
    const groupID = parseInt(document.getElementById('groupID').value);
    const userID = parseInt(document.getElementById('userID').value);
    const username = document.getElementById('username').value;

    if (!socket || !socket.connected) {
        alert('Please connect to the server first');
        return;
    }

    if (!groupID || !userID || !username) {
        alert('Please fill in all fields');
        return;
    }

    await setupPeerConnection();
    if (!pc) {
        alert('Failed to create PeerConnection');
        return;
    }

    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log('Sending offer:', offer);
        socket.emit('signal', { event: 'offer', data: JSON.stringify(offer) });
        socket.emit('joinGroupCall', groupID, userID, username);
    } catch (err) {
        console.error('Error creating offer:', err);
        alert('Error creating offer: ' + err.message);
    }
}

// قطع تماس
function hangUp() {
    if (pc) {
        pc.close();
        pc = null;
        console.log('PeerConnection closed');
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
        console.log('Local stream stopped');
    }
    document.getElementById('localVideo').srcObject = null;
    document.getElementById('remoteVideos').innerHTML = '';
}