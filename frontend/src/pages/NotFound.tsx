
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-4xl font-medium mb-2">404</h1>
        <p className="text-xl text-gray-600 mb-6">Page not found</p>
        <Link to="/" className="text-black hover:text-gray-700 underline">
          Return to MarketMirror
        </Link>
      </div>
      <div className="absolute bottom-6 text-sm text-gray-500">
        MarketMirror is in Beta
      </div>
    </div>
  );
};

export default NotFound;
