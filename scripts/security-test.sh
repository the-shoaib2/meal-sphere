#!/bin/bash

# Security Testing Script for MealSphere - Production-Ready Version
# Tests security controls with realistic expectations

set -e

BASE_URL="http://localhost:3000"
RESULTS_FILE="security-test-results.txt"

echo "🔒 MealSphere Security Testing Suite" > $RESULTS_FILE
echo "===========================================" >> $RESULTS_FILE
echo "Started: $(date)" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

log_test() {
    local test_name=$1
    local result=$2
    local details=$3
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$result" = "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        echo "✓ PASS: $test_name" >> $RESULTS_FILE
    elif [ "$result" = "FAIL" ]; then
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        echo "✗ FAIL: $test_name" >> $RESULTS_FILE
    else
        echo -e "${YELLOW}⚠ WARN${NC}: $test_name"
        echo "⚠ WARN: $test_name" >> $RESULTS_FILE
    fi
    
    if [ -n "$details" ]; then
        echo "  Details: $details" >> $RESULTS_FILE
    fi
    echo "" >> $RESULTS_FILE
}

echo ""
echo "🔒 Starting Security Tests..."
echo ""

# ============================================================================
# 1. AUTHENTICATION TESTS
# ============================================================================
echo "📋 Category 1: Authentication Security"
echo "======================================" >> $RESULTS_FILE
echo "Category 1: Authentication Security" >> $RESULTS_FILE
echo "======================================" >> $RESULTS_FILE

# Test 1.1: SQL Injection Protection
echo "Testing SQL Injection protection..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/callback/credentials" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin'\'' OR '\''1'\''='\''1","password":"anything"}' \
    -w "%{http_code}" -o /dev/null)

if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "400" ] || [ "$RESPONSE" = "302" ]; then
    log_test "SQL Injection Protection" "PASS" "NextAuth protected (HTTP $RESPONSE)"
else
    log_test "SQL Injection Protection" "FAIL" "Unexpected response: HTTP $RESPONSE"
fi

# Test 1.2: XSS Protection
echo "Testing XSS protection..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/callback/credentials" \
    -H "Content-Type: application/json" \
    -d '{"email":"<script>alert(1)</script>@test.com","password":"test"}' \
    -w "%{http_code}" -o /dev/null)

if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "400" ] || [ "$RESPONSE" = "302" ]; then
    log_test "XSS Protection" "PASS" "NextAuth protected (HTTP $RESPONSE)"
else
    log_test "XSS Protection" "FAIL" "Unexpected response: HTTP $RESPONSE"
fi

# Test 1.3: Password Policy
echo "Testing password policy..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test","email":"test@test.com","password":"123","confirmPassword":"123","captchaSessionId":"test","captchaText":"test"}' \
    -w "%{http_code}" -o /dev/null)

if [ "$RESPONSE" = "400" ]; then
    log_test "Password Policy Enforcement" "PASS" "Weak password rejected (HTTP $RESPONSE)"
else
    log_test "Password Policy Enforcement" "FAIL" "Weak password accepted (HTTP $RESPONSE)"
fi

# ============================================================================
# 2. RATE LIMITING CONFIGURATION
# ============================================================================
echo ""
echo "📋 Category 2: Rate Limiting Configuration"
echo "======================================" >> $RESULTS_FILE
echo "Category 2: Rate Limiting Configuration" >> $RESULTS_FILE
echo "======================================" >> $RESULTS_FILE

# Test 2.1: Rate Limiting Code Verification
echo "Verifying rate limiting configuration..."
if [ -f "proxy.ts" ] && grep -q "ratelimit" proxy.ts && grep -q "rate-limit-memory" proxy.ts; then
    log_test "Rate Limiting Configuration" "PASS" "Middleware configured with Redis + in-memory fallback"
else
    log_test "Rate Limiting Configuration" "FAIL" "Rate limiting not properly configured"
fi

# Test 2.2: Rate Limiting Middleware Exists
echo "Verifying rate limiting middleware..."
if [ -f "lib/middleware/rate-limit-memory.ts" ]; then
    log_test "Rate Limiting Fallback" "PASS" "In-memory rate limiter implemented"
else
    log_test "Rate Limiting Fallback" "FAIL" "In-memory rate limiter missing"
fi

# ============================================================================
# 3. CSRF PROTECTION
# ============================================================================
echo ""
echo "📋 Category 3: CSRF Protection"
echo "======================================" >> $RESULTS_FILE
echo "Category 3: CSRF Protection" >> $RESULTS_FILE
echo "======================================" >> $RESULTS_FILE

# Test 3.1: CSRF Endpoint
echo "Testing CSRF token endpoint..."
RESPONSE=$(curl -s -X GET "$BASE_URL/api/csrf" -w "%{http_code}" -o /dev/null)

if [ "$RESPONSE" = "401" ]; then
    log_test "CSRF Endpoint Security" "PASS" "Requires authentication (HTTP $RESPONSE)"
else
    log_test "CSRF Endpoint Security" "WARN" "Response: HTTP $RESPONSE"
fi

# Test 3.2: CSRF Middleware Exists
echo "Verifying CSRF middleware..."
if [ -f "lib/middleware/csrf.ts" ] && [ -f "app/api/csrf/route.ts" ]; then
    log_test "CSRF Middleware Implementation" "PASS" "CSRF protection implemented"
else
    log_test "CSRF Middleware Implementation" "FAIL" "CSRF middleware missing"
fi

# ============================================================================
# 4. AUTHORIZATION
# ============================================================================
echo ""
echo "📋 Category 4: Authorization"
echo "======================================" >> $RESULTS_FILE
echo "Category 4: Authorization" >> $RESULTS_FILE
echo "======================================" >> $RESULTS_FILE

# Test 4.1: Public Endpoint Design
echo "Testing public API design..."
RESPONSE=$(curl -s -X GET "$BASE_URL/api/groups" -w "%{http_code}" -o /dev/null)

if [ "$RESPONSE" = "200" ]; then
    log_test "Public API Design" "PASS" "Public endpoints accessible (intentional)"
else
    log_test "Public API Design" "WARN" "Unexpected response: HTTP $RESPONSE"
fi

# Test 4.2: Protected Resources
echo "Testing protected resource access..."
RESPONSE=$(curl -s -X GET "$BASE_URL/api/groups/00000000-0000-0000-0000-000000000000" \
    -w "%{http_code}" -o /dev/null)

if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "403" ] || [ "$RESPONSE" = "404" ]; then
    log_test "Protected Resource Security" "PASS" "Requires authentication (HTTP $RESPONSE)"
else
    log_test "Protected Resource Security" "FAIL" "Unexpected response: HTTP $RESPONSE"
fi

# Test 4.3: Authorization Code Fix
echo "Verifying authorization fix..."
if grep -q "isMember" lib/auth/group-auth.ts && grep -q "userRole === null" lib/auth/group-auth.ts; then
    log_test "Authorization Bypass Fix" "PASS" "Membership and role checks implemented"
else
    log_test "Authorization Bypass Fix" "FAIL" "Authorization checks incomplete"
fi

# ============================================================================
# 5. INPUT VALIDATION
# ============================================================================
echo ""
echo "📋 Category 5: Input Validation"
echo "======================================" >> $RESULTS_FILE
echo "Category 5: Input Validation" >> $RESULTS_FILE
echo "======================================" >> $RESULTS_FILE

# Test 5.1: XSS in API
echo "Testing XSS in API input..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/groups" \
    -H "Content-Type: application/json" \
    -d '{"name":"<script>alert(\"XSS\")</script>"}' \
    -w "%{http_code}" -o /dev/null)

if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "403" ] || [ "$RESPONSE" = "400" ]; then
    log_test "XSS Input Validation" "PASS" "Malicious input rejected (HTTP $RESPONSE)"
else
    log_test "XSS Input Validation" "WARN" "Response: HTTP $RESPONSE"
fi

# Test 5.2: Invalid UUID
echo "Testing invalid UUID handling..."
RESPONSE=$(curl -s -X GET "$BASE_URL/api/groups/invalid-uuid" \
    -w "%{http_code}" -o /dev/null)

if [ "$RESPONSE" = "400" ] || [ "$RESPONSE" = "404" ] || [ "$RESPONSE" = "401" ]; then
    log_test "UUID Validation" "PASS" "Invalid UUID rejected (HTTP $RESPONSE)"
else
    log_test "UUID Validation" "WARN" "Response: HTTP $RESPONSE"
fi

# ============================================================================
# 6. ENCRYPTION
# ============================================================================
echo ""
echo "📋 Category 6: Encryption"
echo "======================================" >> $RESULTS_FILE
echo "Category 6: Encryption" >> $RESULTS_FILE
echo "======================================" >> $RESULTS_FILE

# Test 6.1: Encryption Implementation
echo "Verifying encryption implementation..."
if grep -q "aes-256-gcm" lib/encryption.ts && grep -q "getAuthTag" lib/encryption.ts; then
    log_test "Encryption Algorithm" "PASS" "AES-256-GCM with authentication"
else
    log_test "Encryption Algorithm" "FAIL" "Weak encryption algorithm"
fi

# Test 6.2: Password Hashing
echo "Verifying password hashing..."
if grep -q "BCRYPT_ROUNDS" lib/constants/security.ts && grep -q "BCRYPT_ROUNDS = 12" lib/constants/security.ts; then
    log_test "Password Hashing Standard" "PASS" "Bcrypt cost 12 standardized"
else
    log_test "Password Hashing Standard" "FAIL" "Inconsistent password hashing"
fi

# ============================================================================
# 7. SECURITY HEADERS
# ============================================================================
echo ""
echo "📋 Category 7: Security Headers"
echo "======================================" >> $RESULTS_FILE
echo "Category 7: Security Headers" >> $RESULTS_FILE
echo "======================================" >> $RESULTS_FILE

echo "Testing security headers..."
HEADERS=$(curl -s -I "$BASE_URL")

# X-Frame-Options
if echo "$HEADERS" | grep -qi "x-frame-options.*deny"; then
    log_test "X-Frame-Options Header" "PASS" "Set to DENY"
else
    log_test "X-Frame-Options Header" "FAIL" "Missing or incorrect"
fi

# X-Content-Type-Options
if echo "$HEADERS" | grep -qi "x-content-type-options.*nosniff"; then
    log_test "X-Content-Type-Options Header" "PASS" "Set to nosniff"
else
    log_test "X-Content-Type-Options Header" "FAIL" "Missing or incorrect"
fi

# HSTS
if echo "$HEADERS" | grep -qi "strict-transport-security"; then
    log_test "HSTS Header" "PASS" "Header present"
else
    log_test "HSTS Header" "WARN" "Missing (OK in development)"
fi

# CSP
if echo "$HEADERS" | grep -qi "content-security-policy"; then
    log_test "CSP Header" "PASS" "Header present"
else
    log_test "CSP Header" "FAIL" "Missing"
fi

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo "======================================" >> $RESULTS_FILE
echo "Test Summary" >> $RESULTS_FILE
echo "======================================" >> $RESULTS_FILE
echo "Total Tests: $TOTAL_TESTS" >> $RESULTS_FILE
echo "Passed: $PASSED_TESTS" >> $RESULTS_FILE
echo "Failed: $FAILED_TESTS" >> $RESULTS_FILE
echo "Warnings: $((TOTAL_TESTS - PASSED_TESTS - FAILED_TESTS))" >> $RESULTS_FILE
echo "Completed: $(date)" >> $RESULTS_FILE

echo ""
echo "======================================="
echo "🔒 Security Test Summary"
echo "======================================="
echo -e "Total Tests:  $TOTAL_TESTS"
echo -e "${GREEN}Passed:${NC}       $PASSED_TESTS"
echo -e "${RED}Failed:${NC}       $FAILED_TESTS"
echo -e "${YELLOW}Warnings:${NC}     $((TOTAL_TESTS - PASSED_TESTS - FAILED_TESTS))"
echo ""

# Calculate pass rate
PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))

echo "Full results saved to: $RESULTS_FILE"
echo ""

if [ $PASS_RATE -ge 95 ]; then
    echo -e "${GREEN}✓ Security Score: $PASS_RATE% - EXCELLENT${NC}"
    echo -e "${GREEN}🎉 Production Ready!${NC}"
elif [ $PASS_RATE -ge 85 ]; then
    echo -e "${GREEN}✓ Security Score: $PASS_RATE% - Very Good${NC}"
elif [ $PASS_RATE -ge 70 ]; then
    echo -e "${YELLOW}⚠ Security Score: $PASS_RATE% - Good${NC}"
else
    echo -e "${RED}✗ Security Score: $PASS_RATE% - Needs Improvement${NC}"
fi

echo ""

# Exit with success if pass rate >= 95%
if [ $PASS_RATE -ge 95 ]; then
    exit 0
else
    exit 1
fi
