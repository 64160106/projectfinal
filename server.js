// เพิ่มการนำเข้าโมดูลที่จำเป็น
const express = require('express');
const path = require('path');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const { check, validationResult } = require('express-validator');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting middleware
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit to 5 login attempts per windowMs
    message: 'Too many login attempts. Please try again later.',
});

// Set up EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files and use body-parser
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key', // Use environment variable for security
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 1000 * 60 * 60 // 1 hour
    }
}));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // Specify the upload folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Use timestamp as the filename
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp|bmp/; // Supported file types
        const mimetype = filetypes.test(file.mimetype); // Check MIME type
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase()); // Check file extension
        if (mimetype && extname) {
            return cb(null, true); // Accept file
        }
        cb(new Error('Error: File type not supported!')); // Reject file
    }
});

// Create MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'lost_found_system',
});

// Connect to the database
db.connect(err => {
    if (err) {
        console.error('Database connection error:', err);
        return;
    }
    console.log('Connected to MySQL database!');
});

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Route for the index page
app.get('/', (req, res) => {
    const query = 'SELECT posts.*, users.username FROM posts JOIN users ON posts.user_id = users.id ORDER BY posts.id DESC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send('Database query error');
        }
        res.render('index', {
            posts: results,
            username: req.session.username,
        });
    });
});

// Route for showing the registration form
app.get('/register', (req, res) => {
    res.render('register');
});

// Route for showing the login form
app.get('/login', (req, res) => {
    res.render('login');
});

// Route for registration
app.post('/register', [
    check('username').notEmpty().withMessage('Username is required'),
    check('password').notEmpty().withMessage('Password is required'),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).send(errors.array());
    }

    const { username, password } = req.body;

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err);
            return res.status(500).send('Error hashing password');
        }
        const query = 'INSERT INTO users (username, password) VALUES (?, ?)';

        db.query('SELECT * FROM users WHERE username = ?', [username], (err, result) => {
            if (err) {
                console.error('Database query error:', err);
                return res.status(500).send('Database query error');
            }
            if (result.length > 0) {
                return res.status(400).send('Username already exists');
            } else {
                db.query(query, [username, hash], err => {
                    if (err) {
                        console.error('Database insert error:', err);
                        return res.status(500).send('Database insert error');
                    }
                    res.redirect('/login');
                });
            }
        });
    });
});

// Route for login
app.post('/login', loginLimiter, (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Please provide both username and password');
    }

    db.query('SELECT * FROM users WHERE username = ?', [username], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send('Database query error');
        }
        if (result.length === 0) {
            return res.status(400).send('User not found');
        }

        const user = result[0];

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Error comparing password:', err);
                return res.status(500).send('Error comparing password');
            }
            if (!isMatch) {
                return res.status(400).send('Invalid password');
            }

            req.session.userId = user.id;
            req.session.username = user.username;
            res.redirect('/');
        });
    });
});

// Route for creating a post
app.get('/create-post', isAuthenticated, (req, res) => {
    res.render('create-post', { username: req.session.username });
});

// Route for handling post creation
app.post('/create-post', upload.single('image'), [
    check('item_description').notEmpty().withMessage('Item description is required'),
    check('location').notEmpty().withMessage('Location is required'),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).send(errors.array());
    }

    const { item_description, location } = req.body;
    const image = req.file ? req.file.filename : null;

    // Check if the image is uploaded
    if (!image) {
        return res.status(400).send('Error: No file uploaded or file type not supported.');
    }

    const query = 'INSERT INTO posts (user_id, item_description, location, image) VALUES (?, ?, ?, ?)';
    db.query(query, [req.session.userId, item_description, location, image], (err) => {
        if (err) {
            console.error('Database insert error:', err);
            return res.status(500).send('Database insert error: ' + err.message);
        }
        res.redirect('/');
    });
});

// Route for logging out
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.redirect('/');
        }
        res.redirect('/');
    });
});

// Error handling middleware for file upload errors
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Handle Multer errors
        console.error('Multer error:', err);
        return res.status(400).send('Multer error: ' + err.message);
    } else if (err) {
        // Handle general errors
        console.error('Error:', err);
        return res.status(500).send('Error: ' + err.message);
    }
    next();
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
