// DOM Elements
const authContainer = document.getElementById('auth-container');
const electionsContainer = document.getElementById('elections-container');
const votingContainer = document.getElementById('voting-container');
const adminPanel = document.getElementById('admin-panel');
const electionsList = document.getElementById('elections-list');
const contestantsList = document.getElementById('contestants-list');
const electionTitle = document.getElementById('election-title');
const userInfo = document.getElementById('user-info');
const createElectionForm = document.getElementById('create-election-form');
const resultsView = document.getElementById('results-view');
const resultsList = document.getElementById('results-list');

// State
let currentUser = null;
let currentElection = null;
let selectedContestant = null;
let isAdmin = false;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.form-container').forEach(f => f.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`${btn.dataset.tab}-form`).classList.add('active');
        });
    });

    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Register form
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // Voting actions
    document.getElementById('submit-vote').addEventListener('click', handleVoteSubmit);
    document.getElementById('cancel-vote').addEventListener('click', () => {
        votingContainer.classList.add('hidden');
        electionsContainer.classList.remove('hidden');
    });

    // Admin actions
    document.getElementById('create-election-btn').addEventListener('click', () => {
        createElectionForm.classList.remove('hidden');
        resultsView.classList.add('hidden');
    });

    document.getElementById('view-results-btn').addEventListener('click', () => {
        createElectionForm.classList.add('hidden');
        resultsView.classList.remove('hidden');
        loadResults();
    });

    document.getElementById('add-contestant').addEventListener('click', addContestantField);
    document.getElementById('electionForm').addEventListener('submit', handleCreateElection);
});

// API Functions
async function registerUser(userData) {
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        return await response.json();
    } catch (error) {
        throw error;
    }
}

async function loginUser(credentials) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        return await response.json();
    } catch (error) {
        throw error;
    }
}

async function getElections() {
    try {
        const response = await fetch('/api/elections', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch elections');
        }
        
        return await response.json();
    } catch (error) {
        throw error;
    }
}

async function getAdminElections() {
    try {
        const response = await fetch('/api/admin/elections', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch election results');
        }
        
        return await response.json();
    } catch (error) {
        throw error;
    }
}

async function createElection(electionData) {
    try {
        const response = await fetch('/api/elections', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(electionData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        return await response.json();
    } catch (error) {
        throw error;
    }
}

async function updateElectionStatus(electionId, isActive) {
    try {
        const response = await fetch(`/api/elections/${electionId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ isActive })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        return await response.json();
    } catch (error) {
        throw error;
    }
}

async function submitVote(voteData) {
    try {
        const response = await fetch('/api/vote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(voteData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        return await response.json();
    } catch (error) {
        throw error;
    }
}

// Event Handlers
async function handleLogin(e) {
    e.preventDefault();
    const studentId = document.getElementById('login-studentId').value;
    const password = document.getElementById('login-password').value;

    try {
        const { token, name, isAdmin: adminStatus } = await loginUser({ studentId, password });
        localStorage.setItem('token', token);
        currentUser = { studentId, name };
        isAdmin = adminStatus;
        
        if (isAdmin) {
            showAdminPanel();
        } else {
            showElections();
        }
    } catch (error) {
        alert(error.message);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const userData = {
        studentId: document.getElementById('register-studentId').value,
        name: document.getElementById('register-name').value,
        email: document.getElementById('register-email').value,
        password: document.getElementById('register-password').value
    };

    try {
        await registerUser(userData);
        alert('Registration successful! Please login.');
        document.querySelector('.tab-btn[data-tab="login"]').click();
    } catch (error) {
        alert(error.message);
    }
}

function addContestantField() {
    const container = document.getElementById('contestants-container');
    const entry = document.createElement('div');
    entry.className = 'contestant-entry';
    entry.innerHTML = `
        <div class="form-group">
            <label>Name</label>
            <input type="text" class="contestant-name" required>
        </div>
        <div class="form-group">
            <label>Photo</label>
            <input type="file" class="contestant-photo" accept="image/*" required>
            <div class="image-preview"></div>
        </div>
    `;
    
    // Add image preview functionality
    const photoInput = entry.querySelector('.contestant-photo');
    const previewDiv = entry.querySelector('.image-preview');
    
    photoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewDiv.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 100px; max-height: 100px;">`;
            };
            reader.readAsDataURL(file);
        }
    });
    
    container.appendChild(entry);
}

async function handleCreateElection(e) {
    e.preventDefault();
    const title = document.getElementById('election-title').value;
    const description = document.getElementById('election-description').value;
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    
    const contestants = Array.from(document.querySelectorAll('.contestant-entry')).map(entry => {
        return {
            name: entry.querySelector('.contestant-name').value
        };
    });
    
    formData.append('contestants', JSON.stringify(contestants));
    
    // Add photo files to formData
    const photoInputs = document.querySelectorAll('.contestant-photo');
    photoInputs.forEach(input => {
        if (input.files[0]) {
            formData.append('photos', input.files[0]);
        }
    });

    try {
        const response = await fetch('/api/elections', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        alert('Election created successfully!');
        createElectionForm.classList.add('hidden');
        loadResults();
    } catch (error) {
        alert(error.message);
    }
}

async function loadResults() {
    try {
        const elections = await getAdminElections();
        resultsList.innerHTML = '';
        
        elections.forEach(election => {
            const card = document.createElement('div');
            card.className = 'results-card';
            
            const voteCounts = Object.entries(election.voteCounts || {})
                .map(([id, count]) => {
                    const contestant = election.contestants.find(c => c.id === id);
                    return `<div class="vote-count">
                        <span>${contestant?.name || 'Unknown'}</span>
                        <span>${count} votes</span>
                    </div>`;
                })
                .join('');
            
            card.innerHTML = `
                <h4>${election.title}</h4>
                <p>${election.description}</p>
                <p>Total Votes: ${election.totalVotes || 0}</p>
                ${voteCounts}
                <div class="election-status">
                    <span>Status: ${election.isActive ? 'Active' : 'Closed'}</span>
                    <div class="status-toggle">
                        <label class="switch">
                            <input type="checkbox" ${election.isActive ? 'checked' : ''} 
                                onchange="handleStatusChange('${election.id}', this.checked)">
                            <span class="slider"></span>
                        </label>
                        <span>${election.isActive ? 'Active' : 'Closed'}</span>
                    </div>
                </div>
            `;
            
            resultsList.appendChild(card);
        });
    } catch (error) {
        alert(error.message);
    }
}

async function handleStatusChange(electionId, isActive) {
    try {
        await updateElectionStatus(electionId, isActive);
        loadResults();
    } catch (error) {
        alert(error.message);
    }
}

function showAdminPanel() {
    authContainer.classList.add('hidden');
    electionsContainer.classList.add('hidden');
    votingContainer.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    updateUserInfo();
    loadResults();
}

async function showElections() {
    try {
        const elections = await getElections();
        renderElections(elections);
        
        authContainer.classList.add('hidden');
        electionsContainer.classList.remove('hidden');
        adminPanel.classList.add('hidden');
        updateUserInfo();
    } catch (error) {
        alert(error.message);
    }
}

function renderElections(elections) {
    electionsList.innerHTML = '';
    
    elections.forEach(election => {
        const card = document.createElement('div');
        card.className = 'election-card';
        card.innerHTML = `
            <h3>${election.title}</h3>
            <p>${election.description}</p>
            <p>Status: ${election.isActive ? 'Active' : 'Closed'}</p>
        `;
        
        card.addEventListener('click', () => {
            if (election.isActive) {
                showVotingForm(election);
            } else {
                alert('This election is closed.');
            }
        });
        
        electionsList.appendChild(card);
    });
}

function showVotingForm(election) {
    currentElection = election;
    electionTitle.textContent = election.title;
    contestantsList.innerHTML = '';
    
    election.contestants.forEach(contestant => {
        const card = document.createElement('div');
        card.className = 'contestant-card';
        card.innerHTML = `
            <img src="${contestant.photo || 'default-photo.jpg'}" alt="${contestant.name}" class="contestant-photo">
            <span class="contestant-name">${contestant.name}</span>
            <input type="radio" name="contestant" value="${contestant.id}">
        `;
        
        card.querySelector('input').addEventListener('change', (e) => {
            selectedContestant = e.target.value;
        });
        
        contestantsList.appendChild(card);
    });
    
    electionsContainer.classList.add('hidden');
    votingContainer.classList.remove('hidden');
}

async function handleVoteSubmit() {
    if (!selectedContestant) {
        alert('Please select a contestant');
        return;
    }

    try {
        await submitVote({
            electionId: currentElection.id,
            contestantId: selectedContestant
        });
        
        alert('Vote submitted successfully!');
        votingContainer.classList.add('hidden');
        electionsContainer.classList.remove('hidden');
        showElections();
    } catch (error) {
        alert(error.message);
    }
}

function updateUserInfo() {
    userInfo.innerHTML = `
        <span>Welcome, ${currentUser.name}${isAdmin ? ' (Admin)' : ''}</span>
        <button id="logout-btn" onclick="handleLogout()">Logout</button>
    `;
}

function handleLogout() {
    localStorage.removeItem('token');
    currentUser = null;
    isAdmin = false;
    authContainer.classList.remove('hidden');
    electionsContainer.classList.add('hidden');
    votingContainer.classList.add('hidden');
    adminPanel.classList.add('hidden');
    userInfo.innerHTML = '';
} 