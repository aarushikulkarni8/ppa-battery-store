// For Vercel: publish the product photos in the repository as static files next to the website.
import fs from 'node:fs';

fs.cpSync('server/uploads', 'client/dist/uploads', { recursive: true });
console.log('product photos copied to client/dist/uploads');
