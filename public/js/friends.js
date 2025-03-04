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