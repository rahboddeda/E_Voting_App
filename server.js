const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Data storage paths
const DATA_DIR = path.join(__dirname, 'data');
const IMAGES_DIR = path.join(__dirname, 'public', 'images');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ELECTIONS_FILE = path.join(DATA_DIR, 'elections.json');
const VOTES_FILE = path.join(DATA_DIR, 'votes.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, IMAGES_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Helper function to read JSON files
const readJsonFile = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            return { users: [], elections: [], votes: [] }[path.basename(filePath).split('.')[0]];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return { users: [], elections: [], votes: [] }[path.basename(filePath).split('.')[0]];
    }
};

// Helper function to write JSON files
const writeJsonFile = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error writing to ${filePath}:`, error);
        throw error;
    }
};

// Initialize JSON files if they don't exist
const initializeFile = (filePath, defaultValue) => {
    if (!fs.existsSync(filePath)) {
        writeJsonFile(filePath, defaultValue);
    }
};

initializeFile(USERS_FILE, { users: [] });
initializeFile(ELECTIONS_FILE, { elections: [] });
initializeFile(VOTES_FILE, { votes: [] });

// Authentication middleware
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) return res.sendStatus(401);

        jwt.verify(token, 'your-secret-key', (err, user) => {
            if (err) return res.sendStatus(403);
            req.user = user;
            next();
        });
    } catch (error) {
        console.error('Authentication error:', error);
        res.sendStatus(500);
    }
};

// Admin middleware
const isAdmin = (req, res, next) => {
    try {
        if (req.user && req.user.studentId === 'admin') {
            next();
        } else {
            return res.status(403).json({ message: 'Admin access required' });
        }
    } catch (error) {
        console.error('Admin check error:', error);
        res.sendStatus(500);
    }
};

// Routes
app.post('/api/register', async (req, res) => {
    try {
        const { studentId, password, name, email } = req.body;
        const users = readJsonFile(USERS_FILE);
        
        if (users.users.find(u => u.studentId === studentId)) {
            return res.status(400).json({ message: 'Student already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        users.users.push({
            studentId,
            password: hashedPassword,
            name,
            email
        });

        writeJsonFile(USERS_FILE, users);
        res.status(201).json({ message: 'Registration successful' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { studentId, password } = req.body;
        
        // Special case for admin login
        if (studentId === 'admin' && password === '123') {
            const token = jwt.sign({ 
                studentId: 'admin',
                isAdmin: true 
            }, 'your-secret-key');
            
            return res.json({ 
                token, 
                name: 'Admin',
                isAdmin: true 
            });
        }

        const users = readJsonFile(USERS_FILE);
        const user = users.users.find(u => u.studentId === studentId);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ 
            studentId: user.studentId,
            isAdmin: false 
        }, 'your-secret-key');
        
        res.json({ 
            token, 
            name: user.name,
            isAdmin: false 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Admin routes
app.post('/api/elections', authenticateToken, isAdmin, upload.array('photos', 10), (req, res) => {
    try {
        const { title, description, contestants } = req.body;
        const elections = readJsonFile(ELECTIONS_FILE);
        
        // Process uploaded files
        const uploadedFiles = req.files || [];
        const contestantData = JSON.parse(contestants).map((contestant, index) => {
            return {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: contestant.name,
                photo: uploadedFiles[index] ? `/images/${uploadedFiles[index].filename}` : null
            };
        });
        
        elections.elections.push({
            id: Date.now().toString(),
            title,
            description,
            contestants: contestantData,
            isActive: true,
            createdAt: new Date().toISOString()
        });

        writeJsonFile(ELECTIONS_FILE, elections);
        res.status(201).json({ message: 'Election created successfully' });
    } catch (error) {
        console.error('Create election error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.patch('/api/elections/:electionId', authenticateToken, isAdmin, (req, res) => {
    try {
        const { electionId } = req.params;
        const { isActive } = req.body;
        const elections = readJsonFile(ELECTIONS_FILE);
        
        const electionIndex = elections.elections.findIndex(e => e.id === electionId);
        if (electionIndex === -1) {
            return res.status(404).json({ message: 'Election not found' });
        }

        elections.elections[electionIndex].isActive = isActive;
        writeJsonFile(ELECTIONS_FILE, elections);
        res.json({ message: 'Election status updated successfully' });
    } catch (error) {
        console.error('Update election error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/api/elections', authenticateToken, (req, res) => {
    try {
        const elections = readJsonFile(ELECTIONS_FILE);
        res.json(elections.elections || []);
    } catch (error) {
        console.error('Get elections error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/api/admin/elections', authenticateToken, isAdmin, (req, res) => {
    try {
        const elections = readJsonFile(ELECTIONS_FILE);
        const votes = readJsonFile(VOTES_FILE);
        
        const electionsWithStats = (elections.elections || []).map(election => {
            const electionVotes = (votes.votes || []).filter(v => v.electionId === election.id);
            const voteCounts = electionVotes.reduce((acc, vote) => {
                acc[vote.contestantId] = (acc[vote.contestantId] || 0) + 1;
                return acc;
            }, {});
            
            return {
                ...election,
                totalVotes: electionVotes.length,
                voteCounts
            };
        });
        
        res.json(electionsWithStats);
    } catch (error) {
        console.error('Get admin elections error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/vote', authenticateToken, (req, res) => {
    try {
        const { electionId, contestantId } = req.body;
        const studentId = req.user.studentId;
        
        const votes = readJsonFile(VOTES_FILE);
        const elections = readJsonFile(ELECTIONS_FILE);
        
        // Check if election exists and is active
        const election = (elections.elections || []).find(e => e.id === electionId);
        if (!election || !election.isActive) {
            return res.status(400).json({ message: 'Invalid or inactive election' });
        }

        // Check if student has already voted
        if ((votes.votes || []).some(v => v.studentId === studentId && v.electionId === electionId)) {
            return res.status(400).json({ message: 'You have already voted in this election' });
        }

        votes.votes = votes.votes || [];
        votes.votes.push({
            studentId,
            electionId,
            contestantId,
            timestamp: new Date().toISOString()
        });

        writeJsonFile(VOTES_FILE, votes);
        res.json({ message: 'Vote recorded successfully' });
    } catch (error) {
        console.error('Vote error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/api/results/:electionId', authenticateToken, (req, res) => {
    try {
        const { electionId } = req.params;
        const votes = readJsonFile(VOTES_FILE);
        const elections = readJsonFile(ELECTIONS_FILE);
        
        const election = (elections.elections || []).find(e => e.id === electionId);
        if (!election) {
            return res.status(404).json({ message: 'Election not found' });
        }

        const voteCounts = {};
        (votes.votes || [])
            .filter(v => v.electionId === electionId)
            .forEach(v => {
                voteCounts[v.contestantId] = (voteCounts[v.contestantId] || 0) + 1;
            });

        res.json({
            election,
            results: voteCounts
        });
    } catch (error) {
        console.error('Get results error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 