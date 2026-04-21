// services/workspace-service/src/controllers/documentController.js
const AWS = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { Document, WorkspaceMember } = require('../models');
const redis = require('../utils/redis');
const logger = require('../utils/logger');

const s3Client = new AWS.S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const S3_BUCKET = process.env.S3_BUCKET_DOCS || 'promptflow-documents';

const checkAccess = async (workspaceId, userId) => {
  return WorkspaceMember.findOne({ where: { workspaceId, userId } });
};

const extractText = async (buffer, mimeType) => {
  try {
    if (mimeType === 'application/pdf') {
      const result = await pdfParse(buffer);
      return result.text;
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else if (mimeType === 'text/plain' || mimeType.startsWith('text/')) {
      return buffer.toString('utf-8');
    }
    return '';
  } catch (err) {
    logger.warn({ err, mimeType }, 'Text extraction failed');
    return '';
  }
};

const splitIntoChunks = (text, size = 500) => {
  const chunks = [];
  for (let i = 0; i < text.length; i += size - 50) {
    chunks.push(text.slice(i, Math.min(i + size, text.length)));
  }
  return chunks;
};

exports.uploadDocument = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.headers['x-user-id'];
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const access = await checkAccess(workspaceId, userId);
    if (!access) return res.status(403).json({ error: 'Access denied' });

    const { originalname, mimetype, buffer, size } = req.file;
    const s3Key = `workspaces/${workspaceId}/documents/${Date.now()}-${originalname}`;

    // Create DB record first
    const document = await Document.create({
      workspaceId, uploadedBy: userId,
      name: originalname, originalName: originalname,
      mimeType: mimetype, sizeBytes: size,
      s3Key, s3Bucket: S3_BUCKET,
      status: 'uploading',
    });

    // Upload to S3 (fire and forget with status update)
    const uploadProcess = async () => {
      try {
        if (process.env.S3_BUCKET_DOCS) {
          const upload = new Upload({
            client: s3Client,
            params: { Bucket: S3_BUCKET, Key: s3Key, Body: buffer, ContentType: mimetype, Metadata: { workspaceId, uploadedBy: userId, documentId: document.id } },
          });
          await upload.done();
        }

        // Extract text content
        const content = await extractText(buffer, mimetype);
        const chunks = content ? splitIntoChunks(content) : [];

        await document.update({ content, chunks, status: 'ready' });

        await redis.publish('document-events', JSON.stringify({
          type: 'DOCUMENT_PROCESSED', documentId: document.id, workspaceId, userId,
        }));

        logger.info({ event: 'document_uploaded', documentId: document.id, workspaceId, size });
      } catch (err) {
        logger.error({ err }, 'Document processing failed');
        await document.update({ status: 'failed' });
      }
    };

    uploadProcess(); // async - don't await

    res.status(201).json({
      document: {
        id: document.id, name: document.name,
        mimeType: document.mimeType, sizeBytes: document.sizeBytes,
        status: document.status,
      },
    });
  } catch (err) { next(err); }
};

exports.listDocuments = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.headers['x-user-id'];
    const access = await checkAccess(workspaceId, userId);
    if (!access) return res.status(403).json({ error: 'Access denied' });

    const documents = await Document.findAll({
      where: { workspaceId },
      attributes: ['id', 'name', 'mimeType', 'sizeBytes', 'status', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    res.json({ documents });
  } catch (err) { next(err); }
};

exports.getDocument = async (req, res, next) => {
  try {
    const { workspaceId, documentId } = req.params;
    const userId = req.headers['x-user-id'];
    const access = await checkAccess(workspaceId, userId);
    if (!access) return res.status(403).json({ error: 'Access denied' });

    const doc = await Document.findOne({ where: { id: documentId, workspaceId } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    res.json({ document: { ...doc.toJSON(), content: doc.content?.slice(0, 5000) } }); // Preview first 5k chars
  } catch (err) { next(err); }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const { workspaceId, documentId } = req.params;
    const userId = req.headers['x-user-id'];
    const member = await WorkspaceMember.findOne({ where: { workspaceId, userId, role: ['owner', 'admin', 'member'] } });
    if (!member) return res.status(403).json({ error: 'Access denied' });

    const doc = await Document.findOne({ where: { id: documentId, workspaceId } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (doc.s3Key && process.env.S3_BUCKET_DOCS) {
      await s3Client.send(new AWS.DeleteObjectCommand({ Bucket: S3_BUCKET, Key: doc.s3Key }));
    }
    await doc.destroy();
    res.json({ message: 'Document deleted' });
  } catch (err) { next(err); }
};
