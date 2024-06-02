import React from 'react';
import { Rescue } from '../../types/rescue'; 

interface AdoptersProps {
  rescueProfile: Rescue | null;
}

const Adopters: React.FC<AdoptersProps> = ({ rescueProfile }) => {
  return (
    <div>
      <h1>Adopters</h1>
      {/* Display or use rescueProfile data */}
    </div>
  );
};

export default Adopters;
