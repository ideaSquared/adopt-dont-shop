# 📧 Email Provider Endpoints (Development)

## 🎯 Quick Access to Ethereal Email Testing

In development mode, you have several ways to access your Ethereal email test account:

### 📊 **Visual Dashboard Integration**
- **URL:** `http://localhost:3000/monitoring/dashboard`
- **Features:** 
  - Login credentials displayed directly in the UI
  - Quick access buttons to Ethereal login and messages
  - Pro tips for email testing workflow

### 🔗 **API Endpoints**

#### Main API (Available to Frontend)
```
GET /api/v1/email/provider-info
```
**Response:**
```json
{
  "provider": "ethereal",
  "user": "generated_username@ethereal.email", 
  "password": "generated_password",
  "webUrl": "https://ethereal.email",
  "inboxUrl": "https://ethereal.email/messages",
  "loginUrl": "https://ethereal.email/login",
  "messagesUrl": "https://ethereal.email/messages",
  "instructions": {
    "step1": "Copy the username and password above",
    "step2": "Click 'Login to Ethereal' or go to https://ethereal.email/login", 
    "step3": "Use the credentials to log in and view all test emails",
    "step4": "Check console logs for direct preview links when emails are sent"
  }
}
```

#### Monitoring API (Development Dashboard)
```
GET /monitoring/api/email/provider-info
```
Same response format, used by the monitoring dashboard.

### 🔧 **How Email Testing Works**

1. **Automatic Account Creation**: Ethereal creates a unique test account when the server starts
2. **Email Capture**: All emails sent by your app are captured in this test account
3. **Preview Links**: Check server console for direct preview URLs: `📧 Preview Email: https://ethereal.email/message/...`
4. **Web Access**: Use the credentials to log into https://ethereal.email and view all messages

### 💡 **Integration Examples**

#### React Component (Frontend)
```tsx
const [emailProvider, setEmailProvider] = useState(null);

useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    fetch('/api/v1/email/provider-info')
      .then(res => res.json())
      .then(data => setEmailProvider(data));
  }
}, []);

// Display login info in your admin UI
{emailProvider && (
  <div className="email-testing-panel">
    <h5>📧 Email Testing</h5>
    <p>Username: <code>{emailProvider.user}</code></p>
    <p>Password: <code>{emailProvider.password}</code></p>
    <a href={emailProvider.loginUrl} target="_blank" className="btn btn-primary">
      Login to Ethereal
    </a>
  </div>
)}
```

#### Admin Dashboard Integration
```tsx
// Add to your admin dashboard sidebar or header
<NavItem>
  <NavLink href="/admin/email-testing">
    📧 Email Testing
  </NavLink>
</NavItem>
```

### 🚀 **Benefits**

✅ **Zero Configuration** - Credentials generated automatically  
✅ **No External Services** - All emails captured in test environment  
✅ **Easy Access** - Multiple ways to get login info  
✅ **Visual Integration** - Embedded in monitoring dashboard  
✅ **Frontend Ready** - API endpoints for React/Vue integration  
✅ **Production Safe** - Only available in development mode  

### 🔒 **Security Note**

These endpoints are **only available when `NODE_ENV=development`**. In production, they return empty responses to prevent credential exposure. 