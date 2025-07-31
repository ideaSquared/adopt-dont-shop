import { v4 as uuidv4 } from 'uuid';

import Chat from '../models/Chat';
import ChatParticipant from '../models/ChatParticipant';
import FileUpload from '../models/FileUpload';
import Message from '../models/Message';

import { ChatStatus, MessageContentFormat, ParticipantRole } from '../types/chat';

// Emily Davis (user_adopter_002) attachment testing conversation with Happy Tails Dog Rescue

const emilyAttachmentTestData = {
  // Chat conversation
  chat: {
    chat_id: 'chat_emily_attachment_test_001',
    rescue_id: '550e8400-e29b-41d4-a716-446655440002', // Happy Tails Dog Rescue
    status: ChatStatus.ACTIVE,
    created_at: new Date('2024-07-20T10:00:00Z'),
    updated_at: new Date('2024-07-20T16:30:00Z'),
  },

  // Chat participants
  participants: [
    {
      chat_participant_id: uuidv4(),
      chat_id: 'chat_emily_attachment_test_001',
      participant_id: 'user_adopter_002', // Emily Davis
      role: ParticipantRole.USER,
      last_read_at: new Date('2024-07-20T16:30:00Z'),
      created_at: new Date('2024-07-20T10:00:00Z'),
      updated_at: new Date('2024-07-20T16:30:00Z'),
    },
    {
      chat_participant_id: uuidv4(),
      chat_id: 'chat_emily_attachment_test_001',
      participant_id: 'user_rescue_staff_001', // Sarah Johnson from Paws Rescue (using existing staff member)
      role: ParticipantRole.RESCUE,
      last_read_at: new Date('2024-07-20T16:25:00Z'),
      created_at: new Date('2024-07-20T10:00:00Z'),
      updated_at: new Date('2024-07-20T16:25:00Z'),
    },
  ],

  // Messages with various file attachments
  messages: [
    {
      message_id: 'msg_attachment_test_001',
      chat_id: 'chat_emily_attachment_test_001',
      sender_id: 'user_adopter_002', // Emily Davis
      content:
        'Hi! Here are some photos of my current living space for the home visit preparation.',
      content_format: MessageContentFormat.PLAIN,
      attachments: [
        {
          attachment_id: 'att_living_room_001',
          filename: 'emily-attachment-test-living-room.jpg',
          originalName: 'living-room-setup.jpg',
          mimeType: 'image/jpeg',
          size: 293,
          url: '/uploads/chat/emily-attachment-test-living-room.jpg',
        },
        {
          attachment_id: 'att_backyard_001',
          filename: 'emily-attachment-test-backyard.jpg',
          originalName: 'backyard-fence.jpg',
          mimeType: 'image/jpeg',
          size: 354,
          url: '/uploads/chat/emily-attachment-test-backyard.jpg',
        },
      ],
      is_read: true,
      created_at: new Date('2024-07-20T10:00:00Z'),
      updated_at: new Date('2024-07-20T10:00:00Z'),
    },
    {
      message_id: 'msg_attachment_test_002',
      chat_id: 'chat_emily_attachment_test_001',
      sender_id: 'user_rescue_staff_001', // Sarah Johnson
      content:
        "Thanks Emily! Those photos look great. Here's our adoption contract for you to review.",
      content_format: MessageContentFormat.PLAIN,
      attachments: [
        {
          attachment_id: 'att_contract_001',
          filename: 'emily-attachment-test-contract.pdf',
          originalName: 'adoption-contract.pdf',
          mimeType: 'application/pdf',
          size: 833,
          url: '/uploads/chat/emily-attachment-test-contract.pdf',
        },
      ],
      is_read: true,
      created_at: new Date('2024-07-20T11:30:00Z'),
      updated_at: new Date('2024-07-20T11:30:00Z'),
    },
    {
      message_id: 'msg_attachment_test_003',
      chat_id: 'chat_emily_attachment_test_001',
      sender_id: 'user_adopter_002', // Emily Davis
      content:
        "I've reviewed the contract and signed it. Here's the completed document back to you.",
      content_format: MessageContentFormat.PLAIN,
      attachments: [
        {
          attachment_id: 'att_signed_contract_001',
          filename: 'emily-attachment-test-signed-contract.pdf',
          originalName: 'signed-adoption-contract.pdf',
          mimeType: 'application/pdf',
          size: 856,
          url: '/uploads/chat/emily-attachment-test-signed-contract.pdf',
        },
      ],
      is_read: true,
      created_at: new Date('2024-07-20T13:15:00Z'),
      updated_at: new Date('2024-07-20T13:15:00Z'),
    },
    {
      message_id: 'msg_attachment_test_004',
      chat_id: 'chat_emily_attachment_test_001',
      sender_id: 'user_rescue_staff_001', // Sarah Johnson
      content:
        'Perfect! Here are some recent photos of Buddy to get you excited about the adoption.',
      content_format: MessageContentFormat.PLAIN,
      attachments: [
        {
          attachment_id: 'att_buddy_playing_001',
          filename: 'emily-attachment-test-buddy-playing.jpg',
          originalName: 'buddy-playing.jpg',
          mimeType: 'image/jpeg',
          size: 313,
          url: '/uploads/chat/emily-attachment-test-buddy-playing.jpg',
        },
        {
          attachment_id: 'att_buddy_sleeping_001',
          filename: 'emily-attachment-test-buddy-sleeping.jpg',
          originalName: 'buddy-sleeping.jpg',
          mimeType: 'image/jpeg',
          size: 298,
          url: '/uploads/chat/emily-attachment-test-buddy-sleeping.jpg',
        },
      ],
      is_read: true,
      created_at: new Date('2024-07-20T14:45:00Z'),
      updated_at: new Date('2024-07-20T14:45:00Z'),
    },
    {
      message_id: 'msg_attachment_test_005',
      chat_id: 'chat_emily_attachment_test_001',
      sender_id: 'user_adopter_002', // Emily Davis
      content:
        "He's adorable! Here's a photo of the dog bed and toys I've already prepared for him.",
      content_format: MessageContentFormat.PLAIN,
      attachments: [
        {
          attachment_id: 'att_dog_bed_001',
          filename: 'emily-attachment-test-dog-bed.jpg',
          originalName: 'dog-bed-setup.jpg',
          mimeType: 'image/jpeg',
          size: 282,
          url: '/uploads/chat/emily-attachment-test-dog-bed.jpg',
        },
      ],
      is_read: true,
      created_at: new Date('2024-07-20T15:30:00Z'),
      updated_at: new Date('2024-07-20T15:30:00Z'),
    },
    {
      message_id: 'msg_attachment_test_006',
      chat_id: 'chat_emily_attachment_test_001',
      sender_id: 'user_rescue_staff_001', // Sarah Johnson
      content: "Wonderful preparation! Here's Buddy's veterinary records and care instructions.",
      content_format: MessageContentFormat.PLAIN,
      attachments: [
        {
          attachment_id: 'att_vet_records_001',
          filename: 'emily-attachment-test-vet-records.pdf',
          originalName: 'buddy-vet-records.pdf',
          mimeType: 'application/pdf',
          size: 857,
          url: '/uploads/chat/emily-attachment-test-vet-records.pdf',
        },
        {
          attachment_id: 'att_care_instructions_001',
          filename: 'emily-attachment-test-care-instructions.pdf',
          originalName: 'buddy-care-instructions.pdf',
          mimeType: 'application/pdf',
          size: 888,
          url: '/uploads/chat/emily-attachment-test-care-instructions.pdf',
        },
      ],
      is_read: false,
      created_at: new Date('2024-07-20T16:25:00Z'),
      updated_at: new Date('2024-07-20T16:25:00Z'),
    },
  ],

  // File attachments for testing different file types
  attachments: [
    {
      upload_id: uuidv4(),
      original_filename: 'living-room-setup.jpg',
      stored_filename: 'emily-attachment-test-living-room.jpg',
      file_path: 'uploads/chat/emily-attachment-test-living-room.jpg',
      file_size: 293,
      mime_type: 'image/jpeg',
      url: '/uploads/chat/emily-attachment-test-living-room.jpg',
      uploaded_by: 'user_adopter_002', // Emily Davis
      entity_type: 'chat',
      entity_id: 'chat_emily_attachment_test_001',
      purpose: 'chat_attachment',
      metadata: {
        description: 'Photo of living room setup for new dog',
        attachedToMessage: 'msg_attachment_test_001',
      },
      created_at: new Date('2024-07-20T10:02:00Z'),
      updated_at: new Date('2024-07-20T10:02:00Z'),
    },
    {
      upload_id: uuidv4(),
      original_filename: 'backyard-fence.jpg',
      stored_filename: 'emily-attachment-test-backyard.jpg',
      file_path: 'uploads/chat/emily-attachment-test-backyard.jpg',
      file_size: 354,
      mime_type: 'image/jpeg',
      url: '/uploads/chat/emily-attachment-test-backyard.jpg',
      uploaded_by: 'user_adopter_002', // Emily Davis
      entity_type: 'chat',
      entity_id: 'chat_emily_attachment_test_001',
      purpose: 'chat_attachment',
      metadata: {
        description: 'Photo of secure backyard fence',
        attachedToMessage: 'msg_attachment_test_001',
      },
      created_at: new Date('2024-07-20T10:03:00Z'),
      updated_at: new Date('2024-07-20T10:03:00Z'),
    },
    {
      upload_id: uuidv4(),
      original_filename: 'adoption-contract.pdf',
      stored_filename: 'emily-attachment-test-contract.pdf',
      file_path: 'uploads/chat/emily-attachment-test-contract.pdf',
      file_size: 833,
      mime_type: 'application/pdf',
      url: '/uploads/chat/emily-attachment-test-contract.pdf',
      uploaded_by: 'user_rescue_staff_001', // Sarah Johnson
      entity_type: 'chat',
      entity_id: 'chat_emily_attachment_test_001',
      purpose: 'chat_attachment',
      metadata: {
        description: 'Adoption contract document',
        attachedToMessage: 'msg_attachment_test_002',
      },
      created_at: new Date('2024-07-20T11:32:00Z'),
      updated_at: new Date('2024-07-20T11:32:00Z'),
    },
    {
      upload_id: uuidv4(),
      original_filename: 'signed-adoption-contract.pdf',
      stored_filename: 'emily-attachment-test-signed-contract.pdf',
      file_path: 'uploads/chat/emily-attachment-test-signed-contract.pdf',
      file_size: 856,
      mime_type: 'application/pdf',
      url: '/uploads/chat/emily-attachment-test-signed-contract.pdf',
      uploaded_by: 'user_adopter_002', // Emily Davis
      entity_type: 'chat',
      entity_id: 'chat_emily_attachment_test_001',
      purpose: 'chat_attachment',
      metadata: {
        description: 'Completed and signed adoption contract',
        attachedToMessage: 'msg_attachment_test_003',
      },
      created_at: new Date('2024-07-20T13:17:00Z'),
      updated_at: new Date('2024-07-20T13:17:00Z'),
    },
    {
      upload_id: uuidv4(),
      original_filename: 'buddy-playing.jpg',
      stored_filename: 'emily-attachment-test-buddy-playing.jpg',
      file_path: 'uploads/chat/emily-attachment-test-buddy-playing.jpg',
      file_size: 313,
      mime_type: 'image/jpeg',
      url: '/uploads/chat/emily-attachment-test-buddy-playing.jpg',
      uploaded_by: 'user_rescue_staff_001', // Sarah Johnson
      entity_type: 'chat',
      entity_id: 'chat_emily_attachment_test_001',
      purpose: 'chat_attachment',
      metadata: {
        description: 'Photo of Buddy playing in the yard',
        attachedToMessage: 'msg_attachment_test_004',
      },
      created_at: new Date('2024-07-20T14:47:00Z'),
      updated_at: new Date('2024-07-20T14:47:00Z'),
    },
    {
      upload_id: uuidv4(),
      original_filename: 'buddy-sleeping.jpg',
      stored_filename: 'emily-attachment-test-buddy-sleeping.jpg',
      file_path: 'uploads/chat/emily-attachment-test-buddy-sleeping.jpg',
      file_size: 298,
      mime_type: 'image/jpeg',
      url: '/uploads/chat/emily-attachment-test-buddy-sleeping.jpg',
      uploaded_by: 'user_rescue_staff_001', // Sarah Johnson
      entity_type: 'chat',
      entity_id: 'chat_emily_attachment_test_001',
      purpose: 'chat_attachment',
      metadata: {
        description: 'Photo of Buddy taking a nap',
        attachedToMessage: 'msg_attachment_test_004',
      },
      created_at: new Date('2024-07-20T14:48:00Z'),
      updated_at: new Date('2024-07-20T14:48:00Z'),
    },
    {
      upload_id: uuidv4(),
      original_filename: 'dog-bed-setup.jpg',
      stored_filename: 'emily-attachment-test-dog-bed.jpg',
      file_path: 'uploads/chat/emily-attachment-test-dog-bed.jpg',
      file_size: 282,
      mime_type: 'image/jpeg',
      url: '/uploads/chat/emily-attachment-test-dog-bed.jpg',
      uploaded_by: 'user_adopter_002', // Emily Davis
      entity_type: 'chat',
      entity_id: 'chat_emily_attachment_test_001',
      purpose: 'chat_attachment',
      metadata: {
        description: 'Photo of prepared dog bed and toy area',
        attachedToMessage: 'msg_attachment_test_005',
      },
      created_at: new Date('2024-07-20T15:32:00Z'),
      updated_at: new Date('2024-07-20T15:32:00Z'),
    },
    {
      upload_id: uuidv4(),
      original_filename: 'buddy-vet-records.pdf',
      stored_filename: 'emily-attachment-test-vet-records.pdf',
      file_path: 'uploads/chat/emily-attachment-test-vet-records.pdf',
      file_size: 857,
      mime_type: 'application/pdf',
      url: '/uploads/chat/emily-attachment-test-vet-records.pdf',
      uploaded_by: 'user_rescue_staff_001', // Sarah Johnson
      entity_type: 'chat',
      entity_id: 'chat_emily_attachment_test_001',
      purpose: 'chat_attachment',
      metadata: {
        description: "Buddy's complete veterinary records",
        attachedToMessage: 'msg_attachment_test_006',
      },
      created_at: new Date('2024-07-20T16:26:00Z'),
      updated_at: new Date('2024-07-20T16:26:00Z'),
    },
    {
      upload_id: uuidv4(),
      original_filename: 'buddy-care-instructions.pdf',
      stored_filename: 'emily-attachment-test-care-instructions.pdf',
      file_path: 'uploads/chat/emily-attachment-test-care-instructions.pdf',
      file_size: 888,
      mime_type: 'application/pdf',
      url: '/uploads/chat/emily-attachment-test-care-instructions.pdf',
      uploaded_by: 'user_rescue_staff_001', // Sarah Johnson
      entity_type: 'chat',
      entity_id: 'chat_emily_attachment_test_001',
      purpose: 'chat_attachment',
      metadata: {
        description: 'Daily care instructions and feeding schedule for Buddy',
        attachedToMessage: 'msg_attachment_test_006',
      },
      created_at: new Date('2024-07-20T16:27:00Z'),
      updated_at: new Date('2024-07-20T16:27:00Z'),
    },
  ],
};

export async function seedEmilyAttachmentTest() {
  try {
    // Create the chat
    await Chat.findOrCreate({
      where: { chat_id: emilyAttachmentTestData.chat.chat_id },
      defaults: emilyAttachmentTestData.chat,
    });

    // Create chat participants
    for (const participant of emilyAttachmentTestData.participants) {
      await ChatParticipant.findOrCreate({
        where: {
          chat_id: participant.chat_id,
          participant_id: participant.participant_id,
        },
        defaults: participant,
      });
    }

    // Create messages
    for (const message of emilyAttachmentTestData.messages) {
      await Message.findOrCreate({
        where: { message_id: message.message_id },
        defaults: message,
      });
    }

    // Create file attachments
    for (const attachment of emilyAttachmentTestData.attachments) {
      await FileUpload.findOrCreate({
        where: { stored_filename: attachment.stored_filename },
        defaults: attachment,
      });
    }

    // eslint-disable-next-line no-console
    console.log('✅ Created Emily Davis attachment test conversation');
    // eslint-disable-next-line no-console
    console.log(`   - Chat ID: ${emilyAttachmentTestData.chat.chat_id}`);
    // eslint-disable-next-line no-console
    console.log(`   - Participants: ${emilyAttachmentTestData.participants.length}`);
    // eslint-disable-next-line no-console
    console.log(`   - Messages: ${emilyAttachmentTestData.messages.length}`);
    // eslint-disable-next-line no-console
    console.log(`   - Attachments: ${emilyAttachmentTestData.attachments.length}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Error creating Emily attachment test conversation:', error);
    throw error;
  }
}

// Allow this seeder to be run independently
if (require.main === module) {
  seedEmilyAttachmentTest()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('🎉 Emily attachment test conversation seeding completed successfully!');
      throw new Error('Seeding completed - exiting process');
    })
    .catch(error => {
      // eslint-disable-next-line no-console
      console.error('💥 Emily attachment test conversation seeding failed:', error);
      throw error;
    });
}
