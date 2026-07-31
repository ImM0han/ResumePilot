const multer = require('multer');
const path = require('path');

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const validExt = ext === '.pdf' || ext === '.docx';
  const validMime = ALLOWED_MIME_TYPES.includes(file.mimetype);

  if (validExt && validMime) {
    return cb(null, true);
  }
  cb(new Error('Unsupported file type. Please upload a PDF or DOCX file.'));
};

const maxSizeMb = Number(process.env.MAX_FILE_SIZE_MB) || 8;

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMb * 1024 * 1024 },
});

module.exports = upload;
