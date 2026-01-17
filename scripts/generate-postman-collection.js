#!/usr/bin/env node

/**
 * Postman Collection Generator for MealSphere API
 * Generates a complete Postman collection with all 101 endpoints
 * 
 * Usage: node scripts/generate-postman-collection.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Collection metadata
const collection = {
    info: {
        name: "MealSphere API",
        description: "Complete API collection for MealSphere with all 101 endpoints",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        version: "2.0.0"
    },
    auth: {
        type: "bearer",
        bearer: [{ key: "token", value: "{{authToken}}", type: "string" }]
    },
    variable: [
        { key: "baseUrl", value: "http://localhost:3000", type: "string" },
        { key: "authToken", value: "", type: "string" },
        { key: "groupId", value: "", type: "string" },
        { key: "userId", value: "", type: "string" },
        { key: "mealId", value: "", type: "string" },
        { key: "expenseId", value: "", type: "string" },
        { key: "shoppingId", value: "", type: "string" },
        { key: "periodId", value: "", type: "string" },
        { key: "notificationId", value: "", type: "string" },
        { key: "transactionId", value: "", type: "string" },
        { key: "memberId", value: "", type: "string" },
        { key: "requestId", value: "", type: "string" },
        { key: "marketDateId", value: "", type: "string" },
        { key: "voteId", value: "", type: "string" },
        { key: "inviteToken", value: "", type: "string" },
        { key: "csrfToken", value: "", type: "string" }
    ],
    event: [
        {
            listen: "prerequest",
            script: {
                type: "text/javascript",
                exec: [
                    "var token = pm.collectionVariables.get('authToken');",
                    "if (token) {",
                    "    pm.request.headers.add({",
                    "        key: 'Cookie',",
                    "        value: 'next-auth.session-token=' + token + '; __Secure-next-auth.session-token=' + token",
                    "    });",
                    "}"
                ]
            }
        }
    ],
    item: []
};

// Helper to create request
function createRequest(method, path, body = null, queryParams = []) {
    const request = {
        method,
        header: [],
        url: {
            raw: `{{baseUrl}}${path}`,
            host: ["{{baseUrl}}"],
            path: path.split('/').filter(p => p),
            query: queryParams
        }
    };

    if (body) {
        request.header.push({ key: "Content-Type", value: "application/json" });
        request.body = { mode: "raw", raw: JSON.stringify(body, null, 2) };
    }

    return request;
}

// Helper to create endpoint
function createEndpoint(name, method, path, body = null, queryParams = [], tests = []) {
    const item = {
        name,
        request: createRequest(method, path, body, queryParams)
    };

    if (tests.length > 0) {
        item.event = [{
            listen: "test",
            script: {
                type: "text/javascript",
                exec: tests
            }
        }];
    }

    return item;
}

// 1. Authentication
collection.item.push({
    name: "🔐 Authentication",
    item: [
        createEndpoint("Get CAPTCHA", "GET", "/api/captcha"),
        createEndpoint("Register User", "POST", "/api/auth/register", {
            name: "John Doe",
            email: "john@example.com",
            password: "password123",
            confirmPassword: "password123",
            captchaSessionId: "session-id",
            captchaText: "ABCD",
            storedCaptchaText: "ABCD"
        }),
        {
            name: "Login",
            event: [
                {
                    listen: "prerequest",
                    script: {
                        exec: [
                            "pm.sendRequest({",
                            "    url: pm.variables.get('baseUrl') + '/api/auth/csrf',",
                            "    method: 'GET'",
                            "}, function (err, res) {",
                            "    if (!err) {",
                            "        pm.collectionVariables.set('csrfToken', res.json().csrfToken);",
                            "    }",
                            "});"
                        ],
                        type: "text/javascript"
                    }
                },
                {
                    listen: "test",
                    script: {
                        exec: [
                            "var cookie = pm.cookies.get('next-auth.session-token') || pm.cookies.get('__Secure-next-auth.session-token');",
                            "var jsonData = {};",
                            "try { jsonData = pm.response.json(); } catch (e) {}",
                            "var token = cookie || jsonData.token || jsonData.sessionToken;",
                            "if (token) pm.collectionVariables.set('authToken', token);"
                        ],
                        type: "text/javascript"
                    }
                }
            ],
            request: {
                method: "POST",
                header: [{ key: "Content-Type", value: "application/x-www-form-urlencoded" }],
                body: {
                    mode: "urlencoded",
                    urlencoded: [
                        { key: "csrfToken", value: "{{csrfToken}}", type: "text" },
                        { key: "email", value: "john@example.com", type: "text" },
                        { key: "password", value: "password123", type: "text" },
                        { key: "json", value: "true", type: "text" }
                    ]
                },
                url: {
                    raw: "{{baseUrl}}/api/auth/callback/credentials",
                    host: ["{{baseUrl}}"],
                    path: ["api", "auth", "callback", "credentials"]
                }
            }
        },
        createEndpoint("Forgot Password", "POST", "/api/auth/forgot-password", { email: "john@example.com" }),
        createEndpoint("Reset Password", "POST", "/api/auth/reset-password", {
            token: "reset-token",
            password: "password123",
            confirmPassword: "password123"
        }),
        createEndpoint("Get Sessions", "GET", "/api/auth/sessions"),
        createEndpoint("Revoke All Sessions", "POST", "/api/auth/sessions/revoke-all"),
        createEndpoint("Update Session", "POST", "/api/auth/update-session", { activeGroupId: "{{groupId}}" }),
        createEndpoint("Logout", "POST", "/api/auth/logout")
    ]
});

// 2. Groups
const groupTests = [
    "if (pm.response.code === 200 || pm.response.code === 201) {",
    "    var jsonData = pm.response.json();",
    "    if (jsonData.id) pm.collectionVariables.set('groupId', jsonData.id);",
    "    if (jsonData[0] && jsonData[0].id) pm.collectionVariables.set('groupId', jsonData[0].id);",
    "}"
];

collection.item.push({
    name: "👥 Groups",
    item: [
        createEndpoint("List Groups", "GET", "/api/groups", null, [], groupTests),
        createEndpoint("Create Group", "POST", "/api/groups", {
            name: "Test Group",
            description: "Test Description",
            isPrivate: false,
            maxMembers: 20
        }, [], groupTests),
        createEndpoint("Get Group", "GET", "/api/groups/{{groupId}}"),
        createEndpoint("Update Group", "PATCH", "/api/groups/{{groupId}}", {
            name: "Updated Group Name",
            description: "Updated description"
        }),
        createEndpoint("Delete Group", "DELETE", "/api/groups/{{groupId}}"),
        createEndpoint("Leave Group", "POST", "/api/groups/{{groupId}}/leave"),
        createEndpoint("Send Invite", "POST", "/api/groups/{{groupId}}/send-invite", { email: "friend@example.com" }),
        createEndpoint("Get Invite", "GET", "/api/groups/{{groupId}}/invite"),
        createEndpoint("Join via Token", "POST", "/api/groups/join/{{inviteToken}}"),
        createEndpoint("List Join Requests", "GET", "/api/groups/{{groupId}}/join-request"),
        createEndpoint("Create Join Request", "POST", "/api/groups/{{groupId}}/join-request", { message: "Please let me join" }),
        createEndpoint("My Join Request", "GET", "/api/groups/{{groupId}}/join-request/my-request"),
        createEndpoint("Handle Join Request", "PATCH", "/api/groups/{{groupId}}/join-request/{{requestId}}", { action: "approve" }),
        createEndpoint("Check Access", "GET", "/api/groups/{{groupId}}/access"),
        createEndpoint("Group Activity", "GET", "/api/groups/{{groupId}}/activity"),
        createEndpoint("Group Notifications", "GET", "/api/groups/{{groupId}}/notifications"),
        createEndpoint("Get Period Mode", "GET", "/api/groups/{{groupId}}/period-mode"),
        createEndpoint("Update Period Mode", "POST", "/api/groups/{{groupId}}/period-mode", { mode: "MONTHLY" }),
        createEndpoint("My Membership", "GET", "/api/groups/{{groupId}}/members/me"),
        createEndpoint("Get Member", "GET", "/api/groups/{{groupId}}/members/{{memberId}}"),
        createEndpoint("Update Member", "PATCH", "/api/groups/{{groupId}}/members/{{memberId}}", { isBanned: false }),
        createEndpoint("Remove Member", "DELETE", "/api/groups/{{groupId}}/members/{{memberId}}"),
        createEndpoint("Update Member Role", "PATCH", "/api/groups/{{groupId}}/members/{{memberId}}/role", { role: "MEMBER" })
    ]
});

// 3. Meals
collection.item.push({
    name: "🍽️ Meals",
    item: [
        createEndpoint("List Meals", "GET", "/api/meals", null, [{ key: "roomId", value: "{{groupId}}" }]),
        createEndpoint("Create/Toggle Meal", "POST", "/api/meals", {
            roomId: "{{groupId}}",
            date: "2026-01-18",
            type: "LUNCH"
        }),
        createEndpoint("Get Meal", "GET", "/api/meals/{{mealId}}"),
        createEndpoint("Delete Meal", "DELETE", "/api/meals/{{mealId}}"),
        createEndpoint("Unified Meal Data", "GET", "/api/meals/unified", null, [{ key: "roomId", value: "{{groupId}}" }]),
        createEndpoint("User Meal Stats", "GET", "/api/meals/user-stats", null, [{ key: "roomId", value: "{{groupId}}" }]),
        createEndpoint("Get Meal Settings", "GET", "/api/meals/settings", null, [{ key: "roomId", value: "{{groupId}}" }]),
        createEndpoint("Update Meal Settings", "POST", "/api/meals/settings", {
            roomId: "{{groupId}}",
            mealRate: 50
        }),
        createEndpoint("Get Auto Settings", "GET", "/api/meals/auto-settings", null, [{ key: "roomId", value: "{{groupId}}" }]),
        createEndpoint("Update Auto Settings", "POST", "/api/meals/auto-settings", {
            roomId: "{{groupId}}",
            enabled: true,
            mealTypes: ["LUNCH", "DINNER"]
        }),
        createEndpoint("Process Auto Meals", "POST", "/api/meals/auto-process"),
        createEndpoint("List Guest Meals", "GET", "/api/meals/guest", null, [{ key: "roomId", value: "{{groupId}}" }]),
        createEndpoint("Create Guest Meal", "POST", "/api/meals/guest", {
            roomId: "{{groupId}}",
            guestName: "John Doe",
            date: "2026-01-18",
            type: "LUNCH"
        }),
        createEndpoint("Get Guest Meal", "GET", "/api/meals/guest/{{mealId}}"),
        createEndpoint("Update Guest Meal", "PATCH", "/api/meals/guest/{{mealId}}", { guestName: "Jane Doe" }),
        createEndpoint("Delete Guest Meal", "DELETE", "/api/meals/guest/{{mealId}}")
    ]
});

// 4. Expenses
collection.item.push({
    name: "💰 Expenses",
    item: [
        createEndpoint("List Expenses", "GET", "/api/expenses", null, [{ key: "roomId", value: "{{groupId}}" }]),
        createEndpoint("Create Expense", "POST", "/api/expenses", {
            roomId: "{{groupId}}",
            description: "Groceries",
            amount: 500,
            date: "2026-01-18",
            type: "FOOD"
        }),
        createEndpoint("Get Expense", "GET", "/api/expenses/{{expenseId}}"),
        createEndpoint("Update Expense", "PATCH", "/api/expenses/{{expenseId}}", { amount: 550 }),
        createEndpoint("Delete Expense", "DELETE", "/api/expenses/{{expenseId}}")
    ]
});

// 5. Shopping
collection.item.push({
    name: "🛒 Shopping",
    item: [
        createEndpoint("List Shopping Items", "GET", "/api/shopping", null, [{ key: "roomId", value: "{{groupId}}" }]),
        createEndpoint("Create Shopping Item", "POST", "/api/shopping", {
            roomId: "{{groupId}}",
            name: "Rice",
            quantity: 5,
            unit: "kg"
        }),
        createEndpoint("Update Shopping Item", "PATCH", "/api/shopping", {
            id: "{{shoppingId}}",
            purchased: true
        }),
        createEndpoint("Delete Shopping Item", "DELETE", "/api/shopping", null, [{ key: "id", value: "{{shoppingId}}" }]),
        createEndpoint("Clear Purchased Items", "POST", "/api/shopping/clear-purchased", { roomId: "{{groupId}}" })
    ]
});

// 6. Payments
collection.item.push({
    name: "💳 Payments",
    item: [
        createEndpoint("List Payments", "GET", "/api/payments", null, [{ key: "roomId", value: "{{groupId}}" }]),
        createEndpoint("Create Payment", "POST", "/api/payments", {
            roomId: "{{groupId}}",
            amount: 1000,
            method: "CASH"
        }),
        createEndpoint("Create bKash Payment", "POST", "/api/payments/bkash/create", {
            amount: 1000,
            roomId: "{{groupId}}"
        }),
        createEndpoint("Execute bKash Payment", "POST", "/api/payments/bkash/execute", { paymentID: "payment-id" }),
        createEndpoint("bKash Callback", "GET", "/api/payments/bkash/callback"),
        createEndpoint("bKash Status", "GET", "/api/payments/bkash/status", null, [{ key: "paymentID", value: "payment-id" }])
    ]
});

// 7. Account Balance
collection.item.push({
    name: "💵 Account Balance",
    item: [
        createEndpoint("Get Balance", "GET", "/api/account-balance", null, [
            { key: "roomId", value: "{{groupId}}" },
            { key: "all", value: "true" }
        ]),
        createEndpoint("Add Transaction", "POST", "/api/account-balance", {
            roomId: "{{groupId}}",
            targetUserId: "{{userId}}",
            amount: 500,
            type: "DEPOSIT"
        }),
        createEndpoint("List Transactions", "GET", "/api/account-balance/transactions", null, [{ key: "roomId", value: "{{groupId}}" }]),
        createEndpoint("Get Transaction", "GET", "/api/account-balance/transactions/{{transactionId}}"),
        createEndpoint("Update Transaction", "PATCH", "/api/account-balance/transactions/{{transactionId}}", { amount: 600 }),
        createEndpoint("Delete Transaction", "DELETE", "/api/account-balance/transactions/{{transactionId}}")
    ]
});

// 8. Analytics
collection.item.push({
    name: "📊 Analytics",
    item: [
        createEndpoint("Get Analytics", "GET", "/api/analytics", null, [{ key: "groupId", value: "{{groupId}}" }]),
        createEndpoint("User Rooms", "GET", "/api/analytics/user-rooms"),
        createEndpoint("Selected Rooms Analytics", "GET", "/api/analytics/selected-rooms", null, [{ key: "roomIds", value: "{{groupId}}" }]),
        createEndpoint("All Rooms Analytics", "GET", "/api/analytics/all-rooms")
    ]
});

// 9. Dashboard
collection.item.push({
    name: "📈 Dashboard",
    item: [
        createEndpoint("Unified Dashboard", "GET", "/api/dashboard/unified", null, [{ key: "groupId", value: "{{groupId}}" }]),
        createEndpoint("Dashboard Summary", "GET", "/api/dashboard/summary/{{groupId}}"),
        createEndpoint("Recent Activities", "GET", "/api/dashboard/activities"),
        createEndpoint("Chart Data", "GET", "/api/dashboard/chart-data")
    ]
});

// 10. Periods
collection.item.push({
    name: "📅 Periods",
    item: [
        createEndpoint("List Periods", "GET", "/api/periods", null, [{ key: "roomId", value: "{{groupId}}" }]),
        createEndpoint("Create Period", "POST", "/api/periods", {
            roomId: "{{groupId}}",
            name: "January 2026",
            startDate: "2026-01-01",
            endDate: "2026-01-31"
        }),
        createEndpoint("Current Period", "GET", "/api/periods/current", null, [{ key: "roomId", value: "{{groupId}}" }]),
        createEndpoint("Period by Month", "GET", "/api/periods/by-month", null, [
            { key: "roomId", value: "{{groupId}}" },
            { key: "month", value: "2026-01" }
        ]),
        createEndpoint("Unified Period Data", "GET", "/api/periods/unified", null, [{ key: "roomId", value: "{{groupId}}" }]),
        createEndpoint("Get Period", "GET", "/api/periods/{{periodId}}"),
        createEndpoint("Update Period", "PATCH", "/api/periods/{{periodId}}", { name: "Updated Period" }),
        createEndpoint("Delete Period", "DELETE", "/api/periods/{{periodId}}"),
        createEndpoint("Restart Period", "POST", "/api/periods/{{periodId}}/restart"),
        createEndpoint("Period Summary", "GET", "/api/periods/{{periodId}}/summary")
    ]
});

// 11. Notifications
collection.item.push({
    name: "🔔 Notifications",
    item: [
        createEndpoint("List Notifications", "GET", "/api/notifications"),
        createEndpoint("Create Notification", "POST", "/api/notifications", {
            userId: "{{userId}}",
            type: "INFO",
            message: "Test notification"
        }),
        createEndpoint("Get Notification", "GET", "/api/notifications/{{notificationId}}"),
        createEndpoint("Mark as Read", "PATCH", "/api/notifications/{{notificationId}}/read"),
        createEndpoint("Mark All Read", "POST", "/api/notifications/read-all")
    ]
});

// 12. Users
collection.item.push({
    name: "👤 Users",
    item: [
        createEndpoint("Get Profile", "GET", "/api/user/profile"),
        createEndpoint("Update Profile", "PATCH", "/api/user/profile", {
            name: "Updated Name",
            email: "newemail@example.com"
        }),
        createEndpoint("Change Password", "POST", "/api/user/password", {
            currentPassword: "password123",
            newPassword: "newpassword123",
            confirmPassword: "newpassword123"
        }),
        createEndpoint("Check User Exists", "GET", "/api/user/check-exists", null, [{ key: "email", value: "john@example.com" }]),
        createEndpoint("Verify Email", "POST", "/api/user/verify-email", { token: "verification-token" }),
        createEndpoint("Get Language", "GET", "/api/user/language"),
        createEndpoint("Update Language", "POST", "/api/user/language", { language: "en" }),
        createEndpoint("Get User by ID", "GET", "/api/users/{{userId}}")
    ]
});

// 13. Excel
collection.item.push({
    name: "📑 Excel",
    item: [
        createEndpoint("Download Template", "GET", "/api/excel/template"),
        createEndpoint("Import Data", "POST", "/api/excel/import"),
        createEndpoint("Import Meals", "POST", "/api/excel/import/meals"),
        createEndpoint("Export All", "GET", "/api/excel/export", null, [{ key: "roomId", value: "{{groupId}}" }]),
        createEndpoint("Export Meals", "GET", "/api/excel/export/meals", null, [{ key: "roomId", value: "{{groupId}}" }]),
        createEndpoint("Export Payments", "GET", "/api/excel/export/payments", null, [{ key: "roomId", value: "{{groupId}}" }]),
        createEndpoint("Export Shopping", "GET", "/api/excel/export/shopping", null, [{ key: "roomId", value: "{{groupId}}" }]),
        createEndpoint("Export Calendar", "GET", "/api/excel/export/calendar", null, [{ key: "roomId", value: "{{groupId}}" }])
    ]
});

// 14. Market Dates
collection.item.push({
    name: "🏪 Market Dates",
    item: [
        createEndpoint("List Market Dates", "GET", "/api/market-dates", null, [{ key: "roomId", value: "{{groupId}}" }]),
        createEndpoint("Create Market Date", "POST", "/api/market-dates", {
            roomId: "{{groupId}}",
            date: "2026-01-20",
            assignedTo: "{{userId}}"
        }),
        createEndpoint("Get Market Date", "GET", "/api/market-dates/{{marketDateId}}"),
        createEndpoint("Update Market Date", "PATCH", "/api/market-dates/{{marketDateId}}", { completed: true }),
        createEndpoint("Delete Market Date", "DELETE", "/api/market-dates/{{marketDateId}}"),
        createEndpoint("Add Fine", "POST", "/api/market-dates/{{marketDateId}}/fine", { amount: 50, reason: "Late" })
    ]
});

// 15. Voting
collection.item.push({
    name: "🗳️ Voting",
    item: [
        createEndpoint("List Votes", "GET", "/api/groups/{{groupId}}/votes"),
        createEndpoint("Create Vote", "POST", "/api/groups/{{groupId}}/votes", {
            title: "Test Vote",
            description: "Vote description",
            options: ["Option 1", "Option 2"],
            endDate: "2026-01-25"
        }),
        createEndpoint("Update Vote", "PATCH", "/api/groups/{{groupId}}/votes", {
            voteId: "{{voteId}}",
            candidateId: "option-1"
        }),
        createEndpoint("Delete Vote", "DELETE", "/api/groups/{{groupId}}/votes", null, [{ key: "voteId", value: "{{voteId}}" }])
    ]
});

// 16. Other/Public
collection.item.push({
    name: "🌐 Other & Public",
    item: [
        createEndpoint("Calculations", "GET", "/api/calculations", null, [{ key: "roomId", value: "{{groupId}}" }]),
        createEndpoint("Location", "GET", "/api/location"),
        createEndpoint("Contact Form", "POST", "/api/contact", {
            name: "John Doe",
            email: "john@example.com",
            message: "Test message"
        }),
        createEndpoint("Search", "GET", "/api/search", null, [{ key: "q", value: "test" }]),
        createEndpoint("Hero Section", "GET", "/api/public/hero"),
        createEndpoint("Features", "GET", "/api/public/features"),
        createEndpoint("About", "GET", "/api/public/about"),
        createEndpoint("Contact Info", "GET", "/api/public/contact"),
        createEndpoint("Meal Plans", "GET", "/api/public/meal-plans"),
        createEndpoint("Recipes", "GET", "/api/public/recipes"),
        createEndpoint("Showcase", "GET", "/api/public/showcase"),
        createEndpoint("Privacy Policy", "GET", "/api/public/legal/privacy"),
        createEndpoint("Terms of Service", "GET", "/api/public/legal/terms"),
        createEndpoint("Cookie Policy", "GET", "/api/public/legal/cookies"),
        createEndpoint("Send Meal Reminders (Cron)", "POST", "/api/cron/meal-reminders"),
        createEndpoint("Process Auto Meals (Cron)", "POST", "/api/cron/auto-meals")
    ]
});

// Write to file
const outputPath = path.join(__dirname, '..', 'app', 'api', '__tests__', 'MealSphere-API.postman_collection.json');
fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));

console.log('✅ Postman collection generated successfully!');
console.log(`📁 Location: ${outputPath}`);
console.log(`📊 Total endpoints: ${collection.item.reduce((sum, folder) => sum + folder.item.length, 0)}`);
console.log('\n🚀 Import this file into Postman to get started!');
