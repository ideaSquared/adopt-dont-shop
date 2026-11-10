import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test-utils/render';
import { AdoptionPoliciesDisplay } from './AdoptionPoliciesDisplay';

describe('AdoptionPoliciesDisplay', () => {
  it('shows the adoption fee range in pounds', () => {
    render(
      <AdoptionPoliciesDisplay
        adoptionPolicies={{
          requireHomeVisit: false,
          requireReferences: false,
          minimumReferenceCount: 0,
          requireVeterinarianReference: false,
          adoptionFeeRange: { min: 50, max: 150 },
          requirements: [],
          policies: [],
        }}
      />
    );

    expect(screen.getByText(/£50\.00\s*-\s*£150\.00/)).toBeInTheDocument();
  });
});
