import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http.js';

export const cloudinaryConfigured = Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

/**
 * Without Cloudinary, photos are saved in server/uploads on your own computer so you can try things out.
 * On the live site (NODE_ENV=production) Cloudinary is required: hosting servers lose local files on restart.
 */
export const LOCAL_UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');
export const localUploads = !cloudinaryConfigured && !env.isProd;
export const uploadsEnabled = cloudinaryConfigured || localUploads;
const EXT: Record<string, string> = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/svg+xml': '.svg' };

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.mimetype)) cb(null, true);
    else cb(new HttpError(400, 'Only PNG, JPG, WEBP, GIF or SVG images are allowed'));
  },
});

export async function uploadImage(buffer: Buffer, folder: string, mimetype = 'image/jpeg'): Promise<{ url: string; publicId: string }> {
  if (localUploads) {
    const dir = path.join(LOCAL_UPLOAD_DIR, folder);
    fs.mkdirSync(dir, { recursive: true });
    const name = `${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}${EXT[mimetype] ?? '.jpg'}`;
    fs.writeFileSync(path.join(dir, name), buffer);
    return { url: `/uploads/${folder}/${name}`, publicId: `local:${folder}/${name}` };
  }
  if (!cloudinaryConfigured) {
    throw new HttpError(400, 'Image upload needs Cloudinary. Add CLOUDINARY_* values to server/.env, or paste an image URL instead.');
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: `ppa/${folder}`, resource_type: 'image' }, (err, result) => {
      if (err || !result) return reject(err ?? new Error('Upload failed'));
      resolve({ url: result.secure_url, publicId: result.public_id });
    });
    stream.end(buffer);
  });
}

export async function deleteImage(publicId: string) {
  if (publicId?.startsWith('local:')) {
    const file = path.join(LOCAL_UPLOAD_DIR, publicId.slice(6));
    if (file.startsWith(LOCAL_UPLOAD_DIR)) fs.rm(file, { force: true }, () => undefined);
    return;
  }
  if (!cloudinaryConfigured || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (e) {
    console.warn('[images] could not delete', publicId, (e as Error).message);
  }
}
