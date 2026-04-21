// services/workspace-service/src/routes/document.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const docCtrl = require('../controllers/documentController');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/csv', 'text/markdown'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`File type not allowed: ${file.mimetype}`));
  },
});

router.post('/:workspaceId/documents', upload.single('file'), docCtrl.uploadDocument);
router.get('/:workspaceId/documents', docCtrl.listDocuments);
router.get('/:workspaceId/documents/:documentId', docCtrl.getDocument);
router.delete('/:workspaceId/documents/:documentId', docCtrl.deleteDocument);

module.exports = router;
