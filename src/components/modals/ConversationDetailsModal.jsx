import React from 'react';
import StatusBadge from '../common/StatusBadge';

const ConversationDetailsModal = ({
	showModal,
	handleClose,
	conversation,
	messages,
	loadingMessages,
}) => {
	return (
		<div
			className={`modal ${
				showModal ? 'block' : 'hidden'
			} fixed inset-0 overflow-y-auto`}
		>
			<div className='modal-overlay' onClick={handleClose}></div>
			<div className='modal-container bg-white w-full max-w-3xl mx-auto rounded shadow-lg z-50 overflow-y-auto'>
				<div className='modal-header border-b py-2'>
					<h3 className='modal-title text-lg font-semibold'>
						Conversation Details
					</h3>
					<button className='modal-close' onClick={handleClose}>
						<span>&times;</span>
					</button>
				</div>
				<div className='modal-body px-4 py-6'>
					{conversation ? (
						<>
							<p>
								<strong>Participants:</strong>{' '}
								{conversation.participant_emails
									.filter(Boolean)
									.map((email, index) => (
										<StatusBadge
											key={index}
											type='conversation'
											value={email}
											caps={false}
										/>
									))}
								{conversation.participant_rescues
									.filter(Boolean)
									.map((rescueName, index) => (
										<StatusBadge
											key={index}
											type='conversation'
											value={rescueName}
											caps={false}
										/>
									))}
							</p>
							<p>
								<strong>Status:</strong>{' '}
								<StatusBadge type='conversation' value={conversation.status} />
							</p>
							<h5>Messages</h5>
							{loadingMessages ? (
								<p>Loading messages...</p>
							) : (
								<table className='table-auto w-full'>
									<thead>
										<tr>
											<th className='border px-4 py-2'>Text</th>
											<th className='border px-4 py-2'>Sent At</th>
											<th className='border px-4 py-2'>Sent By</th>
										</tr>
									</thead>
									<tbody>
										{messages
											.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
											.map((message) => (
												<tr key={message.message_id}>
													<td className='border px-4 py-2'>
														{message.message_text}
													</td>
													<td className='border px-4 py-2'>
														{new Date(message.sent_at).toLocaleString()}
													</td>
													<td className='border px-4 py-2'>
														{message.sender_email || 'Unknown'}
													</td>
												</tr>
											))}
									</tbody>
								</table>
							)}
						</>
					) : (
						<p>Loading conversation details...</p>
					)}
				</div>
				<div className='modal-footer border-t py-4'>
					<button className='btn btn-secondary' onClick={handleClose}>
						Close
					</button>
				</div>
			</div>
		</div>
	);
};

export default ConversationDetailsModal;
