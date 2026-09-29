const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary if credentials are present
const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET && 
  process.env.CLOUDINARY_CLOUD_NAME
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  console.log('☁️  Cloudinary Media Storage configured.');
}

/**
 * Upload an image file buffer or path to Cloudinary
 */
async function uploadToCloudinary(filePathOrBuffer, options = {}) {
  if (!isCloudinaryConfigured) {
    return null;
  }

  try {
    const result = await cloudinary.uploader.upload(filePathOrBuffer, {
      folder: 'findora_items',
      resource_type: 'image',
      ...options
    });
    return result.secure_url;
  } catch (error) {
    console.warn('[CLOUDINARY WARNING] Cloud upload failed, using local storage:', error.message);
    return null;
  }
}

module.exports = {
  uploadToCloudinary,
  isCloudinaryConfigured
};
