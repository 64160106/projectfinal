const express = require('express');
const router = express.Router();
const multer = require('multer');
const Post = require('models/Post');
const User = require('../models/user');

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Get all posts
router.get('/', async (req, res) => {
    try {
        const posts = await Post.findAll({
            include: [{ model: User, as: 'user' }],
            order: [['createdAt', 'DESC']]
        });
        res.render('post', { posts: posts, username: req.session.username });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Create a new post
router.post('/', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
        const { item_description, location, found_time, post_type } = req.body;
        const newPost = await Post.create({
            item_description,
            location,
            found_time,
            image: req.file ? req.file.filename : null,
            userId: req.session.userId,
            post_type,
            status: 'searching'
        });
        res.redirect('/');
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Delete a post
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await Post.findByPk(postId);
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        if (post.userId !== req.session.userId) {
            return res.status(403).json({ message: 'You are not authorized to delete this post' });
        }

        await post.destroy();
        res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;