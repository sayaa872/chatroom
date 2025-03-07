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

// Obtenir les demandes d'ami en attente
router.get('/pending', auth, async (req, res) => {
    try {
        const pendingRequests = await pool.query(
            `SELECT fr.id, fr.sender_id, u.username 
             FROM friend_requests fr 
             JOIN users u ON fr.sender_id = u.id 
             WHERE fr.recipient_id = $1 AND fr.status = 'pending'`,
            [req.user.id]
        );
        
        res.json(pendingRequests.rows);
    } catch (error) {
        console.error('Erreur lors de la récupération des demandes d\'amis:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route pour gérer les demandes d'amis
router.put('/request/:requestId', auth, async (req, res) => {
    const { requestId } = req.params;
    const { status } = req.body;
    
    try {
        // Vérifier que la demande existe et appartient à l'utilisateur
        const request = await pool.query(
            'SELECT * FROM friend_requests WHERE id = $1 AND recipient_id = $2',
            [requestId, req.user.id]
        );
        
        if (request.rows.length === 0) {
            return res.status(404).json({ error: 'Demande non trouvée' });
        }
        
        if (status === 'accepted') {
            // Ajouter l'amitié dans les deux sens
            await pool.query(
                'INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2), ($2, $1)',
                [req.user.id, request.rows[0].sender_id]
            );
        }
        
        // Mettre à jour le statut de la demande
        await pool.query(
            'UPDATE friend_requests SET status = $1 WHERE id = $2',
            [status, requestId]
        );
        
        res.json({ message: 'Demande traitée avec succès' });
    } catch (error) {
        console.error('Erreur lors du traitement de la demande:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router; 