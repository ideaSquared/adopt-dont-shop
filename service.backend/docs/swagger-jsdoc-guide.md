# Swagger JSDoc Best Practices Guide

This guide outlines best practices for writing JSDoc comments that automatically generate comprehensive OpenAPI documentation.

## 📚 Table of Contents

1. [Basic JSDoc Structure](#basic-jsdoc-structure)
2. [Route Documentation](#route-documentation)
3. [Schema References](#schema-references)
4. [Advanced Features](#advanced-features)
5. [Common Patterns](#common-patterns)
6. [Validation & Testing](#validation--testing)

## 🏗️ Basic JSDoc Structure

### Route Template
```typescript
/**
 * @swagger
 * /api/v1/endpoint:
 *   get:
 *     tags: [Tag Name]
 *     summary: Brief description
 *     description: Detailed description
 *     parameters:
 *       - in: query
 *         name: paramName
 *         schema:
 *           type: string
 *         description: Parameter description
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResponseSchema'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *     security:
 *       - bearerAuth: []
 */
router.get('/endpoint', authenticateToken, controller.method);
```

## 🛣️ Route Documentation

### GET Endpoints (List/Search)
```typescript
/**
 * @swagger
 * /api/v1/pets:
 *   get:
 *     tags: [Pet Management]
 *     summary: Search available pets
 *     description: |
 *       Search and filter available pets with pagination support.
 *       Results are sorted by relevance and creation date.
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: "Golden Retriever"
 *         description: Search term for pet name, breed, or description
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [DOG, CAT, RABBIT, BIRD, OTHER]
 *         description: Filter by pet type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Pets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         pets:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Pet'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
```

### POST Endpoints (Create)
```typescript
/**
 * @swagger
 * /api/v1/pets:
 *   post:
 *     tags: [Pet Management]
 *     summary: Add a new pet
 *     description: Create a new pet profile for adoption
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePetRequest'
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/CreatePetRequest'
 *               - type: object
 *                 properties:
 *                   photos:
 *                     type: array
 *                     items:
 *                       type: string
 *                       format: binary
 *                     description: Pet photos (max 10 files, 5MB each)
 *     responses:
 *       201:
 *         description: Pet created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         pet:
 *                           $ref: '#/components/schemas/Pet'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *     security:
 *       - bearerAuth: []
 */
```

### PUT/PATCH Endpoints (Update)
```typescript
/**
 * @swagger
 * /api/v1/pets/{petId}:
 *   put:
 *     tags: [Pet Management]
 *     summary: Update pet information
 *     description: Update all fields of a pet profile
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique pet identifier
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePetRequest'
 *     responses:
 *       200:
 *         description: Pet updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         pet:
 *                           $ref: '#/components/schemas/Pet'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *     security:
 *       - bearerAuth: []
 */
```

### DELETE Endpoints
```typescript
/**
 * @swagger
 * /api/v1/pets/{petId}:
 *   delete:
 *     tags: [Pet Management]
 *     summary: Remove pet from system
 *     description: |
 *       Permanently delete a pet profile. This action cannot be undone.
 *       Only available to rescue staff and admins.
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique pet identifier
 *     responses:
 *       200:
 *         description: Pet deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *     security:
 *       - bearerAuth: []
 */
```

## 🔗 Schema References

### Using Predefined Schemas
```typescript
// Reference existing schemas from swagger-schemas.ts
schema:
  $ref: '#/components/schemas/Pet'

// Combine schemas
schema:
  allOf:
    - $ref: '#/components/schemas/ApiResponse'
    - type: object
      properties:
        data:
          $ref: '#/components/schemas/Pet'

// Array of schemas
schema:
  type: array
  items:
    $ref: '#/components/schemas/Pet'
```

### Inline Schemas (for simple cases)
```typescript
schema:
  type: object
  properties:
    success:
      type: boolean
      example: true
    message:
      type: string
      example: "Operation completed"
  required:
    - success
```

## 🚀 Advanced Features

### Authentication Documentation
```typescript
/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users (Admin only)
 *     description: Retrieve paginated list of all users with admin permissions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
```

### File Upload Documentation
```typescript
/**
 * @swagger
 * /api/v1/pets/{petId}/photos:
 *   post:
 *     tags: [Pet Management]
 *     summary: Upload pet photos
 *     description: Upload one or more photos for a pet
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Photo files (JPEG, PNG, max 5MB each)
 *               captions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional captions for each photo
 *             required:
 *               - photos
 *           encoding:
 *             photos:
 *               contentType: image/jpeg, image/png
 */
```

### Query Parameter Arrays
```typescript
parameters:
  - in: query
    name: types
    schema:
      type: array
      items:
        type: string
        enum: [DOG, CAT, RABBIT, BIRD, OTHER]
    style: form
    explode: false
    description: Filter by multiple pet types (comma-separated)
    example: "DOG,CAT"
```

## 📋 Common Patterns

### Pagination Pattern
```typescript
parameters:
  - in: query
    name: page
    schema:
      type: integer
      minimum: 1
      default: 1
    description: Page number
  - in: query
    name: limit
    schema:
      type: integer
      minimum: 1
      maximum: 100
      default: 20
    description: Items per page
  - in: query
    name: sortBy
    schema:
      type: string
      enum: [createdAt, updatedAt, name]
      default: createdAt
    description: Sort field
  - in: query
    name: sortOrder
    schema:
      type: string
      enum: [asc, desc]
      default: desc
    description: Sort direction
```

### Search Pattern
```typescript
parameters:
  - in: query
    name: q
    schema:
      type: string
      minLength: 2
      maxLength: 100
    description: Search query
  - in: query
    name: filters
    schema:
      type: object
      additionalProperties:
        type: string
    style: deepObject
    explode: true
    description: Additional filters
    example:
      type: "DOG"
      age: "ADULT"
      location: "New York"
```

## ✅ Validation & Testing

### Generate Documentation
```bash
# Generate OpenAPI spec from JSDoc
npm run docs:generate

# Validate JSDoc coverage
npm run docs:validate

# Watch for changes (development)
npm run docs:watch
```

### Check Generated Files
```bash
# View generated YAML
cat docs/generated-openapi.yaml

# View generated JSON
cat docs/generated-openapi.json

# Test endpoints
curl http://localhost:5000/api/docs/swagger.json
```

### Common Issues

1. **Missing Tags**: Every endpoint should have tags for organization
2. **Inconsistent Schemas**: Use references instead of inline definitions
3. **Missing Examples**: Add realistic examples for better UX
4. **Incomplete Error Responses**: Document all possible error scenarios
5. **Missing Authentication**: Specify security requirements clearly

### Best Practices Checklist

- [ ] Every route has comprehensive JSDoc comments
- [ ] All parameters are documented with types and examples
- [ ] Request/response schemas use `$ref` for consistency
- [ ] Error responses reference common error schemas
- [ ] Authentication requirements are specified
- [ ] Tags are used consistently for organization
- [ ] Examples are realistic and helpful
- [ ] Descriptions are clear and informative
- [ ] File uploads include proper multipart configuration
- [ ] Pagination follows consistent patterns

## 🎯 Tips for Better Documentation

1. **Use Descriptive Summaries**: Make them concise but informative
2. **Add Context in Descriptions**: Explain business logic and constraints
3. **Include Realistic Examples**: Use actual data that developers would encounter
4. **Document Edge Cases**: Include error conditions and special scenarios
5. **Keep Schemas DRY**: Use references instead of duplicating definitions
6. **Test Your Documentation**: Use the Swagger UI to test endpoints
7. **Update Regularly**: Keep documentation in sync with code changes

## 🔧 Automated Validation

The system automatically:
- Validates JSDoc syntax during build
- Checks for missing documentation
- Generates warnings for incomplete coverage
- Merges with existing OpenAPI specs
- Provides development endpoints for testing

For questions or improvements to this guide, please reach out to the development team!
