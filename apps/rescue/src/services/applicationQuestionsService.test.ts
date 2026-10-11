import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiServiceMock = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./libraryServices', () => ({ apiService: apiServiceMock }));

import { getApplicationQuestions } from './applicationQuestionsService';

describe('getApplicationQuestions', () => {
  beforeEach(() => {
    apiServiceMock.get.mockReset();
  });

  it("reads the rescue's questions from the gateway's data envelope", async () => {
    apiServiceMock.get.mockResolvedValue({
      success: true,
      data: [
        {
          questionId: 'q-1',
          questionKey: 'why_adopt',
          category: 'final_acknowledgments',
          questionText: 'Why do you want to adopt this pet?',
          displayOrder: 3,
          isEnabled: true,
        },
      ],
    });

    await expect(getApplicationQuestions('rsc-1')).resolves.toEqual([
      {
        questionKey: 'why_adopt',
        category: 'final_acknowledgments',
        questionText: 'Why do you want to adopt this pet?',
        displayOrder: 3,
      },
    ]);
    expect(apiServiceMock.get).toHaveBeenCalledWith('/api/v1/rescues/rsc-1/questions');
  });

  it('skips malformed entries', async () => {
    apiServiceMock.get.mockResolvedValue({ success: true, data: [{ questionKey: 'no_text' }] });

    await expect(getApplicationQuestions('rsc-1')).resolves.toEqual([]);
  });
});
