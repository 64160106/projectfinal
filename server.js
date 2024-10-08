const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');

const app = express();

// กำหนดค่า MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'lost_found_system'
});

// เชื่อมต่อกับ MySQL
db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to MySQL database');
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Routes
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
            userId: req.session.userId,
            isAdmin: req.session.isAdmin
        });
    });
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', [
    check('username').notEmpty().withMessage('Username is required'),
    check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('register', { errors: errors.array() });
    }
  
    const { username, password } = req.body;
    
    // ตรวจสอบว่ามีชื่อผู้ใช้นี้อยู่แล้วหรือไม่
    const checkUserQuery = 'SELECT * FROM users WHERE username = ?';
    db.query(checkUserQuery, [username], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.render('register', { error: 'An error occurred. Please try again.' });
      }
      
      if (results.length > 0) {
        return res.render('register', { error: 'Username already exists. Please choose a different username.' });
      }
      
      // ถ้าไม่มีชื่อผู้ใช้นี้ ให้ทำการสมัครสมาชิก
      const insertUserQuery = 'INSERT INTO users (username, password) VALUES (?, ?)';
      db.query(insertUserQuery, [username, password], (err, result) => {
        if (err) {
          console.error('Database error:', err);
          return res.render('register', { error: 'An error occurred. Please try again.' });
        }
        res.redirect('/login');
      });
    });
  });

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT * FROM users WHERE username = ?';
    
    db.query(query, [username], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.render('login', { error: 'An error occurred. Please try again.' });
      }
      
      if (results.length === 0) {
        return res.render('login', { error: 'Invalid username or password.' });
      }
      
      const user = results[0];
      if (password !== user.password) {
        return res.render('login', { error: 'Invalid username or password.' });
      }
      
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.isAdmin = user.is_admin === 1;
      res.redirect('/');
    });
  });

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/');
    });
});

app.get('/create-post', isAuthenticated, (req, res) => {
    res.render('create-post');
});

app.post('/create-post', isAuthenticated, upload.single('image'), (req, res) => {
    const { item_description, location, found_time } = req.body;
    const user_id = req.session.userId;
    const image = req.file ? req.file.filename : null;

    const post = {
        item_description,
        location,
        found_time,
        user_id,
        image,
        contact_info,
        status: 'searching'
    };

    db.query('INSERT INTO posts SET ?', post, (err, result) => {
        if (err) {
            console.error('Database insert error:', err);
            return res.status(500).send('Error creating post');
        }
        res.redirect('/');
    });
});

// Update post status route
app.post('/update-status/:id', isAuthenticated, (req, res) => {
    const postId = req.params.id;
    const { newStatus } = req.body;

    if (!['searching', 'found', 'closed'].includes(newStatus)) {
        return res.status(400).send('Invalid status');
    }

    const query = 'UPDATE posts SET status = ? WHERE id = ?';
    db.query(query, [newStatus, postId], (err, result) => {
        if (err) {
            console.error('Database update error:', err);
            return res.status(500).send('Error updating post status');
        }
        if (result.affectedRows === 0) {
            return res.status(404).send('Post not found');
        }
        res.redirect('back'); // เปลี่ยนจาก '/admin-dashboard' เป็น 'back'
    });
});

// Delete post route
app.post('/delete-post/:id', isAuthenticated, (req, res) => {
    const postId = req.params.id;

    const query = 'DELETE FROM posts WHERE id = ?';
    db.query(query, [postId], (err, result) => {
        if (err) {
            console.error('Database delete error:', err);
            return res.status(500).send('Error deleting post');
        }
        if (result.affectedRows === 0) {
            return res.status(404).send('Post not found');
        }
        res.redirect('back'); // เปลี่ยนจาก '/admin-dashboard' เป็น 'back'
    });
});

// View post details route
app.get('/view-details/:id', (req, res) => {
    const postId = req.params.id;

    const query = `
        SELECT posts.*, users.username 
        FROM posts 
        JOIN users ON posts.user_id = users.id 
        WHERE posts.id = ?
    `;
    db.query(query, [postId], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send('Error fetching post details');
        }
        if (results.length === 0) {
            return res.status(404).send('Post not found');
        }
        res.render('post-details', { post: results[0] });
    });
});

// Admin dashboard route
app.get('/admin-dashboard', isAuthenticated, (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).send('Access denied');
    }

    const query = `
        SELECT posts.*, users.username 
        FROM posts 
        JOIN users ON posts.user_id = users.id 
        ORDER BY posts.id DESC
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send('Error fetching posts');
        }
        res.render('admin-dashboard', { 
            posts: results,
            username: req.session.username,
            isAdmin: req.session.isAdmin
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});