const express = require('express');
const multer = require('multer');
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.post('/fotos', authMiddleware, upload.array('fotos', 5), uploadController.uploadFotos);

module.exports = router;
