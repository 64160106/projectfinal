const Post = require('../models/post');
const User = require('../models/user');

exports.createPost = async (req, res) => {
  try {
    const { item_description, location, found_time, post_type } = req.body;
    const image = req.file ? req.file.filename : null;

    const status = post_type === 'Found' ? 'Pending' : 'Unreceived';

    const newPost = await Post.create({
        item_description,
        location,
        found_time,
        image,
        post_type,
        status,
        userId: req.user.id
    });

    res.redirect('/');
} catch (error) {
    console.error(error);
    res.status(500).send('Server error');
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

router.post('/update-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { newStatus } = req.body;

    // เพิ่ม 'unclaimed' ในรายการสถานะที่ยอมรับ
    const validStatuses = ['searching', 'found', 'unclaimed'];

    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const post = await Post.findByPk(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    post.status = newStatus;
    await post.save();

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});