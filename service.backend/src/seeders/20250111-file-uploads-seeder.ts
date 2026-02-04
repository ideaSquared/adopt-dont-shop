import { generateCryptoUuid as uuidv4 } from '../utils/uuid-helpers';
import FileUpload from '../models/FileUpload';
import { JsonObject } from '../types/common';

const sampleFileUploads = [
  {
    upload_id: uuidv4(),
    original_filename: 'sample-chat-image.jpg',
    stored_filename: `chat-${Date.now()}-sample.jpg`,
    file_path: '/uploads/chat/sample.jpg',
    mime_type: 'image/jpeg',
    file_size: 245760, // 240KB
    url: '/uploads/chat/sample.jpg',
    thumbnail_url: '/uploads/chat/sample-thumb.jpg',
    uploaded_by: 'user_0000adopt01', // Using existing test user
    entity_id: 'chat_0000bjon001', // Using existing test chat
    entity_type: 'chat' as const,
    purpose: 'attachment' as const,
    metadata: {
      dimensions: {
        width: 800,
        height: 600,
      },
      compressed: true,
      thumbnail_generated: true,
    } as JsonObject,
  },
  {
    upload_id: uuidv4(),
    original_filename: 'sample-document.pdf',
    stored_filename: `chat-${Date.now()}-document.pdf`,
    file_path: '/uploads/chat/document.pdf',
    mime_type: 'application/pdf',
    file_size: 1048576, // 1MB
    url: '/uploads/chat/document.pdf',
    uploaded_by: 'user_0000rscst01', // Using existing test user
    entity_id: 'chat_0000bjon001', // Using existing test chat
    entity_type: 'chat' as const,
    purpose: 'attachment' as const,
    metadata: {
      pages: 5,
      scanned: true,
      text_extracted: false,
    } as JsonObject,
  },
  {
    upload_id: uuidv4(),
    original_filename: 'pet-profile.png',
    stored_filename: `pets-${Date.now()}-profile.png`,
    file_path: '/uploads/pets/profile.png',
    mime_type: 'image/png',
    file_size: 512000, // 500KB
    url: '/uploads/pets/profile.png',
    thumbnail_url: '/uploads/pets/profile-thumb.png',
    uploaded_by: 'user_0000rscst01', // Using existing test user
    entity_id: 'pet_0000buddy01', // Using existing test pet
    entity_type: 'pet' as const,
    purpose: 'image' as const,
    metadata: {
      dimensions: {
        width: 1024,
        height: 768,
      },
      compressed: true,
      thumbnail_generated: true,
      filters_applied: ['brightness', 'contrast'],
    } as JsonObject,
  },
  {
    upload_id: uuidv4(),
    original_filename: 'vaccination-record.pdf',
    stored_filename: `applications-${Date.now()}-vaccination.pdf`,
    file_path: '/uploads/applications/vaccination-record.pdf',
    mime_type: 'application/pdf',
    file_size: 2048576, // 2MB
    url: '/uploads/applications/vaccination-record.pdf',
    uploaded_by: 'user_0000adopt01', // Using existing test user
    entity_id: 'application_0000bjon001', // Using existing test application
    entity_type: 'application' as const,
    purpose: 'document' as const,
    metadata: {
      pages: 3,
      document_type: 'vaccination_record',
      verified: true,
      expiry_date: '2025-12-31',
    } as JsonObject,
  },
];

export async function seedFileUploads() {
  for (const fileUploadData of sampleFileUploads) {
    await FileUpload.findOrCreate({
      where: {
        original_filename: fileUploadData.original_filename,
        uploaded_by: fileUploadData.uploaded_by,
      },
      defaults: {
        ...fileUploadData,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Created ${sampleFileUploads.length} test file uploads`);
}
