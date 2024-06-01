import React from 'react';
import { Rescue } from '../../types/rescue';
import RatingsTable from '../../components/tables/RatingsTable';
import GenericFilterForm from '../../components/forms/GenericFilterForm';
import { useRatings } from '../../hooks/useRatings';

interface RatingsProps {
  rescueProfile: Rescue | null;
}

const Ratings: React.FC<RatingsProps> = ({ rescueProfile }) => {
  if (!rescueProfile) {
    return <p>Rescue profile not available.</p>;
  }

  const {
    filteredRatings,
    searchTerm,
    filterCriteria,
    handleSearchChange,
    handleFilterChange,
    handleCreateConversation,
  } = useRatings(rescueProfile.rescue_id);

  return (
    <div>
      <h2 className="text-xl mb-4">Ratings</h2>
      <GenericFilterForm
        filters={[
          {
            type: 'text',
            placeholder: 'Search by pet name or user first name...',
            value: searchTerm,
            onChange: handleSearchChange
          },
          {
            type: 'select',
            value: filterCriteria,
            onChange: handleFilterChange,
            options: [
              { label: 'Filter by all criteria', value: '' },
              { label: 'Like', value: 'like' },
              { label: 'Love', value: 'love' },
            ]
          },
        ]}
      />
      <RatingsTable
        filteredRatings={filteredRatings}
        onCreateConversation={handleCreateConversation}
      />
    </div>
  );
};

export default Ratings;
