const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');

// Obtenir toutes les conversations de l'utilisateur
router.get('/', auth, async (req, res) => {
    try {
        const conversations = await pool.query(
            `SELECT DISTINCT pc.id, pc.created_at,
             array_agg(u.username) as participants
             FROM private_conversations pc
             JOIN conversation_participants cp ON pc.id = cp.conversation_id
             JOIN users u ON cp.user_id = u.id
             WHERE pc.id IN (
                 SELECT conversation_id 
                 FROM conversation_participants 
                 WHERE user_id = $1
             )
             GROUP BY pc.id, pc.created_at
             ORDER BY pc.created_at DESC`,
            [req.user.id]
        );
        res.json(conversations.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Créer une nouvelle conversation
router.post('/', auth, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { participantIds } = req.body;
        participantIds.push(req.user.id); // Ajouter l'utilisateur actuel

        // Créer la conversation
        const newConversation = await client.query(
            'INSERT INTO private_conversations DEFAULT VALUES RETURNING id'
        );

        // Ajouter les participants
        const conversationId = newConversation.rows[0].id;
        for (let userId of participantIds) {
            await client.query(
                'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2)',
                [conversationId, userId]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ id: conversationId });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Obtenir les messages d'une conversation
router.get('/:id/messages', auth, async (req, res) => {
    try {
        // Vérifier que l'utilisateur fait partie de la conversation
        const participant = await pool.query(
            'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );

        if (participant.rows.length === 0) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        const messages = await pool.query(
            `SELECT pm.*, u.username
             FROM private_messages pm
             JOIN users u ON pm.user_id = u.id
             WHERE pm.conversation_id = $1
             ORDER BY pm.created_at ASC`,
            [req.params.id]
        );

        res.json(messages.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Envoyer un message dans une conversation
router.post('/:id/messages', auth, async (req, res) => {
    try {
        const { content } = req.body;
        const conversationId = req.params.id;

        // Vérifier que l'utilisateur fait partie de la conversation
        const participant = await pool.query(
            'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
            [conversationId, req.user.id]
        );

        if (participant.rows.length === 0) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        const result = await pool.query(
            `INSERT INTO private_messages (conversation_id, user_id, content)
             VALUES ($1, $2, $3)
             RETURNING id, content, created_at`,
            [conversationId, req.user.id, content]
        );

        const message = {
            ...result.rows[0],
            username: req.user.username
        };

        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 