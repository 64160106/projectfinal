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

function isAdmin(req, res, next) {
    if (req.session.isAdmin) {
        next();
    } else {
        res.status(403).send('Access denied. Admin only.');
    }
}

// Routes
app.get('/', (req, res) => {
    const isAdmin = req.session.isAdmin || false;

    const page = parseInt(req.query.page) || 1;
    const limit = 9; // จำนวนโพสต์ต่อหน้า
    const offset = (page - 1) * limit;
    
    const searchTerm = req.query.search || '';
    const searchType = req.query.type || '';
    const searchStatus = req.query.status || '';
    const searchDate = req.query.date || '';
    
    let query = `SELECT posts.*, users.username FROM posts
                 INNER JOIN users ON posts.user_id = users.id
                 WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM posts
                      INNER JOIN users ON posts.user_id = users.id
                      WHERE 1=1`;
    
    const queryParams = [];
    
    if (searchTerm) {
      query += ` AND (posts.item_description LIKE ? OR posts.location LIKE ?)`;
      countQuery += ` AND (posts.item_description LIKE ? OR posts.location LIKE ?)`;
      queryParams.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }
    
    if (searchType) {
      query += ` AND posts.post_type = ?`;
      countQuery += ` AND posts.post_type = ?`;
      queryParams.push(searchType);
    }
    
    if (searchStatus) {
      query += ` AND posts.status = ?`;
      countQuery += ` AND posts.status = ?`;
      queryParams.push(searchStatus);
    }
    
    if (searchDate) {
      query += ` AND DATE(posts.found_time) = ?`;
      countQuery += ` AND DATE(posts.found_time) = ?`;
      queryParams.push(searchDate);
    }
    
    query += ` ORDER BY posts.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);
    
    db.query(countQuery, queryParams.slice(0, -2), (err, countResult) => {
        if (err) throw err;
        
        const totalPosts = countResult[0].total;
        const totalPages = Math.ceil(totalPosts / limit);
        
        db.query(query, queryParams, (err, results) => {
          if (err) throw err;
          res.render('index', { 
            posts: results, 
            username: req.session.username,
            isAdmin: isAdmin,
            searchTerm,
            searchType,
            searchStatus,
            searchDate,
            currentPage: page,
            totalPages,
            searchParams: req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
          });
        });
      });
    });

app.get('/register', (req, res) => {
    res.render('register');
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
        return res.render('register', { 
            errors: errors.array(),
            username: req.body.username,
        });
    }

    const { username, password } = req.body;
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) throw err;
        const user = { username, password: hash };
        db.query('INSERT INTO users SET ?', user, (err, result) => {
            if (err) {
                // Handle database errors (e.g., duplicate username)
                return res.render('register', { 
                    error: 'Registration failed. Username may already exist.',
                    username: req.body.username,
                });
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
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            bcrypt.compare(password, results[0].password, (err, result) => {
                if (result) {
                    req.session.userId = results[0].id;
                    req.session.username = results[0].username;
                    req.session.isAdmin = results[0].is_admin === 1;
                    res.redirect('/');
                } else {
                    res.send('Incorrect username or password');
                }
            });
        } else {
            res.send('Incorrect username or password');
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect('/');
    });
});

app.get('/create-post', isAuthenticated, (req, res) => {
    res.render('create-post');
});

app.post('/create-post', isAuthenticated, upload.single('image'), [
    check('item_description').notEmpty().withMessage('Item description is required'),
    check('location').notEmpty().withMessage('Location is required'),
    check('found_time').notEmpty().withMessage('Found time is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { item_description, location, found_time, contact_info, post_type } = req.body;
    const image = req.file ? req.file.filename : null;
    const post = {
        item_description,
        location,
        found_time,
        contact_info,
        image,
        user_id: req.session.userId,
        post_type
    };

    db.query('INSERT INTO posts SET ?', post, (err, result) => {
        if (err) throw err;
        res.redirect('/');
    });
});

app.post('/update-status/:id', isAuthenticated, (req, res) => {
    const postId = req.params.id;
    const { status } = req.body;
    db.query('UPDATE posts SET status = ? WHERE id = ?', [status, postId], (err, result) => {
        if (err) throw err;
        res.redirect('/');
    });
});

app.get('/delete-post/:id', isAuthenticated, (req, res) => {
    const postId = req.params.id;
    db.query('DELETE FROM posts WHERE id = ?', [postId], (err, result) => {
        if (err) throw err;
        res.redirect('/');
    });
});

app.get('/admin-dashboard', isAdmin, (req, res) => {
    console.log("Accessing admin dashboard");
    db.query('SELECT * FROM users', (err, users) => {
        if (err) {
            console.error("Error fetching users:", err);
            return res.status(500).send("Internal Server Error");
        }
        console.log("Users fetched:", users.length);
        db.query('SELECT posts.*, users.username FROM posts INNER JOIN users ON posts.user_id = users.id', (err, posts) => {
            if (err) {
                console.error("Error fetching posts:", err);
                return res.status(500).send("Internal Server Error");
            }
            console.log("Posts fetched:", posts.length);
            res.render('admin-dashboard', { users, posts });
        });
    });
});

app.post('/admin-dashboard/delete-user/:id', isAdmin, (req, res) => {
    const userId = req.params.id;
    db.query('DELETE FROM users WHERE id = ?', [userId], (err, result) => {
        if (err) throw err;
        res.redirect('/admin-dashboard');
    });
});

app.post('/admin-dashboard/delete-post/:id', isAdmin, (req, res) => {
    const postId = req.params.id;
    db.query('DELETE FROM posts WHERE id = ?', [postId], (err, result) => {
        if (err) throw err;
        res.redirect('/admin-dashboard');
    });
});

app.post('/admin/edit-post/:id', isAuthenticated, isAdmin, upload.single('image'), (req, res) => {
    const postId = req.params.id;
    const { item_description, location, status, contact_info, found_time } = req.body;

    let updateQuery = 'UPDATE posts SET item_description = ?, location = ?, status = ?, contact_info = ?, found_time = ?';
    let queryParams = [item_description, location, status, contact_info, found_time];

    if (req.file) {
        updateQuery += ', image = ?';
        queryParams.push(req.file.filename);
    }

    updateQuery += ' WHERE id = ?';
    queryParams.push(postId);

    db.query(updateQuery, queryParams, (err, result) => {
        if (err) {
            console.error('Database update error:', err);
            return res.status(500).send('Error updating post');
        }
        if (result.affectedRows === 0) {
            return res.status(404).send('Post not found');
        }
        res.redirect('/admin-dashboard');
    });
});

// Update post status
app.post('/admin/update-status/:id', isAuthenticated, isAdmin, (req, res) => {
    const postId = req.params.id;
    const { newStatus } = req.body;

    const query = 'UPDATE posts SET status = ? WHERE id = ?';
    db.query(query, [newStatus, postId], (err, result) => {
        if (err) {
            console.error('Database update error:', err);
            return res.status(500).send('Error updating post status');
        }
        res.redirect('/admin-dashboard');
    });
});

// Delete post
app.post('/admin/delete-post/:id', isAuthenticated, isAdmin, (req, res) => {
    const postId = req.params.id;

    const query = 'DELETE FROM posts WHERE id = ?';
    db.query(query, [postId], (err, result) => {
        if (err) {
            console.error('Database delete error:', err);
            return res.status(500).send('Error deleting post');
        }
        res.redirect('/admin-dashboard');
    });
});

app.get('/admin-dashboard', async (req, res) => {
    try {
      const posts = await Post.findAll({
        include: [{ model: User, attributes: ['username'] }],
        order: [['createdAt', 'DESC']]
      });
      res.render('admin-dashboard', { posts });
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  // ในส่วนของ route สำหรับ admin-dashboard
app.get('/admin-dashboard', isAdmin, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // จำนวนโพสต์ต่อหน้า
    const offset = (page - 1) * limit;

    const countQuery = 'SELECT COUNT(*) as total FROM posts';
    const postsQuery = `
        SELECT posts.*, users.username 
        FROM posts 
        LEFT JOIN users ON posts.user_id = users.id 
        ORDER BY posts.created_at DESC 
        LIMIT ? OFFSET ?
    `;
    const usersQuery = 'SELECT * FROM users';

    db.query(countQuery, (err, countResult) => {
        if (err) {
            console.error('Error fetching post count:', err);
            return res.status(500).send('An error occurred');
        }

        const totalPosts = countResult[0].total;
        const totalPages = Math.ceil(totalPosts / limit);

        db.query(postsQuery, [limit, offset], (err, posts) => {
            if (err) {
                console.error('Error fetching posts:', err);
                return res.status(500).send('An error occurred');
            }

            db.query(usersQuery, (err, users) => {
                if (err) {
                    console.error('Error fetching users:', err);
                    return res.status(500).send('An error occurred');
                }

                res.render('admin-dashboard', {
                    posts: posts,
                    users: users,
                    currentPage: page,
                    totalPages: totalPages
                });
            });
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));