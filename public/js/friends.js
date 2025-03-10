let currentFriends = [];
let pendingRequests = [];

// Gestion du modal
function openAddFriendModal() {
    document.getElementById('addFriendModal').classList.add('active');
}

function closeAddFriendModal() {
    document.getElementById('addFriendModal').classList.remove('active');
}

// Chargement des amis et demandes
async function loadFriends() {
    try {
        const response = await fetch('/api/friends', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const friends = await response.json();
        currentFriends = friends;
        displayFriends(friends);
    } catch (error) {
        console.error('Erreur chargement amis:', error);
    }
}

async function loadPendingRequests() {
    try {
        const response = await fetch('/api/friends/pending', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const requests = await response.json();
        pendingRequests = requests;
        displayPendingRequests(requests);
        updateRequestCount(requests.length);
    } catch (error) {
        console.error('Erreur chargement demandes:', error);
    }
}

// Affichage des amis
function displayFriends(friends) {
    const friendsList = document.getElementById('friendsList');
    friendsList.innerHTML = friends.map(friend => `
        <div class="friend-card">
            <div class="friend-avatar">
                <img src="https://ui-avatars.com/api/?name=${friend.username}" alt="${friend.username}">
            </div>
            <h4>${friend.username}</h4>
            <div class="friend-actions">
                <button onclick="startPrivateChat('${friend.id}')">
                    <i class="fas fa-comment"></i>
                    Message
                </button>
            </div>
        </div>
    `).join('');
}

// Affichage des demandes en attente
function displayPendingRequests(requests) {
    const requestsContainer = document.getElementById('friendRequests');
    requestsContainer.innerHTML = requests.map(request => `
        <div class="friend-request">
            <div class="request-info">
                <img src="https://ui-avatars.com/api/?name=${request.username}" alt="${request.username}">
                <span>${request.username}</span>
            </div>
            <div class="request-actions">
                <button onclick="handleRequest('${request.id}', 'accepted')" class="accept-btn">
                    <i class="fas fa-check"></i>
                </button>
                <button onclick="handleRequest('${request.id}', 'rejected')" class="reject-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Gestion des demandes d'ami
async function handleRequest(requestId, status) {
    try {
        const response = await fetch(`/api/friends/request/${requestId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status })
        });

        if (response.ok) {
            loadFriends();
            loadPendingRequests();
        }
    } catch (error) {
        console.error('Erreur gestion demande:', error);
    }
}

// Envoi d'une demande d'ami
document.getElementById('addFriendForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('friendUsername').value;

    try {
        const response = await fetch('/api/friends/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ friendUsername: username })
        });

        const data = await response.json();
        if (response.ok) {
            alert('Demande d\'ami envoyée !');
            closeAddFriendModal();
        } else {
            alert(data.error || 'Erreur lors de l\'envoi de la demande');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'envoi de la demande');
    }
});

// Mise à jour du compteur de demandes
function updateRequestCount(count) {
    const badge = document.getElementById('friendRequestCount');
    badge.textContent = count;
    badge.style.display = count > 0 ? 'block' : 'none';
}

// Chargement initial
document.addEventListener('DOMContentLoaded', () => {
    loadFriends();
    loadPendingRequests();
});

// Fonction pour charger et afficher les demandes d'amis
async function loadFriendRequests() {
    try {
        const response = await fetch('/api/friends/pending', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        const requests = await response.json();
        displayFriendRequests(requests);
        updateFriendRequestsBadge(requests.length);
    } catch (error) {
        console.error('Erreur de chargement des demandes d\'amis:', error);
    }
}

// Fonction pour mettre à jour le badge
function updateFriendRequestsBadge(count) {
    const badge = document.getElementById('friendRequestsBadge');
    const requestCount = document.getElementById('requestCount');
    
    if (count > 0) {
        badge.style.display = 'flex';
        badge.textContent = count;
        requestCount.textContent = `(${count})`;
    } else {
        badge.style.display = 'none';
        requestCount.textContent = '';
    }
}

// Fonction pour afficher les demandes d'amis
function displayFriendRequests(requests) {
    const requestsContainer = document.getElementById('friendRequests');
    
    if (!requests || requests.length === 0) {
        requestsContainer.innerHTML = `
            <div class="empty-requests">
                <p>Aucune demande d'ami en attente</p>
            </div>
        `;
        return;
    }
    
    requestsContainer.innerHTML = requests.map(request => `
        <div class="friend-request-item">
            <div class="request-user-info">
                <div class="request-user-avatar">
                    ${request.username.charAt(0).toUpperCase()}
                </div>
                <div class="request-user-name">
                    ${request.username}
                </div>
            </div>
            <div class="request-actions">
                <button class="accept-button" onclick="handleFriendRequest(${request.id}, 'accepted')">
                    <i class="fas fa-check"></i>
                    Accepter
                </button>
                <button class="reject-button" onclick="handleFriendRequest(${request.id}, 'rejected')">
                    <i class="fas fa-times"></i>
                    Refuser
                </button>
            </div>
        </div>
    `).join('');
}

// Fonction pour gérer les demandes d'amis
async function handleFriendRequest(requestId, status) {
    try {
        const response = await fetch(`/api/friends/request/${requestId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            // Rafraîchir les demandes et la liste d'amis
            await loadFriendRequests();
            await loadFriends();
            
            // Notification
            const message = status === 'accepted' ? 'Demande acceptée !' : 'Demande refusée';
            showNotification(message, status === 'accepted' ? 'success' : 'info');
        }
    } catch (error) {
        console.error('Erreur lors du traitement de la demande:', error);
        showNotification('Erreur lors du traitement de la demande', 'error');
    }
}

// Fonction pour afficher une notification
function showNotification(message, type = 'info') {
    // Si vous avez une bibliothèque de notifications, utilisez-la ici
    alert(message);
}

// Démarrer le polling des demandes d'amis
function startFriendRequestsPolling() {
    loadFriendRequests();
    // Rafraîchir toutes les 30 secondes
    setInterval(loadFriendRequests, 30000);
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    startFriendRequestsPolling();
}); 