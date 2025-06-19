import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'files');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, uploadsDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Generate unique filename with original extension
    const uniqueName = uuidv4();
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${uniqueName}${extension}`;
    cb(null, filename);
  }
});

// File filter for images only
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed image types
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }
};

// Multer configuration
export const uploadProfilePicture = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file at a time
  },
  fileFilter: fileFilter
});

/**
 * Delete a file from the uploads directory
 * @param filename - Name of the file to delete
 * @returns Promise<boolean> - True if file was deleted, false if file didn't exist
 */
export const deleteFile = async (filename: string): Promise<boolean> => {
  try {
    const filePath = path.join(uploadsDir, filename);
    
    // Check if file exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

/**
 * Get file information
 * @param filename - Name of the file
 * @returns File information or null if file doesn't exist
 */
export const getFileInfo = (filename: string) => {
  try {
    const filePath = path.join(uploadsDir, filename);
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return {
        filename,
        path: filePath,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting file info:', error);
    return null;
  }
};

/**
 * Generate file URL for client access
 * @param filename - Name of the file
 * @param baseUrl - Base URL of the server
 * @returns Complete URL to access the file
 */
export const generateFileUrl = (filename: string, baseUrl: string): string => {
  return `${baseUrl}/files/${filename}`;
};
