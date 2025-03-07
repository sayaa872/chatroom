require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const authRoutes = require('./routes/auth');
const pool = require('./config/database');
const messagesRoutes = require('./routes/messages');
const friendsRoutes = require('./routes/friends');
const conversationsRoutes = require('./routes/conversations');
const auth = require('./middleware/auth');

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/conversations', conversationsRoutes);

// Redirection vers login
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// Socket.IO avec authentification
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
});

io.on('connection', async (socket) => {
    console.log(`Utilisateur connecté: ${socket.user.username}`);

    // Charger l'historique des messages
    try {
        const messages = await pool.query(
            `SELECT messages.*, users.username 
             FROM messages 
             JOIN users ON messages.user_id = users.id 
             ORDER BY messages.created_at DESC 
             LIMIT 50`
        );
        socket.emit('message_history', messages.rows.reverse());
    } catch (error) {
        console.error('Erreur lors du chargement des messages:', error);
    }

    socket.on('chat message', async (msg) => {
        try {
            const result = await pool.query(
                'INSERT INTO messages (user_id, content) VALUES ($1, $2) RETURNING id, content, created_at',
                [socket.user.id, msg]
            );
            
            const message = {
                ...result.rows[0],
                username: socket.user.username
            };
            
            io.emit('chat message', message);
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement du message:', error);
        }
    });

    socket.on('typing', () => {
        socket.broadcast.emit('user typing', socket.user.username);
    });

    socket.on('stop typing', () => {
        socket.broadcast.emit('stop typing', socket.user.username);
    });

    socket.on('disconnect', () => {
        console.log(`Utilisateur déconnecté: ${socket.user.username}`);
    });

    // Gestion des messages privés en temps réel
    socket.on('private message', async (data) => {
        try {
            // Trouver tous les participants à cette conversation
            const participants = await pool.query(
                'SELECT user_id FROM conversation_participants WHERE conversation_id = $1',
                [data.conversation_id]
            );
            
            // Émettre le message à tous les participants connectés
            participants.rows.forEach(participant => {
                // Ne pas renvoyer au émetteur du message
                if (participant.user_id !== socket.user.id) {
                    const participantSocket = findSocketByUserId(participant.user_id);
                    if (participantSocket) {
                        participantSocket.emit('private message', data);
                    }
                }
            });
        } catch (error) {
            console.error('Erreur d\'envoi de message privé:', error);
        }
    });
});

// Fonction utilitaire pour trouver un socket par user_id
function findSocketByUserId(userId) {
    let targetSocket = null;
    io.sockets.sockets.forEach(socket => {
        if (socket.user && socket.user.id === userId) {
            targetSocket = socket;
        }
    });
    return targetSocket;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur en marche sur le port ${PORT}`);
});

// Chargement des demandes d'amis en attente
async function loadFriendRequests() {
  try {
    const response = await fetch('/api/friends/pending', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const requests = await response.json();
    displayFriendRequests(requests);
  } catch (error) {
    console.error('Erreur de chargement des demandes d\'amis:', error);
  }
}

// Affichage des demandes d'amis
function displayFriendRequests(requests) {
  const requestsContainer = document.getElementById('friendRequests');
  const emptyRequests = document.getElementById('emptyRequests');
  
  if (requests.length === 0) {
    emptyRequests.style.display = 'flex';
    requestsContainer.innerHTML = '';
    return;
  }
  
  emptyRequests.style.display = 'none';
  requestsContainer.innerHTML = requests.map(request => `
    <div class="friend-request-card">
      <div class="friend-info">
        <div class="friend-avatar">${request.username.charAt(0).toUpperCase()}</div>
        <div class="friend-name">${request.username}</div>
      </div>
      <div class="friend-request-actions">
        <button class="accept-btn" onclick="handleFriendRequest('${request.id}', 'accepted')">
          <i class="fas fa-check"></i>
        </button>
        <button class="reject-btn" onclick="handleFriendRequest('${request.id}', 'rejected')">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  `).join('');
}

// Gestion des demandes d'amis
window.handleFriendRequest = async function(requestId, status) {
  try {
    const response = await fetch(`/api/friends/request/${requestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    
    if (response.ok) {
      // Rafraîchir les listes
      loadFriendRequests();
      loadFriends();
      
      if (status === 'accepted') {
        alert('Demande d\'ami acceptée !');
      } else {
        alert('Demande d\'ami refusée.');
      }
    }
  } catch (error) {
    console.error('Erreur de traitement de la demande:', error);
  }
};

async function loadFriends() {
  try {
    const response = await fetch('/api/friends', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    friends = await response.json();
    displayFriends(friends);
    
    // Charger aussi les demandes d'amis
    loadFriendRequests();
  } catch (error) {
    console.error('Erreur de chargement des amis:', error);
  }
}