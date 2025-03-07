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

    // Fonction pour charger les informations de l'utilisateur
    async function loadUserInfo() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/login.html';
                return;
            }

            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur d\'authentification');
            }

            const data = await response.json();
            
            // Mettre à jour le nom d'utilisateur et l'initiale
            document.getElementById('username').textContent = data.username;
            document.getElementById('userInitial').textContent = data.username.charAt(0).toUpperCase();
            
        } catch (error) {
            console.error('Erreur:', error);
            window.location.href = '/login.html';
        }
    }

    // Fonction de déconnexion
    function logout() {
        localStorage.removeItem('token'); // Supprimer le token
        window.location.href = '/login.html'; // Rediriger vers la page de connexion
    }

    // Appeler loadUserInfo au chargement de la page
    loadUserInfo();

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