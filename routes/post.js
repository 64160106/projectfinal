const express = require('express');
const router = express.Router();
const multer = require('multer'); // ใช้ multer เพื่อจัดการการอัปโหลดไฟล์
const Post = require('models/Post'); // ใช้ path ที่ถูกต้องสำหรับโมเดล Post

// ตั้งค่า multer สำหรับการอัปโหลดไฟล์
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // กำหนดไดเรกทอรีสำหรับอัปโหลด
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); // เปลี่ยนชื่อไฟล์เป็นชื่อที่ไม่ซ้ำ
    }
});

const upload = multer({ storage: storage });

// Handle create post
router.post('/', upload.single('image'), async (req, res) => {
    const { item_description, location, lost_date_time } = req.body;
    const image = req.file.filename; // หากใช้ multer เพื่ออัปโหลดไฟล์

    try {
        // สร้างโพสต์ใหม่
        const newPost = new Post({
            item_description,
            location,
            lost_date_time,
            image,
        });

        await newPost.save();
        // เปลี่ยนเส้นทางไปยังหน้าแรกเมื่อโพสต์สำเร็จ
        res.redirect('/');
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
