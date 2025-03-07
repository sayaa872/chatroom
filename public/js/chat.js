document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    const views = {
        chat: document.getElementById('chatView'),
        friends: document.getElementById('friendsView'),
        private: document.getElementById('privateView')
    };

    document.querySelectorAll('.nav-item').forEach(button => {
        button.addEventListener('click', () => {
            // Cacher toutes les vues
            Object.values(views).forEach(view => view.classList.add('hidden'));
            
            // Afficher la vue sélectionnée
            const viewName = button.dataset.view;
            views[viewName].classList.remove('hidden');
        });
    });

    // Chargement du profil
    const loadProfile = async () => {
        try {
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            
            if (data.user) {
                document.getElementById('userName').textContent = data.user.username;
            }
        } catch (error) {
            console.error('Erreur chargement profil:', error);
        }
    };

    loadProfile();

    // Envoi de message
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');

    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!messageInput.value.trim()) return;

        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ content: messageInput.value })
            });

            if (response.ok) {
                messageInput.value = '';
            } else {
                console.error('Erreur envoi message');
            }
        } catch (error) {
            console.error('Erreur:', error);
        }
    });
}); 