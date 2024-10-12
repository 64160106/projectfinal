const express = require('express');
const router = express.Router();
const multer = require('multer');
const Post = require('../models/post');  // แก้ไขเส้นทางการ import ให้ถูกต้อง
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

// Update post status
router.post('/update-status/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { newStatus } = req.body;

        console.log('Received update request:', { id, newStatus });  // เพิ่ม logging

        // ตรวจสอบว่า newStatus เป็นค่าที่ถูกต้อง
        if (!['searching', 'found', 'unclaimed'].includes(newStatus)) {
            console.log('Invalid status:', newStatus);  // เพิ่ม logging
            return res.status(400).json({ error: 'Invalid status' });
        }

        const post = await Post.findByPk(id);
        if (!post) {
            console.log('Post not found:', id);  // เพิ่ม logging
            return res.status(404).json({ error: 'Post not found' });
        }

        console.log('Current post status:', post.status);  // เพิ่ม logging

        // อัปเดตสถานะ
        post.status = newStatus;
        await post.save();

        console.log('Updated post status:', post.status);  // เพิ่ม logging

        // ส่งกลับ response
        res.json({ message: 'Status updated successfully', newStatus: post.status });
    } catch (error) {
        console.error('Error updating post status:', error);
        res.status(500).json({ error: 'An error occurred while updating the post status', details: error.message });
    }
});

module.exports = router;

router.get('/', async (req, res) => {
    try {
      const { search, type, status, date } = req.query;
      let whereClause = {};
  
      if (search) {
        whereClause[Op.or] = [
          { item_description: { [Op.like]: `%${search}%` } },
          { location: { [Op.like]: `%${search}%` } },
          { '$User.username$': { [Op.like]: `%${search}%` } },
          { contact_info: { [Op.like]: `%${search}%` } }
        ];
      }
  
      if (type) {
        whereClause.post_type = type;
      }
  
      if (status) {
        whereClause.status = status;
      }
  
      if (date) {
        whereClause.found_time = {
          [Op.gte]: new Date(date),
          [Op.lt]: new Date(new Date(date).setDate(new Date(date).getDate() + 1))
        };
      }
  
      const posts = await Post.findAll({
        where: whereClause,
        include: [{ model: User, attributes: ['username'] }],
        order: [['createdAt', 'DESC']]
      });
  
      res.render('index', { posts, username: req.user ? req.user.username : null });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server error');
    }
  });

  const { Op } = require('sequelize');

router.get('/', async (req, res) => {
    try {
        const { search, type, status, date } = req.query;
        let whereClause = {};

        if (search) {
            whereClause[Op.or] = [
                { item_description: { [Op.like]: `%${search}%` } },
                { location: { [Op.like]: `%${search}%` } },
                { '$user.username$': { [Op.like]: `%${search}%` } },
                { contact_info: { [Op.like]: `%${search}%` } }
            ];
        }

        if (type) {
            whereClause.post_type = type;
        }

        if (status) {
            whereClause.status = status;
        }

        if (date) {
            whereClause.found_time = {
                [Op.gte]: new Date(date),
                [Op.lt]: new Date(new Date(date).setDate(new Date(date).getDate() + 1))
            };
        }

        const posts = await Post.findAll({
            where: whereClause,
            include: [{ model: User, as: 'user', attributes: ['username'] }],
            order: [['createdAt', 'DESC']]
        });

        res.render('post', { 
            posts: posts, 
            username: req.session.username,
            search: search || '',
            type: type || '',
            status: status || '',
            date: date || ''
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).send('Internal Server Error');
    }
});