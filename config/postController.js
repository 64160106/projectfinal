const Post = require('../models/post'); // โมเดลสำหรับโพสต์
const User = require('../models/user'); // โมเดลสำหรับผู้ใช้

// ฟังก์ชันสำหรับสร้างโพสต์
exports.createPost = async (req, res) => {
    try {
        const { item_description, location, found_time } = req.body;
        const userId = req.user.id; // สมมุติว่ามีการเก็บข้อมูลผู้ใช้ใน req.user

        const newPost = new Post({
            title: item_description, // เพิ่ม title
            description: item_description,
            location: location,
            date: found_time, // เปลี่ยนชื่อเป็น date เพื่อให้สอดคล้องกับโมเดล
            userId: userId, // เก็บ ID ของผู้ใช้ที่โพสต์
            image: req.file ? req.file.filename : null // ถ้ามีการอัปโหลดไฟล์ภาพ
        });

        await newPost.save();
        res.redirect('/posts'); // เปลี่ยนเส้นทางไปที่หน้าโพสต์
    } catch (error) {
        console.error(error);
        res.render('create-post', { errorMessage: 'เกิดข้อผิดพลาดในการสร้างโพสต์' });
    }
};

// ฟังก์ชันสำหรับแสดงโพสต์ทั้งหมด
exports.getAllPosts = async (req, res) => {
    try {
        const posts = await Post.findAll({
            include: [{
                model: User,
                as: 'user',
                attributes: ['username'] // ดึงเฉพาะ username
            }]
        });
        res.render('posts', { posts });
    } catch (error) {
        console.error(error);
        res.render('posts', { errorMessage: 'เกิดข้อผิดพลาดในการดึงโพสต์' });
    }
};
