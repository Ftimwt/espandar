import React from 'react';
import ContactItem from './ContactItem';

const contacts = [
  {
    avatar:
      'https://darrenjameseeley.files.wordpress.com/2014/09/expendables3.jpeg',
    name: 'New Movie! Expendables 4',
    message: 'Get Andrés on this movie ASAP!',
    time: '12:45 pm',
  },
  {
    avatar:
      'https://www.biography.com/.image/t_share/MTE5NDg0MDU1MTIyMTE4MTU5/arnold-schwarzenegger-9476355-1-402.jpg',
    name: 'Arnold Schwarzenegger',
    message: "I'll be back",
    time: '12:45 pm',
  },
  {
    avatar:
      'https://www.famousbirthdays.com/headshots/russell-crowe-6.jpg',
    name: 'Russell Crowe',
    message: 'Hold the line!',
    time: '12:45 pm',
  },
  {
    avatar:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQGpYTzuO0zLW7yadaq4jpOz2SbsX90okb24Z9GtEvK6Z9x2zS5',
    name: 'Tom Cruise',
    message: 'Show me the money!',
    time: '12:45 pm',
  },
];

const ContactList: React.FC = () => {
  return (
    <div className="flex-1 overflow-auto">
      {contacts.map((c, i) => (
        <ContactItem key={i} {...c} />
      ))}
    </div>
  );
};

export default ContactList;