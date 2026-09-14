import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="page">
      <div className="state">
        <p className="state__title">Page not found</p>
        <p className="state__detail">That route doesn’t exist in this app.</p>
        <Link className="button" to="/dashboard">
          Back to the dashboard
        </Link>
      </div>
    </div>
  );
}
