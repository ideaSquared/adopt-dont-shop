import React from 'react';
import { Form, Button, InputGroup } from 'react-bootstrap';

const MessageInput = ({
	message,
	setMessage,
	canCreateMessages,
	handleSend,
}) => (
	<Form className='mt-auto p-3' onSubmit={handleSend}>
		<InputGroup className='mb-3'>
			<Form.Control
				as='textarea'
				placeholder='Enter message'
				value={message}
				onChange={(e) => setMessage(e.target.value)}
				style={{ resize: 'none' }}
				disabled={!canCreateMessages}
			/>
			<Button variant='secondary' type='submit' disabled={!canCreateMessages}>
				Send
			</Button>
		</InputGroup>
	</Form>
);

export default MessageInput;
