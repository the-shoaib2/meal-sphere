# MealSphere API - Postman Collection

This folder contains a complete Postman collection for testing all MealSphere API endpoints.

## 📦 Import to Postman

1. Open Postman
2. Click **Import** button (top left)
3. Select the file: `MealSphere-API.postman_collection.json`
4. Click **Import**

## 🔐 Authentication Setup

### Step 1: Set Base URL
The collection uses a variable `{{baseUrl}}` which defaults to `http://localhost:3000`. 

To change it:
1. Click on the collection name
2. Go to **Variables** tab
3. Update `baseUrl` value (e.g., `https://your-production-url.com`)

### Step 2: Get Authentication Token

MealSphere uses **NextAuth.js** for authentication. To get a token:

#### Option A: Using the Application
1. Start your Next.js app: `npm run dev`
2. Register or login through the web interface
3. Open browser DevTools → Application → Cookies
4. Find the cookie named `next-auth.session-token` (or `__Secure-next-auth.session-token` in production)
5. Copy the cookie value

#### Option B: Using Postman (Register → Login)
1. Use the **Register User** endpoint to create an account
2. Get CAPTCHA first using **Get CAPTCHA** endpoint
3. Complete registration
4. Login through the web interface to get the session token

### Step 3: Set Auth Token in Postman
1. Click on the collection name
2. Go to **Variables** tab
3. Paste your session token in the `authToken` variable (both Initial Value and Current Value)
4. Save the collection

**Note:** The collection is configured to use Bearer token authentication. All authenticated endpoints will automatically include the token in the `Authorization` header.

## 📋 Collection Structure

The collection is organized into the following categories:

### 1. **Authentication**
- Register User
- Get CAPTCHA
- Forgot Password
- Logout
- Get Sessions
- Revoke All Sessions

### 2. **Groups** (Rooms)
- Get All Groups
- Create Group
- Get Group by ID
- Update Group
- Delete Group
- Leave Group
- Send Invite
- Join Requests Management

### 3. **Meals**
- Get Meals
- Create/Toggle Meal
- Get Meal by ID
- Meal Settings (Get/Update)
- Guest Meals (Get/Create)

### 4. **Expenses**
- Get Expenses
- Create Expense (with file upload)
- Get/Update/Delete Expense by ID

### 5. **Payments**
- Get Payments
- Create Payment
- bKash Integration (Create/Execute)

### 6. **User**
- Get/Update Profile
- Change Password
- Update Language
- Check User Exists

### 7. **Dashboard**
- Get Unified Dashboard
- Get Chart Data
- Get Activities

### 8. **Notifications**
- Get Notifications
- Mark as Read
- Mark All as Read

### 9. **Periods**
- Get Periods
- Create Period
- Get Current Period

### 10. **Shopping**
- Get Shopping List
- Add Shopping Item
- Clear Purchased Items

### 11. **Analytics**
- Get Analytics
- Get User Rooms Analytics

### 12. **Account Balance**
- Get Account Balance
- Get Transactions

### 13. **Excel**
- Export Meals/Payments
- Import Meals

## 🎯 Usage Tips

### Using Variables
The collection includes these variables:
- `{{baseUrl}}` - API base URL (default: http://localhost:3000)
- `{{authToken}}` - Authentication token
- `{{groupId}}` - Current group/room ID for testing
- `{{userId}}` - User ID for testing

To set `groupId` and `userId`:
1. Create a group using **Create Group** endpoint
2. Copy the `id` from the response
3. Set it in the collection variables

### Testing Workflow

1. **Setup**
   - Get CAPTCHA
   - Register a new user
   - Login and get session token
   - Set the token in collection variables

2. **Create Resources**
   - Create a Group
   - Set `groupId` variable
   - Create meals, expenses, etc.

3. **Test Endpoints**
   - All endpoints are ready to use
   - Path variables (like `:id`) need to be replaced with actual IDs
   - Query parameters are pre-configured

### File Uploads
Some endpoints require file uploads (e.g., Create Expense with receipt):
- The request body is set to `form-data`
- Select a file for the `receipt` field
- Other fields are already configured

## 🔒 Authentication Notes

- **Public Endpoints**: CAPTCHA, Register, Check User Exists, Public content endpoints
- **Protected Endpoints**: All other endpoints require authentication
- **Session Management**: Sessions are managed by NextAuth.js
- **Token Expiry**: If you get 401 errors, refresh your session token

## 🌐 Environment Variables

The application uses these environment variables (from `.env`):

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret
DATABASE_URL=your-mongodb-url
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Make sure your local environment is properly configured before testing.

## 📝 Request Examples

### Create a Group
```json
{
  "name": "My Meal Group",
  "description": "Group for tracking meals",
  "isPrivate": false,
  "maxMembers": 20
}
```

### Add a Meal
```json
{
  "roomId": "your-group-id",
  "date": "2026-01-17",
  "type": "LUNCH"
}
```

### Create an Expense
Use form-data:
- `roomId`: your-group-id
- `description`: Groceries
- `amount`: 500
- `date`: 2026-01-17
- `type`: GROCERIES
- `receipt`: [file upload]

## 🐛 Troubleshooting

### 401 Unauthorized
- Verify your `authToken` is set correctly
- Check if the session token is still valid
- Try logging in again to get a fresh token

### 403 Forbidden
- Ensure you're a member of the group/room
- Check if you have the required permissions

### 400 Bad Request
- Verify all required fields are provided
- Check the request body format
- Ensure date formats are correct (YYYY-MM-DD)

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Postman Documentation](https://learning.postman.com/)

## 🤝 Support

For issues or questions:
1. Check the API response error messages
2. Review the backend logs
3. Verify your environment variables
4. Check the database connection

---

**Happy Testing! 🚀**
