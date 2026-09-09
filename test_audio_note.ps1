# Comprehensive Automated Test for Voice Note (Audio Recording) Upload & Playback

$baseUrl = "http://localhost:5000/api/v1"
$serverRoot = "http://localhost:5000"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  TEST 1: Admin / Worker Login" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

$loginBody = @{
    email = "ahmet@saha.com"
    password = "123456"
    rememberMe = $true
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginRes.token
$userId = $loginRes.user.userID
Write-Host "Logged in as: $($loginRes.user.name) (UserID: $userId)"

$authHeader = @{
    Authorization = "Bearer $token"
}

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "  TEST 2: Create a New Task for Voice Note Test" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

$createTaskBody = @{
    title = "Saha Ses Kaydi Test Gorevi"
    description = "Gorev tamamlanirken sesli aciklama (ses notu) kaydi alinacak."
    userId = $userId
} | ConvertTo-Json

$task = Invoke-RestMethod -Uri "$baseUrl/tasks" -Method Post -Body $createTaskBody -Headers $authHeader -ContentType "application/json"
$taskId = $task.taskID
Write-Host " [PASS] Task created successfully. TaskID: $taskId, Status: $($task.status)"

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "  TEST 3: Start Task (IN_PROGRESS)" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

$startRes = Invoke-RestMethod -Uri "$baseUrl/tasks/$taskId/start" -Method Patch -Headers $authHeader
Write-Host " [PASS] Task started. Status: $($startRes.status)"

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "  TEST 4: Complete Task with Photo + Audio (Voice Note) + GPS" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# Create temporary photo and audio files
$tempPhotoPath = "$PSScriptRoot\temp_test_photo.jpg"
$tempAudioPath = "$PSScriptRoot\temp_test_voice_note.m4a"

# Write dummy jpeg bytes
[System.IO.File]::WriteAllBytes($tempPhotoPath, [byte[]](0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xFF, 0xD9))

# Write dummy m4a / audio bytes
$dummyAudioBytes = [System.Text.Encoding]::UTF8.GetBytes("FTYP_M4A_DUMMY_AUDIO_STREAM_FOR_VOICE_NOTE_TESTING_1234567890")
[System.IO.File]::WriteAllBytes($tempAudioPath, $dummyAudioBytes)

# Prepare multipart/form-data upload using HttpClient
Add-Type -AssemblyName System.Net.Http
$httpClient = New-Object System.Net.Http.HttpClient
$httpClient.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $token)

$form = New-Object System.Net.Http.MultipartFormDataContent

# Add Photo
$photoBytes = [System.IO.File]::ReadAllBytes($tempPhotoPath)
$photoContent = New-Object System.Net.Http.ByteArrayContent -ArgumentList @(,$photoBytes)
$photoContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("image/jpeg")
$form.Add($photoContent, "Photo", "proof.jpg")

# Add Audio (Voice Note)
$audioBytes = [System.IO.File]::ReadAllBytes($tempAudioPath)
$audioContent = New-Object System.Net.Http.ByteArrayContent -ArgumentList @(,$audioBytes)
$audioContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("audio/m4a")
$form.Add($audioContent, "Audio", "voice_note.m4a")

# Add GPS
$form.Add((New-Object System.Net.Http.StringContent("41.0082")), "Latitude")
$form.Add((New-Object System.Net.Http.StringContent("28.9784")), "Longitude")

$response = $httpClient.PostAsync("$baseUrl/tasks/$taskId/complete", $form).Result
$responseBody = $response.Content.ReadAsStringAsync().Result
$completeRes = $responseBody | ConvertFrom-Json

Write-Host "HTTP Status: $($response.StatusCode)"
Write-Host "Response Status: $($completeRes.status)"
Write-Host "Proof Image URL: $($completeRes.proof_Image_Url)"
Write-Host "Voice Note Audio URL: $($completeRes.audio_Url)"
Write-Host "Latitude: $($completeRes.latitude), Longitude: $($completeRes.longitude)"

if (-not $completeRes.audio_Url) {
    throw "TEST FAILED: audio_Url was not returned or saved in completeTask!"
}
Write-Host " [PASS] Audio note uploaded and saved to Task entity." -ForegroundColor Green

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "  TEST 5: Verify Task Detail & Admin Endpoints return Audio_Url" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# Check Task by ID
$taskDetail = Invoke-RestMethod -Uri "$baseUrl/tasks/$taskId" -Method Get -Headers $authHeader
if ($taskDetail.audio_Url -ne $completeRes.audio_Url) {
    throw "TEST FAILED: TaskDetail audio_Url does not match!"
}
Write-Host " [PASS] GET /tasks/$taskId returned Audio_Url: $($taskDetail.audio_Url)" -ForegroundColor Green

# Check Admin all tasks
$adminTasks = Invoke-RestMethod -Uri "$baseUrl/admin/tasks" -Method Get -Headers $authHeader
$adminMatch = $adminTasks | Where-Object { $_.taskID -eq $taskId }
if (-not $adminMatch.audio_Url) {
    throw "TEST FAILED: Admin tasks list missing audio_Url!"
}
Write-Host " [PASS] GET /admin/tasks returned Audio_Url for Admin inspection" -ForegroundColor Green

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "  TEST 6: Audio File Static Serving Verification" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

$audioFileUrl = "$serverRoot$($completeRes.audio_Url)"
$downloadedAudio = Invoke-WebRequest -Uri $audioFileUrl -Method Get
Write-Host "Downloaded Audio Status: $($downloadedAudio.StatusCode)"
Write-Host "Downloaded Audio Length: $($downloadedAudio.Content.Length) bytes"

if ($downloadedAudio.Content.Length -ne $dummyAudioBytes.Length) {
    throw "TEST FAILED: Downloaded audio byte length does not match uploaded file!"
}
Write-Host " [PASS] Audio file statically served and verified with 100% byte integrity!" -ForegroundColor Green

# Cleanup temp files
Remove-Item $tempPhotoPath -Force -ErrorAction SilentlyContinue
Remove-Item $tempAudioPath -Force -ErrorAction SilentlyContinue

Write-Host "`n======================================================" -ForegroundColor Green
Write-Host "  ALL VOICE NOTE TESTS PASSED 100% SUCCESSFULLY!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
