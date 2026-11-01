# PowerShell script to update cookies manually
# Usage: Edit the $cookieString variable below, then run: .\test-manual-update.ps1

$apiUrl = "https://backend-zbr5.onrender.com/api/cookies/manual"

# Replace this with your actual cookie string from the browser
$cookieString = "PASTE_YOUR_COOKIES_HERE"

$body = @{
    cookie = $cookieString
    userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
} | ConvertTo-Json

Write-Host "Updating cookies..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body -ContentType "application/json"
    Write-Host "`nSuccess!" -ForegroundColor Green
    Write-Host "Message: $($response.message)" -ForegroundColor Green
    Write-Host "Cookie Count: $($response.cookieCount)" -ForegroundColor Green
    Write-Host "Updated At: $($response.updatedAt)" -ForegroundColor Green
    
    Write-Host "`nVerifying..." -ForegroundColor Yellow
    $verify = Invoke-RestMethod -Uri "https://backend-zbr5.onrender.com/api/cookies"
    Write-Host "Cookies are now available! Source: $($verify.source)" -ForegroundColor Green
} catch {
    Write-Host "`nError:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
