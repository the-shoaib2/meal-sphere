#!/bin/bash

# Security Testing Script for MealSphere
# Tests various attack vectors and security controls

set -e

BASE_URL="http://localhost:3000"
RESULTS_FILE="security-test-results.txt"

echo "🔒 MealSphere Security Testing Suite" > $RESULTS_FILE
echo "====================================" >> $RESULTS_FILE
echo "Started: $(date)" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to log test results
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

# Test 1.1: SQL Injection in Login
echo "Testing SQL Injection in login..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/callback/credentials" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin'\'' OR '\''1'\''='\''1","password":"anything"}' \
    -w "%{http_code}" -o /dev/null)

if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "400" ]; then
    log_test "SQL Injection in Login" "PASS" "Login rejected malicious input (HTTP $RESPONSE)"
else
    log_test "SQL Injection in Login" "FAIL" "Unexpected response: HTTP $RESPONSE"
fi

# Test 1.2: XSS in Login
echo "Testing XSS in login..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/callback/credentials" \
    -H "Content-Type: application/json" \
    -d '{"email":"<script>alert(1)</script>@test.com","password":"test"}' \
    -w "%{http_code}" -o /dev/null)

if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "400" ]; then
    log_test "XSS in Login Email" "PASS" "XSS payload rejected (HTTP $RESPONSE)"
else
    log_test "XSS in Login Email" "FAIL" "Unexpected response: HTTP $RESPONSE"
fi

# Test 1.3: Weak Password Acceptance
echo "Testing weak password policy..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test","email":"test@test.com","password":"123","confirmPassword":"123","captchaSessionId":"test","captchaText":"test"}' \
    -w "%{http_code}" -o /dev/null)

if [ "$RESPONSE" = "400" ]; then
    log_test "Weak Password Rejection" "PASS" "Weak password rejected (HTTP $RESPONSE)"
else
    log_test "Weak Password Rejection" "WARN" "Password policy may be too weak (HTTP $RESPONSE)"
fi

# ============================================================================
# 2. RATE LIMITING TESTS
# ============================================================================
echo ""
echo "📋 Category 2: Rate Limiting"
echo "======================================" >> $RESULTS_FILE
echo "Category 2: Rate Limiting" >> $RESULTS_FILE
echo "======================================" >> $RESULTS_FILE

# Test 2.1: Auth Rate Limiting
echo "Testing authentication rate limiting..."
BLOCKED=false
for i in {1..15}; do
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/callback/credentials" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@test.com","password":"wrong"}' \
        -w "%{http_code}" -o /dev/null)
    
    if [ "$RESPONSE" = "429" ]; then
        BLOCKED=true
        break
    fi
    sleep 0.5
done

if [ "$BLOCKED" = true ]; then
    log_test "Auth Rate Limiting" "PASS" "Rate limit triggered after multiple attempts"
else
    log_test "Auth Rate Limiting" "FAIL" "Rate limit not triggered after 15 attempts"
fi

# Test 2.2: API Rate Limiting
echo "Testing API rate limiting..."
BLOCKED=false
for i in {1..120}; do
    RESPONSE=$(curl -s -X GET "$BASE_URL/api/user/profile" \
        -w "%{http_code}" -o /dev/null)
    
    if [ "$RESPONSE" = "429" ]; then
        BLOCKED=true
        break
    fi
done

if [ "$BLOCKED" = true ]; then
    log_test "API Rate Limiting" "PASS" "API rate limit triggered"
else
    log_test "API Rate Limiting" "WARN" "API rate limit not triggered (may need authentication)"
fi

# ============================================================================
# 3. CSRF PROTECTION TESTS
# ============================================================================
echo ""
echo "📋 Category 3: CSRF Protection"
echo "======================================" >> $RESULTS_FILE
echo "Category 3: CSRF Protection" >> $RESULTS_FILE
echo "======================================" >> $RESULTS_FILE

# Test 3.1: CSRF Token Endpoint
echo "Testing CSRF token endpoint..."
RESPONSE=$(curl -s -X GET "$BASE_URL/api/csrf" -w "%{http_code}" -o /dev/null)

if [ "$RESPONSE" = "401" ]; then
    log_test "CSRF Endpoint Authentication" "PASS" "CSRF endpoint requires authentication (HTTP $RESPONSE)"
elif [ "$RESPONSE" = "200" ]; then
    log_test "CSRF Endpoint Authentication" "WARN" "CSRF endpoint accessible without auth (HTTP $RESPONSE)"
else
    log_test "CSRF Endpoint Authentication" "FAIL" "Unexpected response: HTTP $RESPONSE"
fi

# Test 3.2: POST without CSRF Token (will need to implement in API routes)
echo "Testing POST without CSRF token..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/groups" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Group"}' \
    -w "%{http_code}" -o /dev/null)

if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "403" ]; then
    log_test "CSRF Protection on POST" "PASS" "POST rejected without CSRF token (HTTP $RESPONSE)"
else
    log_test "CSRF Protection on POST" "WARN" "CSRF middleware may not be integrated yet (HTTP $RESPONSE)"
fi

# ============================================================================
# 4. AUTHORIZATION TESTS
# ============================================================================
echo ""
echo "📋 Category 4: Authorization"
echo "======================================" >> $RESULTS_FILE
echo "Category 4: Authorization" >> $RESULTS_FILE
echo "======================================" >> $RESULTS_FILE

# Test 4.1: Unauthorized API Access
echo "Testing unauthorized API access..."
RESPONSE=$(curl -s -X GET "$BASE_URL/api/groups" -w "%{http_code}" -o /dev/null)

if [ "$RESPONSE" = "401" ]; then
    log_test "Unauthorized API Access" "PASS" "API requires authentication (HTTP $RESPONSE)"
else
    log_test "Unauthorized API Access" "FAIL" "API accessible without authentication (HTTP $RESPONSE)"
fi

# Test 4.2: Direct Object Reference
echo "Testing IDOR vulnerability..."
RESPONSE=$(curl -s -X GET "$BASE_URL/api/groups/00000000-0000-0000-0000-000000000000" \
    -w "%{http_code}" -o /dev/null)

if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "403" ] || [ "$RESPONSE" = "404" ]; then
    log_test "IDOR Protection" "PASS" "Direct object reference protected (HTTP $RESPONSE)"
else
    log_test "IDOR Protection" "FAIL" "Potential IDOR vulnerability (HTTP $RESPONSE)"
fi

# ============================================================================
# 5. INPUT VALIDATION TESTS
# ============================================================================
echo ""
echo "📋 Category 5: Input Validation"
echo "======================================" >> $RESULTS_FILE
echo "Category 5: Input Validation" >> $RESULTS_FILE
echo "======================================" >> $RESULTS_FILE

# Test 5.1: XSS in API Input
echo "Testing XSS in API input..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/groups" \
    -H "Content-Type: application/json" \
    -d '{"name":"<script>alert(\"XSS\")</script>"}' \
    -w "%{http_code}" -o /dev/null)

if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "403" ] || [ "$RESPONSE" = "400" ]; then
    log_test "XSS in API Input" "PASS" "Malicious input rejected (HTTP $RESPONSE)"
else
    log_test "XSS in API Input" "WARN" "Check if input is sanitized (HTTP $RESPONSE)"
fi

# Test 5.2: Oversized Payload
echo "Testing oversized payload..."
LARGE_PAYLOAD=$(python3 -c "print('A' * 10000000)")  # 10MB
RESPONSE=$(curl -s -X POST "$BASE_URL/api/groups" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$LARGE_PAYLOAD\"}" \
    -w "%{http_code}" -o /dev/null --max-time 5 2>/dev/null || echo "timeout")

if [ "$RESPONSE" = "413" ] || [ "$RESPONSE" = "400" ] || [ "$RESPONSE" = "timeout" ]; then
    log_test "Oversized Payload Protection" "PASS" "Large payload rejected or timed out"
else
    log_test "Oversized Payload Protection" "WARN" "Large payload handling unclear (HTTP $RESPONSE)"
fi

# Test 5.3: Invalid UUID Format
echo "Testing invalid UUID handling..."
RESPONSE=$(curl -s -X GET "$BASE_URL/api/groups/invalid-uuid-format" \
    -w "%{http_code}" -o /dev/null)

if [ "$RESPONSE" = "400" ] || [ "$RESPONSE" = "404" ] || [ "$RESPONSE" = "401" ]; then
    log_test "Invalid UUID Handling" "PASS" "Invalid UUID rejected (HTTP $RESPONSE)"
else
    log_test "Invalid UUID Handling" "FAIL" "Invalid UUID not properly validated (HTTP $RESPONSE)"
fi

# ============================================================================
# 6. SECURITY HEADERS TESTS
# ============================================================================
echo ""
echo "📋 Category 6: Security Headers"
echo "======================================" >> $RESULTS_FILE
echo "Category 6: Security Headers" >> $RESULTS_FILE
echo "======================================" >> $RESULTS_FILE

# Test 6.1: X-Frame-Options
echo "Testing X-Frame-Options header..."
HEADER=$(curl -s -I "$BASE_URL" | grep -i "x-frame-options" | cut -d' ' -f2 | tr -d '\r')

if [ "$HEADER" = "DENY" ] || [ "$HEADER" = "SAMEORIGIN" ]; then
    log_test "X-Frame-Options Header" "PASS" "Header set to: $HEADER"
else
    log_test "X-Frame-Options Header" "FAIL" "Header missing or incorrect: $HEADER"
fi

# Test 6.2: X-Content-Type-Options
echo "Testing X-Content-Type-Options header..."
HEADER=$(curl -s -I "$BASE_URL" | grep -i "x-content-type-options" | cut -d' ' -f2 | tr -d '\r')

if [ "$HEADER" = "nosniff" ]; then
    log_test "X-Content-Type-Options Header" "PASS" "Header set correctly"
else
    log_test "X-Content-Type-Options Header" "FAIL" "Header missing or incorrect"
fi

# Test 6.3: Strict-Transport-Security
echo "Testing HSTS header..."
HEADER=$(curl -s -I "$BASE_URL" | grep -i "strict-transport-security")

if [ -n "$HEADER" ]; then
    log_test "HSTS Header" "PASS" "Header present"
else
    log_test "HSTS Header" "WARN" "Header missing (expected in production only)"
fi

# Test 6.4: Content-Security-Policy
echo "Testing CSP header..."
HEADER=$(curl -s -I "$BASE_URL" | grep -i "content-security-policy")

if [ -n "$HEADER" ]; then
    log_test "CSP Header" "PASS" "Header present"
else
    log_test "CSP Header" "FAIL" "Header missing"
fi

# ============================================================================
# 7. SESSION SECURITY TESTS
# ============================================================================
echo ""
echo "📋 Category 7: Session Security"
echo "======================================" >> $RESULTS_FILE
echo "Category 7: Session Security" >> $RESULTS_FILE
echo "======================================" >> $RESULTS_FILE

# Test 7.1: Cookie Security Flags
echo "Testing cookie security flags..."
COOKIES=$(curl -s -I "$BASE_URL/api/auth/session" | grep -i "set-cookie")

if echo "$COOKIES" | grep -q "HttpOnly"; then
    log_test "HttpOnly Cookie Flag" "PASS" "HttpOnly flag present"
else
    log_test "HttpOnly Cookie Flag" "WARN" "HttpOnly flag may be missing"
fi

if echo "$COOKIES" | grep -q "Secure"; then
    log_test "Secure Cookie Flag" "PASS" "Secure flag present"
else
    log_test "Secure Cookie Flag" "WARN" "Secure flag missing (expected in production)"
fi

if echo "$COOKIES" | grep -q "SameSite"; then
    log_test "SameSite Cookie Flag" "PASS" "SameSite flag present"
else
    log_test "SameSite Cookie Flag" "FAIL" "SameSite flag missing"
fi

# ============================================================================
# 8. ENCRYPTION TESTS
# ============================================================================
echo ""
echo "📋 Category 8: Encryption"
echo "======================================" >> $RESULTS_FILE
echo "Category 8: Encryption" >> $RESULTS_FILE
echo "======================================" >> $RESULTS_FILE

# Test 8.1: Password Storage (indirect test via registration)
echo "Testing password storage security..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"name":"SecurityTest","email":"sectest@test.com","password":"TestPass123!","confirmPassword":"TestPass123!","captchaSessionId":"test","captchaText":"test"}')

if echo "$RESPONSE" | grep -q "password"; then
    log_test "Password Storage" "FAIL" "Password may be exposed in response"
else
    log_test "Password Storage" "PASS" "Password not exposed in response"
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
echo "Full results saved to: $RESULTS_FILE"
echo ""

# Calculate pass rate
PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))

if [ $PASS_RATE -ge 80 ]; then
    echo -e "${GREEN}✓ Security Score: $PASS_RATE% - Good${NC}"
elif [ $PASS_RATE -ge 60 ]; then
    echo -e "${YELLOW}⚠ Security Score: $PASS_RATE% - Needs Improvement${NC}"
else
    echo -e "${RED}✗ Security Score: $PASS_RATE% - Critical Issues${NC}"
fi

echo ""
