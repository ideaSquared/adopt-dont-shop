import React from 'react';
import { Form, Row, Col } from 'react-bootstrap';

const SearchFilterForm = ({ searchTerm, setSearchTerm, filterCriteria, setFilterCriteria }) => {
  return (
    <Row className='mb-3'>
      <Col md={6}>
        <Form.Control
          type='text'
          placeholder='Search by pet name...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Col>
      <Col md={6}>
        <Form.Select
          value={filterCriteria}
          onChange={(e) => setFilterCriteria(e.target.value)}
        >
          <option value=''>All Criteria</option>
          <option value='like'>Like</option>
          <option value='love'>Love</option>
        </Form.Select>
      </Col>
    </Row>
  );
};

export default SearchFilterForm;
