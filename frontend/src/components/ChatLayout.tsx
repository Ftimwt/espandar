import React from 'react';
import Sidebar from './Sidebar/Sidebar';
import {Outlet} from "react-router";

const ChatLayout: React.FC = () => {
  return (
    <div className="w-full h-screen bg-gray-50">
      <div className="container mx-auto">
        <div className="py-6 h-screen">
          <div className="flex border rounded shadow-lg h-full">
            <Sidebar/>
            <Outlet/>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatLayout;