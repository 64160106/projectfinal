const Post = require('../models/post');
const User = require('../models/user');

exports.createPost = async (req, res) => {
  try {
    const { item_description, location, found_time, contact_info } = req.body;
    const image = req.file ? req.file.filename : null;

    const newPost = await Post.create({
      item_description,
      location,
      found_time,
      image,
      contact_info,
      userId: req.session.userId
    });

    res.redirect('/');
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).send('Error creating post');
  }
};

exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Post.findAll({
      include: [{ model: User, as: 'user', attributes: ['username'] }],
      order: [['createdAt', 'DESC']]
    });

    res.render('post', { posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).send('Error fetching posts');
  }
};