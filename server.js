const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const port = 3000;

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(express.static('public')); // Serve static files from 'public' directory
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Utility function to read metadata
function readMetadata() {
    const metadataPath = path.join(__dirname, 'metadata.json');
    try {
        if (fs.existsSync(metadataPath)) {
            const data = fs.readFileSync(metadataPath, 'utf8');
            return data ? JSON.parse(data) : {}; // Return empty object if file is empty
        }
    } catch (err) {
        console.error('Error reading metadata:', err);
    }
    return {}; // Return empty object if file does not exist or is invalid
}

// Utility function to save metadata
function saveMetadata(metadata) {
    const metadataPath = path.join(__dirname, 'metadata.json');
    try {
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    } catch (err) {
        console.error('Error saving metadata:', err);
    }
}

// Serve the home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the upload page
app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

// Serve the delete page
app.get('/delete', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'delete.html'));
});

// Handle video upload
app.post('/upload', upload.single('video'), (req, res) => {
    const title = req.body.title.substring(0, 20); // Limit title to 20 characters
    const description = req.body.description.substring(0, 100); // Limit description to 100 characters
    const videoFile = req.file;
    
    if (!videoFile) {
        return res.status(400).send('No video file uploaded.');
    }
    
    if (videoFile.size > 200 * 1024 * 1024) { // 200 MB limit
        fs.unlinkSync(videoFile.path); // Delete the uploaded file if it exceeds the limit
        return res.status(400).send('File size exceeds 200 MB limit.');
    }
    
    // Save metadata
    const metadata = readMetadata();
    metadata[videoFile.filename] = { title, description };
    saveMetadata(metadata);
    
    res.redirect('/');
});

// Handle video deletion
app.post('/delete', (req, res) => {
    const { filename, password } = req.body;
    
    if (password !== '2012') {
        return res.status(403).send('Incorrect password.');
    }
    
    const videoPath = path.join(__dirname, 'uploads', filename);
    const metadataPath = path.join(__dirname, 'metadata.json');
    
    if (!fs.existsSync(videoPath)) {
        return res.status(404).send('Video not found.');
    }
    
    try {
        fs.unlinkSync(videoPath); // Delete video file
        const metadata = readMetadata();
        delete metadata[filename]; // Remove metadata entry
        saveMetadata(metadata);
        res.redirect('/');
    } catch (err) {
        console.error('Error deleting video:', err);
        res.status(500).send('Error deleting video.');
    }
});

// Serve videos
app.get('/videos/:filename', (req, res) => {
    const videoPath = path.join(__dirname, 'uploads', req.params.filename);
    if (fs.existsSync(videoPath)) {
        res.sendFile(videoPath);
    } else {
        res.status(404).send('Video not found.');
    }
});

// List videos
app.get('/videos', (req, res) => {
    fs.readdir('uploads', (err, files) => {
        if (err) return res.status(500).json({ error: 'Failed to list videos' });

        const metadata = readMetadata();
        const videoList = files.map(file => ({
            videoUrl: /videos/${file},
            title: metadata[file]?.title || 'Untitled',
            description: metadata[file]?.description || ''
        }));

        res.json(videoList);
    });
});

app.listen(port, () => {
    console.log(Server running at http://localhost:${port});
});
