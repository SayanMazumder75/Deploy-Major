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
//
// Max upload size = 100 MB, hardcoded. We previously read this from a
// MAX_FILE_SIZE env var with a 100 MB code default, but in practice that
// proved fragile: a stale env value set to the old 10 MB limit silently
// overrode the new default and produced misleading error messages.
// Hardcoding here makes the limit a property of the deployed code (which
// is reviewed in PRs and tested before shipping) rather than of the
// per-environment config. If we ever genuinely need a smaller limit in a
// specific environment, reintroduce an env override here behind a more
// explicit name like UPLOAD_MAX_FILE_SIZE.
const MAX_FILE_SIZE = 104857600; // 100 MB
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE
    }
});

// Re-exported so other modules (e.g. errorHandler) can render the limit
// in user-facing messages without reaching into multer internals.
export const MAX_UPLOAD_FILE_SIZE = MAX_FILE_SIZE;

export default upload;