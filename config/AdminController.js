const db = require('../db');
const { Post, User } = require('../models');

exports.getDashboard = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        const [posts, totalPosts] = await Promise.all([
            Post.findAll({
                include: [{ model: User, attributes: ['username'] }],
                order: [['createdAt', 'DESC']],
                limit: limit,
                offset: offset
            }),
            Post.count()
        ]);

        const totalPages = Math.ceil(totalPosts / limit);

        res.render('admin-dashboard', {
            posts: posts,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (error) {
        console.error('Error in admin dashboard:', error);
        res.status(500).send('An error occurred while loading the admin dashboard');
    }
};

exports.updatePostStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { newStatus } = req.body;

        await Post.update({ status: newStatus }, { where: { id: id } });

        res.redirect('/admin-dashboard');
    } catch (error) {
        console.error('Error updating post status:', error);
        res.status(500).send('An error occurred while updating the post status');
    }
};

exports.deletePost = async (req, res) => {
    try {
        const { id } = req.params;

        await Post.destroy({ where: { id: id } });

        res.redirect('/admin-dashboard');
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).send('An error occurred while deleting the post');
    }
};

exports.editPost = async (req, res) => {
    try {
        const { id } = req.params;
        const { item_description, location, status, contact_info, found_time } = req.body;

        await Post.update(
            { item_description, location, status, contact_info, found_time },
            { where: { id: id } }
        );

        res.redirect('/admin-dashboard');
    } catch (error) {
        console.error('Error editing post:', error);
        res.status(500).send('An error occurred while editing the post');
    }
};อ