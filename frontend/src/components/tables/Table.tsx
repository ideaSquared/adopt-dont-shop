import React, { useState, useEffect, ReactNode } from 'react';
import PaginationControls from '../common/PaginationControls';

export interface Column<T> {
	header: string;
	accessor: keyof T | string;
	render?: (row: T) => ReactNode;
}

interface TableProps<T> {
	columns: Column<T>[];
	data: T[];
	rowsPerPage?: number;
}

const Table = <T extends {}>({
	columns,
	data,
	rowsPerPage = 2,
}: TableProps<T>) => {
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);

	useEffect(() => {
		setTotalPages(Math.ceil(data.length / rowsPerPage));
	}, [data.length, rowsPerPage]);

	const handlePageChange = (newPage: number) => {
		setCurrentPage(newPage);
	};

	const indexOfLastRow = currentPage * rowsPerPage;
	const indexOfFirstRow = indexOfLastRow - rowsPerPage;
	const currentRows = data.slice(indexOfFirstRow, indexOfLastRow);

	const renderCellContent = (row: T, column: Column<T>): ReactNode => {
		if (column.render) {
			return column.render(row);
		}

		const cellValue = row[column.accessor as keyof T];
		return typeof cellValue === 'string' ||
			typeof cellValue === 'number' ||
			typeof cellValue === 'boolean' ||
			React.isValidElement(cellValue)
			? cellValue
			: null;
	};

	return (
		<div>
			<table className='min-w-full divide-y divide-gray-200'>
				<thead className='bg-gray-50'>
					<tr>
						{columns.map((column, index) => (
							<th
								key={index}
								className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
							>
								{column.header}
							</th>
						))}
					</tr>
				</thead>
				<tbody className='bg-white divide-y divide-gray-200'>
					{currentRows.map((row, rowIndex) => (
						<tr key={rowIndex}>
							{columns.map((column, colIndex) => (
								<td key={colIndex} className='px-6 py-4 whitespace-nowrap'>
									{renderCellContent(row, column)}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
			<PaginationControls
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={handlePageChange}
			/>
		</div>
	);
};

export default Table;
