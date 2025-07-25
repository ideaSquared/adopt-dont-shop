# 📖 API Documentation Guide

This guide shows you multiple ways to view and interact with your OpenAPI specification for better API development and testing.

## 🚀 Quick Start

### 1. **Integrated Swagger UI** (Recommended)
Your backend already has Swagger UI integrated! 

```bash
# Start your backend server
npm run dev

# Then visit:
http://localhost:5000/api/docs
```

**Features:**
- ✅ Interactive API testing
- ✅ Authentication support
- ✅ Real-time endpoint testing
- ✅ Request/response examples
- ✅ Schema validation

### 2. **VS Code Extensions** (Great for Development)

Install these VS Code extensions:
- **OpenAPI (Swagger) Editor** by 42Crunch
- **REST Client** by Humao
- **Thunder Client** (Postman alternative)

```bash
# Install via VS Code marketplace or command palette:
ext install 42Crunch.vscode-openapi
ext install humao.rest-client
ext install rangav.vscode-thunder-client
```

### 3. **Online Viewers** (Quick Previews)

Upload your `docs/openapi.yaml` to:
- **Swagger Editor**: https://editor.swagger.io/
- **ReDoc**: https://redocly.github.io/redoc/
- **Postman**: Import directly into collections

### 4. **Command Line Tools**

```bash
# Install tools globally
npm install -g @openapitools/openapi-generator-cli
npm install -g redoc-cli
npm install -g swagger-ui-serve

# Serve Swagger UI on port 3001
swagger-ui-serve docs/openapi.yaml -p 3001

# Serve ReDoc on port 3002  
redoc-cli serve docs/openapi.yaml --port 3002

# Validate your OpenAPI spec
openapi-generator-cli validate -i docs/openapi.yaml
```

## 🛠️ Development Workflow

### Testing APIs with Swagger UI

1. **Start your backend**: `npm run dev`
2. **Open Swagger UI**: http://localhost:5000/api/docs
3. **Authenticate**: Click "Authorize" and enter your JWT token
4. **Test endpoints**: Click "Try it out" on any endpoint
5. **View responses**: See real API responses and schemas

### Using VS Code REST Client

Create `.http` files for quick API testing:

```http
### Login
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}

### Get pets (authenticated)
GET http://localhost:5000/api/v1/pets
Authorization: Bearer {{auth_token}}
```

### Generating Client SDKs

Generate TypeScript client for your frontend:

```bash
# Generate TypeScript client
openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g typescript-axios \
  -o generated/typescript-client

# Generate other clients
openapi-generator-cli list # See all available generators
```

## 🎨 Customizing Documentation

### Update OpenAPI Spec

Edit `docs/openapi.yaml` to:
- Add new endpoints
- Update schemas
- Add examples
- Modify descriptions

### Custom Swagger UI Styling

The Swagger UI is already customized with your brand colors in `src/config/swagger.ts`.

### Adding Examples

```yaml
# In your OpenAPI spec
paths:
  /api/v1/pets:
    get:
      responses:
        '200':
          content:
            application/json:
              example:
                success: true
                pets: [...]
```

## 🔧 Advanced Features

### Authentication in Swagger UI

Your Swagger UI supports JWT authentication:
1. Click the "Authorize" button
2. Enter: `Bearer YOUR_JWT_TOKEN`
3. All subsequent requests will include the token

### API Mocking

Use tools like Prism to mock your API:

```bash
npm install -g @stoplight/prism-cli
prism mock docs/openapi.yaml
```

### Documentation Generation

Generate beautiful static docs:

```bash
# Generate ReDoc static HTML
redoc-cli build docs/openapi.yaml --output docs/api-documentation.html

# Generate Swagger UI static files
swagger-codegen generate -i docs/openapi.yaml -l html2 -o docs/swagger-static
```

## 📱 Mobile & Desktop Apps

### Postman Integration

1. **Import OpenAPI**: File → Import → Upload `openapi.yaml`
2. **Auto-generate collection**: Postman creates all endpoints
3. **Environment variables**: Set base URL and auth tokens
4. **Team collaboration**: Share collections with your team

### Insomnia Integration

1. **Import spec**: Import → From File → Select `openapi.yaml`
2. **Environment setup**: Configure base URLs for dev/staging/prod
3. **Authentication**: Set up OAuth 2.0 or Bearer token auth

## 🎯 Best Practices

### Keep Documentation Updated

1. **Update OpenAPI spec** when adding new endpoints
2. **Add examples** for complex request/response bodies
3. **Document error responses** with proper status codes
4. **Use clear descriptions** for parameters and schemas

### Version Management

```yaml
info:
  version: "1.0.0"  # Update when making breaking changes
servers:
  - url: http://localhost:5000
    description: Development
  - url: https://api-staging.adoptdontshop.com
    description: Staging  
  - url: https://api.adoptdontshop.com
    description: Production
```

### Schema Validation

Use your OpenAPI spec for:
- **Request validation** in middleware
- **Response validation** in tests
- **Client generation** for type safety
- **Mock data generation** for testing

## 🚀 Pro Tips

1. **Live Reload**: Use `nodemon` to restart server when OpenAPI changes
2. **Schema First**: Design your API in OpenAPI before coding
3. **Testing**: Use generated schemas for automated testing
4. **Documentation**: Auto-generate client libraries and docs
5. **Validation**: Validate requests/responses against your spec

## 📚 Additional Resources

- **OpenAPI Specification**: https://swagger.io/specification/
- **Swagger UI**: https://swagger.io/tools/swagger-ui/
- **ReDoc**: https://redocly.github.io/redoc/
- **OpenAPI Generator**: https://openapi-generator.tech/
- **Best Practices**: https://swagger.io/resources/articles/best-practices-in-api-design/

---

🎉 **Your API documentation is now professional, interactive, and developer-friendly!**
