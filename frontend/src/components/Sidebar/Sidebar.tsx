import React from 'react';
import SidebarHeader from './SidebarHeader';
import SearchBox from './SearchBox';
import ContactList from './ContactList';
import NewChatButton from './NewChatButton.tsx';

const Sidebar: React.FC = () => {
  return (
    <div className="w-1/3 border-r flex flex-col">
      <SidebarHeader />
      <SearchBox />
      <ContactList />
      <NewChatButton />
    </div>
  );
};

export default Sidebar;
