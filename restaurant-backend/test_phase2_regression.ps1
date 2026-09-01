# Phase 2 Regression Test Suite

$baseUrl = "http://localhost:8080/api"

function Test-Endpoint {
    param(
        [string]$TestName,
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [string]$Body = "",
        [int[]]$ExpectedStatus = @(200)
    )
    
    $headersObj = @{ "Content-Type" = "application/json" }
    foreach ($k in $Headers.Keys) { $headersObj[$k] = $Headers[$k] }

    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $headersObj
            UseBasicParsing = $true
        }
        if ($Body -and ($Method -eq "POST" -or $Method -eq "PUT" -or $Method -eq "PATCH")) {
            $params["Body"] = $Body
        }

        $resp = Invoke-WebRequest @params
        $statusCode = [int]$resp.StatusCode
        $passed = $ExpectedStatus -contains $statusCode
        Write-Host "[$([string]::Format('{0,-4}', $passed))] $TestName (Status: $statusCode, Expected: $($ExpectedStatus -join '/'))"
        return @{ Name = $TestName; Passed = $passed; StatusCode = $statusCode; Content = $resp.Content }
    }
    catch {
        $statusCode = [int]$_.Exception.Response.StatusCode
        $passed = $ExpectedStatus -contains $statusCode
        $body = ""
        if ($_.Exception.Response) {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $body = $reader.ReadToEnd()
        }
        Write-Host "[$([string]::Format('{0,-4}', $passed))] $TestName (Status: $statusCode, Expected: $($ExpectedStatus -join '/'))"
        return @{ Name = $TestName; Passed = $passed; StatusCode = $statusCode; Content = $body }
    }
}

Write-Host "=================================================="
Write-Host "PHASE 2 REGRESSION TESTS"
Write-Host "=================================================="

# 1. Admin Login
$loginBody = '{"email":"admin1@gmail.com","password":"admin@1"}'
$adminLogin = Test-Endpoint -TestName "R1. Admin Login" -Method "POST" -Url "$baseUrl/auth/login" -Body $loginBody -ExpectedStatus @(200)
$adminToken = ($adminLogin.Content | ConvertFrom-Json).token

# 2. Admin creates Category & Food Item for Branch 2
$catBody = @{ name = "Main Course"; description = "Delicious entrees" } | ConvertTo-Json
$createCat = Test-Endpoint -TestName "R2. Admin creates Category" -Method "POST" -Url "$baseUrl/menu/branches/2/categories" -Headers @{"Authorization"="Bearer $adminToken"} -Body $catBody -ExpectedStatus @(200)
$catId = ($createCat.Content | ConvertFrom-Json).id

$itemBody = @{ name = "Paneer Butter Masala"; description = "Rich gravy with fresh paneer"; price = 14.99; enabled = $true } | ConvertTo-Json
$createItem = Test-Endpoint -TestName "R3. Admin creates Food Item" -Method "POST" -Url "$baseUrl/menu/branches/2/categories/$catId/items" -Headers @{"Authorization"="Bearer $adminToken"} -Body $itemBody -ExpectedStatus @(200)
$itemId = ($createItem.Content | ConvertFrom-Json).id
Write-Host "Created Food Item ID: $itemId"

# 3. Customer fetches menu
$getMenu = Test-Endpoint -TestName "R4. Get Customer Menu for Branch 2" -Method "GET" -Url "$baseUrl/menu/branches/2/customer-menu" -ExpectedStatus @(200)

# 4. Create 2 distinct customers
$c1Email = "cust1_$([System.DateTime]::Now.Ticks)@test.com"
$c2Email = "cust2_$([System.DateTime]::Now.Ticks)@test.com"

$c1Reg = Test-Endpoint -TestName "R5. Customer 1 Registration" -Method "POST" -Url "$baseUrl/register" -Body (@{ firstName="C1"; lastName="User"; email=$c1Email; password="password123"; phoneNumber="1111111111"; gender="male" } | ConvertTo-Json) -ExpectedStatus @(200)
$c2Reg = Test-Endpoint -TestName "R6. Customer 2 Registration" -Method "POST" -Url "$baseUrl/register" -Body (@{ firstName="C2"; lastName="User"; email=$c2Email; password="password123"; phoneNumber="2222222222"; gender="female" } | ConvertTo-Json) -ExpectedStatus @(200)

$c1Login = Test-Endpoint -TestName "R7. Customer 1 Login" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email=$c1Email; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)
$c1Token = ($c1Login.Content | ConvertFrom-Json).token

$c2Login = Test-Endpoint -TestName "R8. Customer 2 Login" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email=$c2Email; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)
$c2Token = ($c2Login.Content | ConvertFrom-Json).token

# 5. Place Takeaway Order for Customer 1
$takeawayOrder = @{
    branchId = 2
    orderType = "TAKEAWAY"
    items = @(
        @{ foodItemId = $itemId; quantity = 2 }
    )
} | ConvertTo-Json
$createOrder1 = Test-Endpoint -TestName "R9. Customer 1 creates TAKEAWAY Order" -Method "POST" -Url "$baseUrl/orders" -Headers @{"Authorization"="Bearer $c1Token"} -Body $takeawayOrder -ExpectedStatus @(201)
$order1Id = ($createOrder1.Content | ConvertFrom-Json).id
Write-Host "Created Order 1 ID: $order1Id"

# 6. Customer 1 fetches own order
$c1GetOrder = Test-Endpoint -TestName "R10. Customer 1 fetches own Order $order1Id" -Method "GET" -Url "$baseUrl/orders/$order1Id" -Headers @{"Authorization"="Bearer $c1Token"} -ExpectedStatus @(200)

# 7. Customer 2 attempts to fetch Customer 1's order -> MUST FAIL with 403 Forbidden
$c2GetOrder1 = Test-Endpoint -TestName "R11. Customer 2 attempts to fetch Customer 1 Order $order1Id (Security Isolation)" -Method "GET" -Url "$baseUrl/orders/$order1Id" -Headers @{"Authorization"="Bearer $c2Token"} -ExpectedStatus @(403)

# 8. Customer 1 fetches /api/orders/my
$c1MyOrders = Test-Endpoint -TestName "R12. Customer 1 fetches My Orders" -Method "GET" -Url "$baseUrl/orders/my" -Headers @{"Authorization"="Bearer $c1Token"} -ExpectedStatus @(200)

Write-Host "=================================================="
Write-Host "ALL PHASE 2 REGRESSION TESTS EXECUTED"
Write-Host "=================================================="
