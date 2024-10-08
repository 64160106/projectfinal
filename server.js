const path = require('path');
const { check, validationResult } = require('express-validator');
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const mysql = require('mysql');
const session = require('express-session');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting middleware
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // limit each IP to 5 requests per windowMs
});

// Set up EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files and use body-parser
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Session configuration
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // set to true if using https
}));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
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

// Route for the index page (main page)
app.get('/', (req, res) => {
    const query = `
        SELECT posts.*, users.username 
        FROM posts 
        JOIN users ON posts.user_id = users.id 
        WHERE posts.status = 'searching' 
        ORDER BY posts.id DESC
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send('Database query error');
        }
        res.render('index', {
            posts: results,
            username: req.session.username,
            userId: req.session.userId
        });
    });
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/register', [
    check('username').notEmpty().withMessage('Username is required'),
    check('password').notEmpty().withMessage('Password is required'),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('register', { error: errors.array()[0].msg });
    }

    const { username, password } = req.body;

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err);
            return res.render('register', { error: 'Error hashing password' });
        }
        const query = 'INSERT INTO users (username, password) VALUES (?)';

        db.query('SELECT * FROM users WHERE username = ?', [username], (err, result) => {
            if (err) {
                console.error('Database query error:', err);
                return res.render('register', { error: 'Database query error' });
            }
            if (result.length > 0) {
                return res.render('register', { error: 'Username already exists' });
            } else {
                db.query(query, [[username, hash]], err => {
                    if (err) {
                        console.error('Database insert error:', err);
                        return res.render('register', { error: 'Database insert error' });
                    }
                    res.redirect('/login');
                });
            }
        });
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error(err);
            return res.render('login', { error: 'An error occurred. Please try again.' });
        }

        if (results.length === 0) {
            return res.render('login', { error: 'Invalid username or password' });
        }

        const user = results[0];

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error(err);
                return res.render('login', { error: 'An error occurred. Please try again.' });
            }

            if (!isMatch) {
                return res.render('login', { error: 'Invalid username or password' });
            }

            req.session.userId = user.id;
            req.session.username = user.username;
            res.redirect('/');
        });
    });
});

app.get('/create-post', isAuthenticated, (req, res) => {
    res.render('create-post', { username: req.session.username });
});

app.post('/create-post', isAuthenticated, upload.single('image'), [
    check('item_description').notEmpty().withMessage('Item description is required'),
    check('location').notEmpty().withMessage('Location is required'),
    check('found_time').notEmpty().withMessage('Found time is required'),
    check('post_type').notEmpty().withMessage('Post type is required'),
    check('contact_info').notEmpty().withMessage('Contact information is required'),
], (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('Unauthorized. Please login again.');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).send(errors.array());
    }

    const { item_description, location, found_time, post_type, contact_info } = req.body;
    const image = req.file ? req.file.filename : null;

    if (!image) {
        return res.status(400).send('Error: No file uploaded or file type not supported.');
    }

    const query = 'INSERT INTO posts (user_id, item_description, location, image, found_time, status, post_type, contact_info) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(query, [req.session.userId, item_description, location, image, found_time, 'searching', post_type, contact_info], (err) => {
        if (err) {
            console.error('Database insert error:', err);
            return res.status(500).send('Database insert error: ' + err.message);
        }
        res.redirect('/');
    });
});

app.post('/update-status/:id', isAuthenticated, async (req, res) => {
    const postId = req.params.id;
    const newStatus = req.body.newStatus;

    if (!['searching', 'found', 'unclaimed'].includes(newStatus)) {
        return res.status(400).send('Invalid status');
    }

    try {
        const post = await getPost(postId);

        if (post.user_id !== req.session.userId) {
            return res.status(403).send('Not authorized to update this post');
        }

        const query = 'UPDATE posts SET status = ? WHERE id = ?';
        db.query(query, [newStatus, postId], (err, result) => {
            if (err) {
                console.error('Database update error:', err);
                return res.status(500).send('Database update error');
            }
            if (result.affectedRows === 0) {
                return res.status(404).send('Post not found');
            }
            res.redirect('/');
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server error');
    }
});

app.post('/delete-post/:id', isAuthenticated, (req, res) => {
    const postId = req.params.id;
    const userId = req.session.userId;

    const query = 'SELECT * FROM posts WHERE id = ? AND user_id = ?';
    db.query(query, [postId, userId], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (results.length === 0) {
            return res.status(403).json({ message: 'Not authorized to delete this post' });
        }

        const deleteQuery = 'DELETE FROM posts WHERE id = ?';
        db.query(deleteQuery, [postId], (deleteErr, deleteResult) => {
            if (deleteErr) {
                console.error('Error deleting post:', deleteErr);
                return res.status(500).json({ message: 'Error deleting post' });
            }

            res.redirect('/');
        });
    });
});

async function getPost(postId) {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM posts WHERE id = ?';
        db.query(query, [postId], (err, results) => {
            if (err) reject(err);
            resolve(results[0]);
        });
    });
}

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Error logging out');
        }
        res.redirect('/');
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});