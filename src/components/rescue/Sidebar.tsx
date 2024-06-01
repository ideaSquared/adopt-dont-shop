import React from 'react';
import { Link } from 'react-router-dom';

interface SidebarProps {
  isVisible: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isVisible }) => {
  return (
    <aside
      className={`bg-gray-800 text-white w-64 p-4 fixed md:relative transform ${
        isVisible ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 transition-transform duration-300 ease-in-out`}
      id="sidebar"
    >
      <nav>
        <ul>
          <li className="p-2 hover:bg-gray-700 cursor-pointer">
            <Link to="/rescue-profile/adopters">Adopters</Link>
          </li>
          <li className="p-2 hover:bg-gray-700 cursor-pointer">
            <Link to="/rescue-profile/ratings">Ratings</Link>
          </li>
          <li className="p-2 hover:bg-gray-700 cursor-pointer">
            <Link to="/rescue-profile/pets">Pets</Link>
          </li>
          <li className="p-2 hover:bg-gray-700 cursor-pointer">
            <Link to="/rescue-profile/staff">Staff</Link>
          </li>
           <li className="p-2 hover:bg-gray-700 cursor-pointer">
            <Link to="/rescue-profile/settings">Settings</Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
