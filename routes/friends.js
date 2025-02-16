const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');

// Obtenir la liste d'amis
router.get('/', auth, async (req, res) => {
    try {
        const friends = await pool.query(
            `SELECT u.id, u.username 
             FROM friendships f 
             JOIN users u ON (f.friend_id = u.id) 
             WHERE f.user_id = $1 AND f.status = 'accepted'
             UNION 
             SELECT u.id, u.username 
             FROM friendships f 
             JOIN users u ON (f.user_id = u.id) 
             WHERE f.friend_id = $1 AND f.status = 'accepted'`,
            [req.user.id]
        );
        res.json(friends.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Envoyer une demande d'ami
router.post('/request', auth, async (req, res) => {
    try {
        const { friendUsername } = req.body;
        
        // Vérifier si l'utilisateur existe
        const friend = await pool.query(
            'SELECT id FROM users WHERE username = $1',
            [friendUsername]
        );

        if (friend.rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const friendId = friend.rows[0].id;

        // Vérifier si une demande existe déjà
        const existingRequest = await pool.query(
            'SELECT * FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
            [req.user.id, friendId]
        );

        if (existingRequest.rows.length > 0) {
            return res.status(400).json({ error: 'Une demande existe déjà' });
        }

        // Créer la demande
        await pool.query(
            'INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2)',
            [req.user.id, friendId]
        );

        res.status(201).json({ message: 'Demande envoyée' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Accepter/Rejeter une demande d'ami
router.put('/request/:id', auth, async (req, res) => {
    try {
        const { status } = req.body; // 'accepted' ou 'rejected'
        const friendshipId = req.params.id;

        await pool.query(
            'UPDATE friendships SET status = $1 WHERE id = $2 AND friend_id = $3',
            [status, friendshipId, req.user.id]
        );

        res.json({ message: `Demande ${status}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtenir les demandes d'ami en attente
router.get('/pending', auth, async (req, res) => {
    try {
        const requests = await pool.query(
            `SELECT f.id, u.username 
             FROM friendships f 
             JOIN users u ON f.user_id = u.id 
             WHERE f.friend_id = $1 AND f.status = 'pending'`,
            [req.user.id]
        );
        res.json(requests.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 