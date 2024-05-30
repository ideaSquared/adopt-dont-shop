import React from 'react';

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
		<div className='flex justify-center items-center space-x-2 mt-4'>
			<button
				onClick={goToFirstPage}
				disabled={currentPage === 1}
				className={`px-3 py-2 rounded-md ${
					currentPage === 1
						? 'bg-gray-300 cursor-not-allowed'
						: 'bg-indigo-500 text-white hover:bg-indigo-600'
				}`}
			>
				First
			</button>
			<button
				onClick={goToPreviousPage}
				disabled={currentPage === 1}
				className={`px-3 py-2 rounded-md ${
					currentPage === 1
						? 'bg-gray-300 cursor-not-allowed'
						: 'bg-indigo-500 text-white hover:bg-indigo-600'
				}`}
			>
				Previous
			</button>
			<span className='px-3 py-2 text-gray-700'>
				{`Page ${currentPage} of ${totalPages}`}
			</span>
			<button
				onClick={goToNextPage}
				disabled={currentPage >= totalPages}
				className={`px-3 py-2 rounded-md ${
					currentPage >= totalPages
						? 'bg-gray-300 cursor-not-allowed'
						: 'bg-indigo-500 text-white hover:bg-indigo-600'
				}`}
			>
				Next
			</button>
			<button
				onClick={goToLastPage}
				disabled={currentPage >= totalPages}
				className={`px-3 py-2 rounded-md ${
					currentPage >= totalPages
						? 'bg-gray-300 cursor-not-allowed'
						: 'bg-indigo-500 text-white hover:bg-indigo-600'
				}`}
			>
				Last
			</button>
		</div>
	);
};

export default PaginationControls;
