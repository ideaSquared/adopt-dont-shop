import React from 'react';

interface CardProps {
  title: string;
  content: string;
}

const Card: React.FC<CardProps> = ({ title, content }) => {
  return (
    <div className="bg-white p-4 shadow rounded">
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p>{content}</p>
    </div>
  );
};

export default Card;
