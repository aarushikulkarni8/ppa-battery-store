import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-x py-20 text-center">
      <p className="font-display text-7xl font-bold text-steel-400">404</p>
      <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-graphite">The page you were looking for does not exist.</p>
      <Link to="/" className="btn-primary mt-6">Back to home</Link>
    </div>
  );
}
