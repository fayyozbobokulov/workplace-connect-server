import express from 'express';
import { serveFile, getFileMetadata } from '../controllers/file.controller';

const router = express.Router();

/**
 * @route GET /files/:filename
 * @desc Serve uploaded file
 * @access Public
 */
router.get('/:filename', serveFile);

/**
 * @route GET /files/:filename/info
 * @desc Get file metadata
 * @access Public
 */
router.get('/:filename/info', getFileMetadata);

export default router;
