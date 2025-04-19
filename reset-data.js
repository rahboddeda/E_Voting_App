const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ELECTIONS_FILE = path.join(DATA_DIR, 'elections.json');
const VOTES_FILE = path.join(DATA_DIR, 'votes.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Reset users.json
fs.writeFileSync(USERS_FILE, JSON.stringify({
    users: []
}, null, 2));

// Reset elections.json
fs.writeFileSync(ELECTIONS_FILE, JSON.stringify({
    elections: []
}, null, 2));

// Reset votes.json
fs.writeFileSync(VOTES_FILE, JSON.stringify({
    votes: []
}, null, 2));

console.log('All data files have been reset to their initial state.'); 