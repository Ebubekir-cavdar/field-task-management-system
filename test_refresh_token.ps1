# Comprehensive Test Suite for Access Token (15m) + Refresh Token (Rotation) Architecture

$baseUrl = "http://localhost:5000/api/v1"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  TEST 1: Login & Token Issuance Verification" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

$loginBody = @{
    email = "ahmet@saha.com"
    password = "123456"
    rememberMe = $true
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"

$accessToken1 = $loginRes.token
$refreshToken1 = $loginRes.refreshToken
$user = $loginRes.user

Write-Host "Login successful. User: $($user.name) $($user.surname) ($($user.role))"
Write-Host "Access Token (first 30 chars): $($accessToken1.Substring(0, 30))..."
Write-Host "Refresh Token (first 30 chars): $($refreshToken1.Substring(0, 30))..."

# Check JWT 15-minute expiration
$jwtParts = $accessToken1.Split('.')
if ($jwtParts.Length -ne 3) { throw "JWT format is invalid!" }

# Base64 decode payload
$payloadRaw = $jwtParts[1]
while ($payloadRaw.Length % 4 -ne 0) { $payloadRaw += '=' }
$payloadJson = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($payloadRaw))
$payloadObj = $payloadJson | ConvertFrom-Json

$exp = [long]$payloadObj.exp
$iat = if ($payloadObj.iat) { [long]$payloadObj.iat } else { ([DateTimeOffset]::UtcNow.ToUnixTimeSeconds()) }
$lifetimeSeconds = $exp - $iat

Write-Host "JWT Access Token Expiration (seconds): $lifetimeSeconds (Expected ~900s / 15 mins)"
if ($lifetimeSeconds -lt 890 -or $lifetimeSeconds -gt 910) {
    throw "Access Token lifetime is not 15 minutes! Got $lifetimeSeconds seconds."
}
Write-Host " [PASS] Access Token precisely configured to 15 minutes (900s)" -ForegroundColor Green

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "  TEST 2: Authenticated Request with Access Token" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

$headers = @{
    Authorization = "Bearer $accessToken1"
}
$myTasks = Invoke-RestMethod -Uri "$baseUrl/tasks/my-tasks" -Method Get -Headers $headers
Write-Host " [PASS] Successfully fetched $( $myTasks.Count ) user tasks using 15-min Access Token" -ForegroundColor Green

$adminTasks = Invoke-RestMethod -Uri "$baseUrl/admin/tasks" -Method Get -Headers $headers
Write-Host " [PASS] Successfully fetched $( $adminTasks.Count ) admin tasks with Admin Role in JWT" -ForegroundColor Green

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "  TEST 3: Refresh Token Rotation (Sliding Expiration)" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

$refreshBody = @{
    refreshToken = $refreshToken1
} | ConvertTo-Json

$refreshRes = Invoke-RestMethod -Uri "$baseUrl/auth/refresh" -Method Post -Body $refreshBody -ContentType "application/json"

$accessToken2 = $refreshRes.token
$refreshToken2 = $refreshRes.refreshToken

Write-Host "Rotated Access Token (first 30 chars): $($accessToken2.Substring(0, 30))..."
Write-Host "Rotated Refresh Token (first 30 chars): $($refreshToken2.Substring(0, 30))..."

if ($refreshToken1 -eq $refreshToken2) {
    throw "TOKEN ROTATION FAILED: New refresh token is identical to old refresh token!"
}
Write-Host " [PASS] Token Rotation confirmed: New Refresh Token is unique and rotated." -ForegroundColor Green

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "  TEST 4: Authenticated Request with Rotated Access Token" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

$headers2 = @{
    Authorization = "Bearer $accessToken2"
}
$tasks2 = Invoke-RestMethod -Uri "$baseUrl/tasks/my-tasks" -Method Get -Headers $headers2
Write-Host " [PASS] Successfully accessed protected endpoint with new rotated token (Task count: $($tasks2.Count))" -ForegroundColor Green

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "  TEST 5: Replay Attack Prevention (Old Refresh Token Must Fail)" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

try {
    $replayRes = Invoke-RestMethod -Uri "$baseUrl/auth/refresh" -Method Post -Body $refreshBody -ContentType "application/json"
    throw "SECURITY VULNERABILITY: Revoked refresh token was accepted!"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host " [PASS] Replay of revoked refresh token was properly rejected with HTTP 401 Unauthorized" -ForegroundColor Green
    } else {
        throw "Expected HTTP 401, got $statusCode"
    }
}

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "  TEST 6: Invalid / Fake Refresh Token Rejection" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

$fakeBody = @{ refreshToken = "completely_fake_invalid_token_12345" } | ConvertTo-Json
try {
    $fakeRes = Invoke-RestMethod -Uri "$baseUrl/auth/refresh" -Method Post -Body $fakeBody -ContentType "application/json"
    throw "SECURITY VULNERABILITY: Fake refresh token was accepted!"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host " [PASS] Fake refresh token rejected with HTTP 401 Unauthorized" -ForegroundColor Green
    } else {
        throw "Expected HTTP 401, got $statusCode"
    }
}

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "  TEST 7: Token Revocation (Logout) Endpoint" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

$revokeBody = @{
    refreshToken = $refreshToken2
} | ConvertTo-Json

$revokeRes = Invoke-RestMethod -Uri "$baseUrl/auth/revoke" -Method Post -Body $revokeBody -ContentType "application/json"
Write-Host "Revoke Response: $($revokeRes.message)"

# Try refreshing with the just-revoked token
try {
    $postRevokeRefresh = Invoke-RestMethod -Uri "$baseUrl/auth/refresh" -Method Post -Body $revokeBody -ContentType "application/json"
    throw "SECURITY VULNERABILITY: Revoked token was accepted after explicit revoke!"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host " [PASS] Revoked token cannot be used again (HTTP 401 Unauthorized)" -ForegroundColor Green
    } else {
        throw "Expected HTTP 401, got $statusCode"
    }
}

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "  TEST 8: Tampered JWT Access Token Rejection" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

$tamperedHeaders = @{
    Authorization = "Bearer $($accessToken2)tampered"
}
try {
    $tamperedRes = Invoke-RestMethod -Uri "$baseUrl/tasks/my-tasks" -Method Get -Headers $tamperedHeaders
    throw "SECURITY VULNERABILITY: Tampered JWT token was accepted!"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host " [PASS] Tampered JWT token rejected with HTTP 401 Unauthorized" -ForegroundColor Green
    } else {
        throw "Expected HTTP 401, got $statusCode"
    }
}

Write-Host "`n======================================================" -ForegroundColor Green
Write-Host "  ALL 8 SECURITY & INTEGRATION TESTS PASSED 100%!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
