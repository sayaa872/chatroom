const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');

// Récupérer les messages
router.get('/', auth, async (req, res) => {
    try {
        const messages = await pool.query(
            `SELECT messages.*, users.username 
             FROM messages 
             JOIN users ON messages.user_id = users.id 
             ORDER BY messages.created_at DESC 
             LIMIT 50`
        );
        res.json(messages.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
