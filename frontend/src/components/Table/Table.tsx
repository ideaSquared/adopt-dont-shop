import React, { ReactElement, useState } from 'react'
import styled, { css } from 'styled-components'

interface StyledTableProps {
  children: React.ReactNode
  striped?: boolean
  hasActions?: boolean
  rowsPerPage?: number
}

interface TablePaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

const StyledTable = styled.table<StyledTableProps>`
  width: 100%;
  margin-bottom: 1rem;
  color: ${(props) => props.theme.text.body};
  border-collapse: collapse;
  border: 1px solid ${(props) => props.theme.border.content};

  th,
  td {
    padding: 0.75rem;
    text-align: left;
  }

  th {
    background-color: ${(props) => props.theme.background.content};
  }

  ${(props) =>
    props.striped &&
    css`
      tr:nth-child(even) {
        background-color: ${props.theme.background.contrast};
      }
    `}

  tr:hover {
    background-color: ${(props) => props.theme.background.mouseHighlight};
  }

  ${(props) =>
    props.hasActions &&
    css`
      td:last-child {
        display: flex;
        gap: 0.5rem;
      }
    `}
`

const PaginationWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 1rem;
  flex-wrap: wrap;
`

const PageButton = styled.button<{ active?: boolean }>`
  margin: 0 0.25rem;
  padding: 0.5rem 0.75rem;
  background-color: ${(props) =>
    props.active ? props.theme.background.content : 'transparent'};
  border: 1px solid ${(props) => props.theme.border.content};
  cursor: pointer;
  min-width: 40px;

  &:hover {
    background-color: ${(props) => props.theme.background.hover};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`

const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const pageNeighbors = 2 // Number of pages to show on either side of the current page
  const totalPageNumbers = pageNeighbors * 2 + 3 // Pages + "First", "Last" + current page

  const range = (from: number, to: number, step = 1) => {
    let i = from
    const range = []

    while (i <= to) {
      range.push(i)
      i += step
    }

    return range
  }

  const paginationRange = (): (number | string)[] => {
    const startPage = Math.max(2, currentPage - pageNeighbors)
    const endPage = Math.min(totalPages - 1, currentPage + pageNeighbors)
    const pages: (number | string)[] = range(startPage, endPage)

    if (currentPage > pageNeighbors + 2) {
      pages.unshift('...')
      pages.unshift(1)
    } else {
      pages.unshift(...range(1, startPage - 1))
    }

    if (currentPage < totalPages - pageNeighbors - 1) {
      pages.push('...')
      pages.push(totalPages)
    } else {
      pages.push(...range(endPage + 1, totalPages))
    }

    return pages
  }

  const handlePageClick = (page: number | string) => {
    if (typeof page === 'number') {
      onPageChange(page)
    }
  }

  return (
    <PaginationWrapper>
      <PageButton
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </PageButton>
      {paginationRange().map((page, index) =>
        typeof page === 'string' ? (
          <span
            key={index}
            style={{ margin: '0 0.25rem', padding: '0.5rem 0.75rem' }}
          >
            ...
          </span>
        ) : (
          <PageButton
            key={index}
            active={page === currentPage}
            onClick={() => handlePageClick(page)}
          >
            {page}
          </PageButton>
        ),
      )}
      <PageButton
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </PageButton>
    </PaginationWrapper>
  )
}

const Table: React.FC<StyledTableProps> = ({
  children,
  striped = false,
  hasActions = false,
  rowsPerPage = 10,
}) => {
  const [currentPage, setCurrentPage] = useState(1)

  // Separate the children into <thead>, <tbody>, and any other potential elements
  const thead = React.Children.toArray(children).find(
    (child) => (child as ReactElement).type === 'thead',
  )
  const tbody = React.Children.toArray(children).find(
    (child) => (child as ReactElement).type === 'tbody',
  ) as ReactElement
  const otherElements = React.Children.toArray(children).filter(
    (child) =>
      (child as ReactElement).type !== 'thead' &&
      (child as ReactElement).type !== 'tbody',
  )

  if (!tbody) {
    throw new Error('Table component expects a <tbody> element.')
  }

  const rows = React.Children.toArray(tbody.props.children) as ReactElement[]
  const totalPages = Math.ceil(rows.length / rowsPerPage)

  const displayedRows = rows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  )

  return (
    <>
      <StyledTable striped={striped} hasActions={hasActions}>
        {thead}
        <tbody>{displayedRows}</tbody>
        {otherElements}
      </StyledTable>
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </>
  )
}

export default Table
