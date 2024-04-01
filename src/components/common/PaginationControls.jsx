// PaginationControls.jsx
import React from 'react';
import { Pagination } from 'react-bootstrap';

const PaginationControls = ({ currentPage, totalPages, onChangePage }) => {
	const goToFirstPage = () => {
		if (currentPage > 1) onChangePage(1);
	};

	const goToPreviousPage = () => {
		if (currentPage > 1) onChangePage(currentPage - 1);
	};

	const goToNextPage = () => {
		if (currentPage < totalPages) onChangePage(currentPage + 1);
	};

	const goToLastPage = () => {
		if (currentPage < totalPages) onChangePage(totalPages);
	};

	return (
		<Pagination className='justify-content-center'>
			<Pagination.First onClick={goToFirstPage} disabled={currentPage === 1} />
			<Pagination.Prev
				onClick={goToPreviousPage}
				disabled={currentPage === 1}
			/>
			{/* Display current page info or potentially dynamic page numbers here */}
			<Pagination.Item
				disabled
			>{`Page ${currentPage} of ${totalPages}`}</Pagination.Item>
			<Pagination.Next
				onClick={goToNextPage}
				disabled={currentPage >= totalPages}
			/>
			<Pagination.Last
				onClick={goToLastPage}
				disabled={currentPage >= totalPages}
			/>
		</Pagination>
	);
};

export default PaginationControls;
