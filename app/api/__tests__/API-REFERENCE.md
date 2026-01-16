# MealSphere API - Quick Reference

## Base URL
```
http://localhost:3000
```

## Authentication
All protected endpoints require Bearer token authentication:
```
Authorization: Bearer <your-session-token>
```

---

## 📍 API Endpoints Summary

### Authentication (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| GET | `/api/captcha` | Get CAPTCHA image |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/sessions` | Get user sessions |
| POST | `/api/auth/sessions/revoke-all` | Revoke all sessions |

### Groups (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/groups` | Get all user groups |
| POST | `/api/groups` | Create new group |
| GET | `/api/groups/:id` | Get group details |
| PATCH | `/api/groups/:id` | Update group |
| DELETE | `/api/groups/:id` | Delete group |
| POST | `/api/groups/:id/leave` | Leave group |
| POST | `/api/groups/:id/send-invite` | Send group invite |
| GET | `/api/groups/:id/join-request` | Get join requests |
| POST | `/api/groups/:id/join-request` | Create join request |
| PATCH | `/api/groups/:id/join-request/:requestId` | Approve/reject request |
| GET | `/api/groups/:id/members/me` | Get my membership |
| PATCH | `/api/groups/:id/members/:memberId/role` | Update member role |
| DELETE | `/api/groups/:id/members/:memberId` | Remove member |

### Meals (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meals?roomId=:id` | Get meals for room |
| POST | `/api/meals` | Create/toggle meal |
| GET | `/api/meals/:id` | Get meal by ID |
| DELETE | `/api/meals/:id` | Delete meal |
| GET | `/api/meals/settings?roomId=:id` | Get meal settings |
| POST | `/api/meals/settings` | Update meal settings |
| GET | `/api/meals/guest?roomId=:id` | Get guest meals |
| POST | `/api/meals/guest` | Create guest meal |
| DELETE | `/api/meals/guest/:id` | Delete guest meal |
| GET | `/api/meals/unified?roomId=:id` | Get unified meal data |
| GET | `/api/meals/user-stats?roomId=:id` | Get user meal stats |

### Expenses (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/expenses?roomId=:id` | Get expenses |
| POST | `/api/expenses` | Create expense (multipart) |
| GET | `/api/expenses/:id` | Get expense by ID |
| PATCH | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |

### Payments (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments?roomId=:id` | Get payments |
| POST | `/api/payments` | Create payment |
| POST | `/api/payments/bkash/create` | Create bKash payment |
| POST | `/api/payments/bkash/execute` | Execute bKash payment |
| GET | `/api/payments/bkash/status` | Get bKash payment status |

### User (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/profile` | Get user profile |
| PATCH | `/api/user/profile` | Update profile |
| PATCH | `/api/user/password` | Change password |
| PATCH | `/api/user/language` | Update language |
| POST | `/api/user/verify-email` | Verify email |
| GET | `/api/user/check-exists?email=:email` | Check if user exists (public) |

### Dashboard (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/unified?roomId=:id` | Get unified dashboard |
| GET | `/api/dashboard/chart-data?roomId=:id` | Get chart data |
| GET | `/api/dashboard/activities?roomId=:id` | Get activities |
| GET | `/api/dashboard/summary/:groupId` | Get group summary |

### Notifications (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get all notifications |
| GET | `/api/notifications/:id` | Get notification by ID |
| PATCH | `/api/notifications/:id/read` | Mark as read |
| PATCH | `/api/notifications/read-all` | Mark all as read |
| DELETE | `/api/notifications/:id` | Delete notification |

### Periods (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/periods?roomId=:id` | Get periods |
| POST | `/api/periods` | Create period |
| GET | `/api/periods/:id` | Get period by ID |
| PATCH | `/api/periods/:id` | Update period |
| DELETE | `/api/periods/:id` | Delete period |
| GET | `/api/periods/current?roomId=:id` | Get current period |
| POST | `/api/periods/:id/restart` | Restart period |
| GET | `/api/periods/:id/summary` | Get period summary |
| GET | `/api/periods/by-month?roomId=:id` | Get periods by month |
| GET | `/api/periods/unified?roomId=:id` | Get unified period data |

### Shopping (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shopping?roomId=:id` | Get shopping list |
| POST | `/api/shopping` | Add shopping item |
| PATCH | `/api/shopping/:id` | Update shopping item |
| DELETE | `/api/shopping/:id` | Delete shopping item |
| DELETE | `/api/shopping/clear-purchased?roomId=:id` | Clear purchased items |

### Analytics (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics?roomId=:id` | Get room analytics |
| GET | `/api/analytics/user-rooms` | Get user rooms analytics |
| GET | `/api/analytics/all-rooms` | Get all rooms analytics |
| GET | `/api/analytics/selected-rooms` | Get selected rooms analytics |

### Account Balance (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/account-balance?roomId=:id` | Get account balance |
| GET | `/api/account-balance/transactions?roomId=:id` | Get transactions |
| GET | `/api/account-balance/transactions/:id` | Get transaction by ID |

### Excel Import/Export (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/excel/export?roomId=:id` | Export all data |
| GET | `/api/excel/export/meals?roomId=:id` | Export meals |
| GET | `/api/excel/export/payments?roomId=:id` | Export payments |
| GET | `/api/excel/export/calendar?roomId=:id` | Export calendar |
| GET | `/api/excel/export/shopping?roomId=:id` | Export shopping list |
| POST | `/api/excel/import` | Import data |
| POST | `/api/excel/import/meals` | Import meals |
| GET | `/api/excel/template` | Get import template |

### Market Dates (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/market-dates?roomId=:id` | Get market dates |
| POST | `/api/market-dates` | Create market date |
| GET | `/api/market-dates/:id` | Get market date |
| PATCH | `/api/market-dates/:id` | Update market date |
| DELETE | `/api/market-dates/:id` | Delete market date |
| POST | `/api/market-dates/:id/fine` | Add fine to market date |

### Public Content (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/public/hero` | Get hero content |
| GET | `/api/public/features` | Get features |
| GET | `/api/public/about` | Get about content |
| GET | `/api/public/recipes` | Get recipes |
| GET | `/api/public/meal-plans` | Get meal plans |
| GET | `/api/public/showcase` | Get showcase |
| GET | `/api/public/legal/terms` | Get terms of service |
| GET | `/api/public/legal/privacy` | Get privacy policy |
| GET | `/api/public/legal/cookies` | Get cookie policy |
| POST | `/api/public/contact` | Send contact message |

### Miscellaneous
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q=:query` | Global search |
| POST | `/api/contact` | Contact form |
| GET | `/api/location` | Get location data |
| POST | `/api/calculations` | Perform calculations |

---

## 🔑 Common Request Bodies

### Register User
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "captchaSessionId": "session-id",
  "captchaText": "ABCD",
  "storedCaptchaText": "ABCD"
}
```

### Create Group
```json
{
  "name": "My Group",
  "description": "Group description",
  "isPrivate": false,
  "maxMembers": 20
}
```

### Create Meal
```json
{
  "roomId": "group-id",
  "date": "2026-01-17",
  "type": "LUNCH"
}
```

### Create Expense (Form Data)
```
roomId: group-id
description: Groceries
amount: 500
date: 2026-01-17
type: GROCERIES
receipt: [file]
```

### Create Payment
```json
{
  "roomId": "group-id",
  "amount": 1000,
  "method": "CASH",
  "description": "Monthly payment"
}
```

---

## 📊 Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## 🎯 Meal Types
- `BREAKFAST`
- `LUNCH`
- `DINNER`

## 💰 Payment Methods
- `CASH`
- `BKASH`
- `BANK_TRANSFER`

## 📦 Expense Types
- `GROCERIES`
- `UTILITIES`
- `RENT`
- `OTHER`

## 👥 User Roles
- `ADMIN`
- `MANAGER`
- `MEMBER`

---

**Last Updated:** 2026-01-17
