import React from 'react';
import styled from 'styled-components';

interface ModalProps {
	title: string;
	children: React.ReactNode;
	isOpen: boolean;
	onClose: () => void;
}

const StyledModal = styled.div<{ isOpen: boolean }>`
	display: ${(props: { isOpen: boolean }) => (props.isOpen ? 'block' : 'none')};
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0.5);
	z-index: 1050;
`;

const StyledModalDialog = styled.div`
	position: relative;
	width: auto;
	margin: 1.75rem auto;
	pointer-events: none;
	max-width: 500px;
`;

const StyledModalContent = styled.div`
	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
	pointer-events: auto;
	background-color: #fff;
	background-clip: padding-box;
	border: 1px solid rgba(0, 0, 0, 0.2);
	border-radius: 0.3rem;
	outline: 0;
`;

const StyledModalHeader = styled.div`
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	padding: 1rem;
	border-bottom: 1px solid #e9ecef;
	border-top-left-radius: 0.3rem;
	border-top-right-radius: 0.3rem;
`;

const StyledModalBody = styled.div`
	position: relative;
	flex: 1 1 auto;
	padding: 1rem;
`;

const StyledModalFooter = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-end;
	padding: 0.75rem;
	border-top: 1px solid #e9ecef;
	border-bottom-right-radius: 0.3rem;
	border-bottom-left-radius: 0.3rem;
`;

const Modal: React.FC<ModalProps> = ({ title, children, isOpen, onClose }) => {
	if (!isOpen) return null;

	return (
		<StyledModal isOpen={isOpen}>
			<StyledModalDialog role='dialog' aria-labelledby='modal-title'>
				<StyledModalContent>
					<StyledModalHeader>
						<h5 id='modal-title' className='modal-title'>
							{title}
						</h5>
						<button
							type='button'
							className='btn-close'
							aria-label='Close'
							onClick={onClose}
						></button>
					</StyledModalHeader>
					<StyledModalBody>{children}</StyledModalBody>
					<StyledModalFooter>
						<button
							type='button'
							className='btn btn-secondary'
							onClick={onClose}
						>
							Close
						</button>
					</StyledModalFooter>
				</StyledModalContent>
			</StyledModalDialog>
		</StyledModal>
	);
};

export default Modal;
