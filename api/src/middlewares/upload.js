const multer = require('multer');
const path = require('path');
const fs = require('fs');

const dir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const nome = `prod_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, nome);
  },
});

function fileFilter(req, file, cb) {
  const ok = /jpeg|jpg|png|webp/.test(file.mimetype);
  cb(ok ? null : new Error('Apenas imagens jpg/png/webp são permitidas'), ok);
}

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
