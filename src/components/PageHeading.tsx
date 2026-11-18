import React from 'react';

const PageHeading: React.FC<{
  eyebrow?: string;
  title: string;
  description: string;
  extra?: React.ReactNode;
}> = ({ eyebrow, title, description, extra }) => (
  <div className="ke-page-heading">
    <div>
      {eyebrow && <div className="ke-eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    {extra && <div className="ke-heading-actions">{extra}</div>}
  </div>
);
export default PageHeading;
