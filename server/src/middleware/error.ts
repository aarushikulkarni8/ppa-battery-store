import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { HttpError } from '../utils/http.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message, details: err.details });
    return;
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    res.status(400).json({
      message: first ? `${first.path.join('.') || 'input'}: ${first.message}` : 'Invalid input',
      details: err.issues,
    });
    return;
  }
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ message: Object.values(err.errors)[0]?.message ?? 'Invalid data' });
    return;
  }
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ message: `Invalid ${err.path}` });
    return;
  }
  if ((err as { code?: number }).code === 11000) {
    const key = Object.keys((err as { keyValue?: object }).keyValue ?? {}).join(', ');
    res.status(409).json({ message: `A record with this ${key || 'value'} already exists` });
    return;
  }
  if ((err as { code?: string }).code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ message: 'Image is too large (max 5 MB)' });
    return;
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
};
