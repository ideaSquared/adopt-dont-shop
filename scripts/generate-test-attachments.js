/**
 * Script to generate realistic test attachment files for the Emily attachment test conversation
 * This creates actual binary files using placedog.net for realistic dog images and PDFs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const UPLOADS_DIR = path.join(__dirname, '../uploads/chat');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Download a dog image from placedog.net
 */
function downloadDogImage(filename, width = 400, height = 300, description = 'Dog Image') {
  return new Promise((resolve, reject) => {
    const url = `https://placedog.net/${width}/${height}?random`;
    const filepath = path.join(UPLOADS_DIR, filename);

    console.log(`🐕 Downloading dog image: ${filename} (${width}x${height}) - ${description}`);

    https
      .get(url, response => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }

        const chunks = [];
        response.on('data', chunk => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          const imageBuffer = Buffer.concat(chunks);
          fs.writeFileSync(filepath, imageBuffer);
          console.log(
            `✅ Generated image: ${filename} (${imageBuffer.length} bytes) - ${description}`
          );
          resolve(imageBuffer.length);
        });
      })
      .on('error', error => {
        reject(error);
      });
  });
}

/**
 * Generate a simple test PDF document
 */
function generateTestPDF(
  filename,
  title = 'Test Document',
  content = 'This is a test PDF document.'
) {
  // Basic PDF structure
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 200 >>
stream
BT
/F1 12 Tf
72 720 Td
(${title}) Tj
0 -24 Td
(${content}) Tj
0 -24 Td
(Generated: ${new Date().toLocaleDateString()}) Tj
0 -24 Td
(Purpose: Chat attachment testing) Tj
0 -24 Td
(File: ${filename}) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000245 00000 n 
0000000324 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
574
%%EOF`;

  const filepath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filepath, pdfContent, 'utf8');

  console.log(`✅ Generated PDF: ${filename} (${pdfContent.length} bytes) - ${title}`);
  return pdfContent.length;
}

/**
 * Main function to generate all test attachments
 */
async function generateAllAttachments() {
  console.log("🎨 Generating test attachments for Emily's conversation...\n");

  const attachments = [
    // Images - Using placedog.net for realistic dog photos
    {
      type: 'image',
      filename: 'emily-attachment-test-living-room.jpg',
      description: 'Living Room Setup for New Dog',
      width: 800,
      height: 600,
    },
    {
      type: 'image',
      filename: 'emily-attachment-test-backyard.jpg',
      description: 'Secure Backyard with Fence',
      width: 1024,
      height: 768,
    },
    {
      type: 'image',
      filename: 'emily-attachment-test-buddy-playing.jpg',
      description: 'Buddy Playing in the Yard',
      width: 600,
      height: 400,
    },
    {
      type: 'image',
      filename: 'emily-attachment-test-buddy-sleeping.jpg',
      description: 'Buddy Taking a Peaceful Nap',
      width: 500,
      height: 375,
    },
    {
      type: 'image',
      filename: 'emily-attachment-test-dog-bed.jpg',
      description: 'Prepared Dog Bed and Toy Area',
      width: 640,
      height: 480,
    },
    // PDFs
    {
      type: 'pdf',
      filename: 'emily-attachment-test-contract.pdf',
      title: 'Pet Adoption Contract',
      content:
        'Official adoption contract between Happy Tails Dog Rescue and Emily Davis for Buddy.',
    },
    {
      type: 'pdf',
      filename: 'emily-attachment-test-signed-contract.pdf',
      title: 'Signed Pet Adoption Contract',
      content:
        'Completed and signed adoption contract - signatures provided electronically on July 20, 2024.',
    },
    {
      type: 'pdf',
      filename: 'emily-attachment-test-vet-records.pdf',
      title: 'Buddy - Veterinary Medical Records',
      content:
        'Complete veterinary medical records for Buddy including vaccinations and health assessments.',
    },
    {
      type: 'pdf',
      filename: 'emily-attachment-test-care-instructions.pdf',
      title: 'Buddy - Daily Care Instructions',
      content:
        'Comprehensive care instructions including feeding (2 cups daily), exercise (30+ min), emergency contact: (555) 123-4567.',
    },
  ];

  let totalFiles = 0;
  let totalSize = 0;

  for (const attachment of attachments) {
    try {
      if (attachment.type === 'image') {
        const size = await downloadDogImage(
          attachment.filename,
          attachment.width,
          attachment.height,
          attachment.description
        );
        totalSize += size;
      } else if (attachment.type === 'pdf') {
        const size = generateTestPDF(attachment.filename, attachment.title, attachment.content);
        totalSize += size;
      }
      totalFiles++;
    } catch (error) {
      console.error(`❌ Error generating ${attachment.filename}:`, error.message);
    }
  }

  console.log(`\n🎉 Successfully generated ${totalFiles} test attachments`);
  console.log(`📁 Total size: ${(totalSize / 1024).toFixed(1)} KB`);
  console.log(`📂 Location: ${UPLOADS_DIR}`);
  console.log(
    '\n💡 These files can now be served by your backend and will appear as real attachments in the chat system.'
  );
}

// Run the script
generateAllAttachments().catch(console.error);
