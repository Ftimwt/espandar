import React from 'react';
import { Input } from 'antd';

const SearchBox: React.FC = () => {
  return (
    <div className="bg-gray-50 p-2">
      <Input placeholder="Search or start new chat" size="middle" />
    </div>
  );
};

export default SearchBox;