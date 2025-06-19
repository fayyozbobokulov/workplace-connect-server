import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { getFileInfo } from '../utils/fileUpload.util';

/**
 * Serve uploaded files with proper headers and security
 * @route GET /files/:filename
 */
export const serveFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { filename } = req.params;
    
    // Validate filename format (should be UUID + extension)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|gif|webp)$/i;
    
    if (!uuidRegex.test(filename)) {
      res.status(400).json({ message: 'Invalid filename format' });
      return;
    }
    
    const filesDir = path.join(process.cwd(), 'files');
    const filePath = path.join(filesDir, filename);
    
    // Security check: ensure the resolved path is within the files directory
    const resolvedPath = path.resolve(filePath);
    const resolvedFilesDir = path.resolve(filesDir);
    
    if (!resolvedPath.startsWith(resolvedFilesDir)) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: 'File not found' });
      return;
    }
    
    // Get file information
    const fileInfo = getFileInfo(filename);
    if (!fileInfo) {
      res.status(404).json({ message: 'File not found' });
      return;
    }
    
    // Set appropriate headers
    const extension = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (extension) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
    }
    
    // Set security and caching headers
    res.set({
      'Content-Type': contentType,
      'Content-Length': fileInfo.size.toString(),
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      'ETag': `"${filename}-${fileInfo.modifiedAt.getTime()}"`,
      'Last-Modified': fileInfo.modifiedAt.toUTCString(),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    });
    
    // Handle conditional requests (304 Not Modified)
    const ifNoneMatch = req.headers['if-none-match'];
    const ifModifiedSince = req.headers['if-modified-since'];
    
    const etag = `"${filename}-${fileInfo.modifiedAt.getTime()}"`;
    
    if (ifNoneMatch === etag || 
        (ifModifiedSince && new Date(ifModifiedSince) >= fileInfo.modifiedAt)) {
      res.status(304).end();
      return;
    }
    
    // Log file access
    const timestamp = new Date().toISOString();
    const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
    console.log(`📁 ${timestamp} | FILE ACCESS | ${filename} | ${clientIP} | ${req.headers['user-agent']?.substring(0, 50) || 'unknown'}`);
    
    // Send file
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error serving file:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error serving file' });
        }
      }
    });
  } catch (error) {
    console.error('File serving error:', error);
    res.status(500).json({ message: 'Server error while serving file' });
  }
};

/**
 * Get file metadata without serving the file
 * @route GET /files/:filename/info
 */
export const getFileMetadata = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { filename } = req.params;
    
    // Validate filename format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|gif|webp)$/i;
    
    if (!uuidRegex.test(filename)) {
      res.status(400).json({ message: 'Invalid filename format' });
      return;
    }
    
    const fileInfo = getFileInfo(filename);
    
    if (!fileInfo) {
      res.status(404).json({ message: 'File not found' });
      return;
    }
    
    // Return file metadata
    res.json({
      filename: fileInfo.filename,
      size: fileInfo.size,
      createdAt: fileInfo.createdAt,
      modifiedAt: fileInfo.modifiedAt,
      extension: path.extname(filename).toLowerCase(),
      url: `${req.protocol}://${req.get('host')}/files/${filename}`
    });
  } catch (error) {
    console.error('Get file metadata error:', error);
    res.status(500).json({ message: 'Server error while getting file metadata' });
  }
};
