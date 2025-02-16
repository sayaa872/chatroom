let currentConversation = null;
let conversations = [];

// Chargement des conversations
async function loadConversations() {
    try {
        const response = await fetch('/api/conversations', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        conversations = await response.json();
        displayConversations(conversations);
    } catch (error) {
        console.error('Erreur chargement conversations:', error);
    }
}

// Affichage des conversations
function displayConversations(conversations) {
    const conversationsList = document.getElementById('conversationsList');
    conversationsList.innerHTML = conversations.map(conv => {
        const otherParticipants = conv.participants
            .filter(p => p !== currentUser.username)
            .join(', ');
        
        return `
            <div class="conversation-item ${conv.id === currentConversation?.id ? 'active' : ''}" 
                 onclick="openConversation('${conv.id}')">
                <div class="conversation-avatar">
                    <img src="https://ui-avatars.com/api/?name=${otherParticipants}" alt="Avatar">
                </div>
                <div class="conversation-info">
                    <h4>${otherParticipants}</h4>
                    <p class="last-message">${conv.last_message || 'Aucun message'}</p>
                </div>
            </div>
        `;
    }).join('');
}

// Ouverture d'une conversation
async function openConversation(conversationId) {
    currentConversation = conversations.find(c => c.id === conversationId);
    document.getElementById('currentConversationName').textContent = 
        currentConversation.participants.filter(p => p !== currentUser.username).join(', ');
    
    try {
        const response = await fetch(`/api/conversations/${conversationId}/messages`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const messages = await response.json();
        displayPrivateMessages(messages);
    } catch (error) {
        console.error('Erreur chargement messages:', error);
    }
}

// Affichage des messages privés
function displayPrivateMessages(messages) {
    const messagesContainer = document.getElementById('privateMessages');
    messagesContainer.innerHTML = messages.map(msg => `
        <div class="message ${msg.user_id === currentUser.id ? 'sent' : 'received'}">
            <div class="message-content">
                <span class="username">${msg.username}</span>
                <p>${msg.content}</p>
                <span class="timestamp">${new Date(msg.created_at).toLocaleTimeString()}</span>
            </div>
        </div>
    `).join('');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Démarrer une nouvelle conversation
async function startPrivateChat(friendId) {
    try {
        const response = await fetch('/api/conversations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ participantIds: [friendId] })
        });
        
        if (response.ok) {
            const newConv = await response.json();
            // Changer de vue
            document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
            document.getElementById('privateView').classList.remove('hidden');
            // Recharger les conversations
            await loadConversations();
            // Ouvrir la nouvelle conversation
            openConversation(newConv.id);
        }
    } catch (error) {
        console.error('Erreur création conversation:', error);
    }
}

// Envoi d'un message privé
document.getElementById('privateMessageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentConversation) return;

    const input = document.getElementById('privateMessageInput');
    const content = input.value.trim();
    if (!content) return;

    try {
        const response = await fetch(`/api/conversations/${currentConversation.id}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ content })
        });

        if (response.ok) {
            input.value = '';
            const message = await response.json();
            // Ajouter le message à la conversation
            const messagesContainer = document.getElementById('privateMessages');
            const messageElement = document.createElement('div');
            messageElement.className = 'message sent';
            messageElement.innerHTML = `
                <div class="message-content">
                    <span class="username">${currentUser.username}</span>
                    <p>${message.content}</p>
                    <span class="timestamp">${new Date(message.created_at).toLocaleTimeString()}</span>
                </div>
            `;
            messagesContainer.appendChild(messageElement);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    } catch (error) {
        console.error('Erreur envoi message:', error);
    }
});

// Socket.IO pour les messages en temps réel
socket.on('private message', (message) => {
    if (currentConversation && message.conversation_id === currentConversation.id) {
        const messagesContainer = document.getElementById('privateMessages');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.user_id === currentUser.id ? 'sent' : 'received'}`;
        messageElement.innerHTML = `
            <div class="message-content">
                <span class="username">${message.username}</span>
                <p>${message.content}</p>
                <span class="timestamp">${new Date(message.created_at).toLocaleTimeString()}</span>
            </div>
        `;
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
});

// Chargement initial
document.addEventListener('DOMContentLoaded', () => {
    loadConversations();
}); 