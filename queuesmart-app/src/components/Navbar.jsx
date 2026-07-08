import { Link } from "react-router-dom";
import "./Navbar.css";

// Top Navigation bar.

function Navbar() {
    return (
        <nav className="navbar">
            <div className="navbar-brand">QueueSmart</div>
            <div className="navbar-links">
                <Link to="/">Dashboard</Link>
                <Link to="/join">Join Queue</Link>
                <Link to="/status">Queue Status</Link>
                <Link to="/history">History</Link>
                <Link to="/admin">Admin</Link>
                <Link to="/login">Login</Link>
            </div>
        </nav>
    );
}

export default Navbar;