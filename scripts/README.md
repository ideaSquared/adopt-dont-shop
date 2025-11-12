# Test Attachments Generator

This directory contains scripts for generating realistic test attachment files for the chat system.

## Quick Start

To generate all test attachment files:

```bash
npm run generate:attachments
```

Or run the script directly:

```bash
node scripts/generate-test-attachments.js
```

## What This Creates

The script generates 9 test files for Emily's attachment test conversation:

### Images (JPEG format, ~25-55KB each)

- `emily-attachment-test-living-room.jpg` - Living room setup
- `emily-attachment-test-backyard.jpg` - Secure backyard with fence
- `emily-attachment-test-buddy-playing.jpg` - Dog playing in yard
- `emily-attachment-test-buddy-sleeping.jpg` - Dog taking a nap
- `emily-attachment-test-dog-bed.jpg` - Prepared dog bed area

### Documents (PDF format, ~800-900 bytes each)

- `emily-attachment-test-contract.pdf` - Adoption contract
- `emily-attachment-test-signed-contract.pdf` - Signed adoption contract
- `emily-attachment-test-vet-records.pdf` - Veterinary medical records
- `emily-attachment-test-care-instructions.pdf` - Daily care instructions

## File Details

- **Images**: Generated as valid JPEG files with proper headers that browsers will recognize
- **PDFs**: Created as minimal but valid PDF documents that can be opened and viewed
- **Total Size**: ~194KB for all files combined
- **Location**: `uploads/chat/` directory

## Integration

These files work with the seeder `20-emily-attachment-test.ts` which creates:

- Chat conversation records
- Message records with attachment references
- File upload records with correct file sizes and metadata

The generated files have realistic file sizes that match the database records, making the test data more authentic for development and testing.

## Regeneration

You can regenerate the files at any time. The script will overwrite existing files with new randomly-generated content, so file sizes may vary slightly on each run.
