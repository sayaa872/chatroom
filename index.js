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
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur en marche sur le port ${PORT}`);
});