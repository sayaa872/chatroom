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

    // Charger les conversations de l'utilisateur
    try {
        const conversations = await pool.query(
            `SELECT DISTINCT pc.id as conversation_id, 
                u.username, 
                u.id as other_user_id
            FROM private_conversations pc
            JOIN conversation_participants cp ON pc.id = cp.conversation_id
            JOIN conversation_participants cp2 ON pc.id = cp2.conversation_id
            JOIN users u ON cp2.user_id = u.id
            WHERE cp.user_id = $1 AND cp2.user_id != $1`,
            [socket.user.id]
        );
        
        // Pour chaque conversation, charger les derniers messages
        for (let conv of conversations.rows) {
            const messages = await pool.query(
                `SELECT pm.*, u.username
                FROM private_messages pm
                JOIN users u ON pm.sender_id = u.id
                WHERE pm.conversation_id = $1
                ORDER BY pm.created_at DESC
                LIMIT 50`,
                [conv.conversation_id]
            );
            
            socket.emit('conversation_history', {
                conversationId: conv.conversation_id,
                otherUser: {
                    id: conv.other_user_id,
                    username: conv.username
                },
                messages: messages.rows.reverse()
            });
        }
    } catch (error) {
        console.error('Erreur lors du chargement des conversations:', error);
    }

    // Gestion des messages privés
    socket.on('private message', async (data) => {
        try {
            const { conversationId, content } = data;
            
            // Sauvegarder le message
            const result = await pool.query(
                'INSERT INTO private_messages (conversation_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
                [conversationId, socket.user.id, content]
            );
            
            // Récupérer les participants de la conversation
            const participants = await pool.query(
                'SELECT user_id FROM conversation_participants WHERE conversation_id = $1',
                [conversationId]
            );
            
            // Envoyer le message à tous les participants
            const messageWithUser = {
                ...result.rows[0],
                username: socket.user.username
            };
            
            participants.rows.forEach(participant => {
                const participantSocket = findSocketByUserId(participant.user_id);
                if (participantSocket) {
                    participantSocket.emit('private message', messageWithUser);
                }
            });
        } catch (error) {
            console.error('Erreur lors de l\'envoi du message:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Utilisateur déconnecté: ${socket.user.username}`);
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