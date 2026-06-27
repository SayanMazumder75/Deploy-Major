import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../uploads/documents');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});

// File filter - only PDFs
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed!'), false);
    }
};

// Configure multer
// Default max upload size = 100 MB. This is intentionally generous because
// the AI Document Intelligence module is built to summarise large textbooks
// and reference PDFs which routinely exceed 10 MB. The limit can be tuned
// without a code change by setting MAX_FILE_SIZE in the backend env (value
// is in bytes: 1 MB ≈ 1,048,576 bytes).
const DEFAULT_MAX_FILE_SIZE = 104857600; // 100 MB
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || DEFAULT_MAX_FILE_SIZE
    }
});

export default upload;