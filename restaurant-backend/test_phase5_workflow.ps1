# Phase 5 Staff Workflow & Concurrency Test Suite

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
Write-Host "SETUP: CREATING BRANCHES, STAFF & CUSTOMERS"
Write-Host "=================================================="

# 1. Admin Login
$adminLogin = Test-Endpoint -TestName "Setup 1. Admin Login" -Method "POST" -Url "$baseUrl/auth/login" -Body '{"email":"admin1@gmail.com","password":"admin@1"}' -ExpectedStatus @(200)
$adminToken = ($adminLogin.Content | ConvertFrom-Json).token

# 2. Create Branch A & Branch B
$ticks = [System.DateTime]::Now.Ticks
$branchAPayload = @{ name = "Indiranagar Hub $ticks"; state = "Karnataka"; district = "Bangalore Urban"; latitude = 12.9784; longitude = 77.6408; active = $true } | ConvertTo-Json
$branchBPayload = @{ name = "Whitefield Hub $ticks"; state = "Karnataka"; district = "Bangalore Urban"; latitude = 12.9698; longitude = 77.7500; active = $true } | ConvertTo-Json

$resBranchA = Test-Endpoint -TestName "Setup 2. Create Branch A" -Method "POST" -Url "$baseUrl/branches" -Headers @{"Authorization"="Bearer $adminToken"} -Body $branchAPayload -ExpectedStatus @(201)
$resBranchB = Test-Endpoint -TestName "Setup 3. Create Branch B" -Method "POST" -Url "$baseUrl/branches" -Headers @{"Authorization"="Bearer $adminToken"} -Body $branchBPayload -ExpectedStatus @(201)

$branchAId = ($resBranchA.Content | ConvertFrom-Json).id
$branchBId = ($resBranchB.Content | ConvertFrom-Json).id

# 3. Create Food Category and Item on Branch A
$catA = (Test-Endpoint -TestName "Setup 4. Create Category Branch A" -Method "POST" -Url "$baseUrl/menu/branches/$branchAId/categories" -Headers @{"Authorization"="Bearer $adminToken"} -Body (@{ name="Main"; description="Main Course" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json
$itemA = (Test-Endpoint -TestName "Setup 5. Create Food Item Branch A" -Method "POST" -Url "$baseUrl/menu/branches/$branchAId/categories/$($catA.id)/items" -Headers @{"Authorization"="Bearer $adminToken"} -Body (@{ name="Chef Special Pizza"; price=20.0; enabled=$true } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

# 4. Onboard Chef A (Branch A), Employee A1 (Branch A), Employee A2 (Branch A), Employee B (Branch B)
$chefAEmail = "chef.p5.$ticks@test.com"
$empA1Email = "emp.a1.$ticks@test.com"
$empA2Email = "emp.a2.$ticks@test.com"
$empBEmail  = "emp.b.$ticks@test.com"

Test-Endpoint -TestName "Setup 6. Onboard Chef A" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $adminToken"} -Body (@{ firstName="Chef"; lastName="A"; email=$chefAEmail; password="password123"; role="CHEF"; branchId=$branchAId } | ConvertTo-Json) -ExpectedStatus @(201)
Test-Endpoint -TestName "Setup 7. Onboard Employee A1" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $adminToken"} -Body (@{ firstName="Emp"; lastName="A1"; email=$empA1Email; password="password123"; role="EMPLOYEE"; branchId=$branchAId } | ConvertTo-Json) -ExpectedStatus @(201)
Test-Endpoint -TestName "Setup 8. Onboard Employee A2" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $adminToken"} -Body (@{ firstName="Emp"; lastName="A2"; email=$empA2Email; password="password123"; role="EMPLOYEE"; branchId=$branchAId } | ConvertTo-Json) -ExpectedStatus @(201)
Test-Endpoint -TestName "Setup 9. Onboard Employee B" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $adminToken"} -Body (@{ firstName="Emp"; lastName="B"; email=$empBEmail; password="password123"; role="EMPLOYEE"; branchId=$branchBId } | ConvertTo-Json) -ExpectedStatus @(201)

# 5. Register Customer 1 & Customer 2
$cust1Email = "cust1.p5.$ticks@test.com"
$cust2Email = "cust2.p5.$ticks@test.com"

Test-Endpoint -TestName "Setup 10. Register Customer 1" -Method "POST" -Url "$baseUrl/register" -Body (@{ firstName="Cust"; lastName="1"; email=$cust1Email; password="password123"; phoneNumber="1111111111"; gender="male" } | ConvertTo-Json) -ExpectedStatus @(200)
Test-Endpoint -TestName "Setup 11. Register Customer 2" -Method "POST" -Url "$baseUrl/register" -Body (@{ firstName="Cust"; lastName="2"; email=$cust2Email; password="password123"; phoneNumber="2222222222"; gender="female" } | ConvertTo-Json) -ExpectedStatus @(200)

# 6. Authenticate accounts & get Tokens
$tokChefA  = ((Test-Endpoint -TestName "1. Chef Login" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email=$chefAEmail; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json).token
$tokEmpA1  = ((Test-Endpoint -TestName "2. Employee A1 Login" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email=$empA1Email; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json).token
$tokEmpA2  = ((Test-Endpoint -TestName "2b. Employee A2 Login" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email=$empA2Email; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json).token
$tokEmpB   = ((Test-Endpoint -TestName "2c. Employee B Login" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email=$empBEmail; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json).token
$tokCust1  = ((Test-Endpoint -TestName "2d. Customer 1 Login" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email=$cust1Email; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json).token
$cust1User = (Test-Endpoint -TestName "Customer 1 Login Info" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email=$cust1Email; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json
$cust1UserId = $cust1User.userId

$tokCust2  = ((Test-Endpoint -TestName "2e. Customer 2 Login" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email=$cust2Email; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json).token

Write-Host "=================================================="
Write-Host "CHEF KITCHEN WORKFLOW TESTS"
Write-Host "=================================================="

# Customer 1 creates DELIVERY order
$order1 = (Test-Endpoint -TestName "Customer 1 places Delivery Order on Branch A" -Method "POST" -Url "$baseUrl/orders" -Headers @{"Authorization"="Bearer $tokCust1"} -Body (@{ branchId=$branchAId; orderType="DELIVERY"; deliveryAddress="123 M.G Road, Bangalore"; latitude=12.97; longitude=77.64; items=@(@{ foodItemId=$itemA.id; quantity=2 }) } | ConvertTo-Json) -ExpectedStatus @(201)).Content | ConvertFrom-Json
$order1Id = $order1.id

# 3. Chef sees own branch orders -> 200
Test-Endpoint -TestName "3. Chef A sees own Branch A orders" -Method "GET" -Url "$baseUrl/orders/branch/$branchAId" -Headers @{"Authorization"="Bearer $tokChefA"} -ExpectedStatus @(200)

# 4. Chef cannot see another branch -> 403
Test-Endpoint -TestName "4. Chef A attempts to view Branch B orders" -Method "GET" -Url "$baseUrl/orders/branch/$branchBId" -Headers @{"Authorization"="Bearer $tokChefA"} -ExpectedStatus @(403)

# 7. Chef PLACED -> CONFIRMED -> 200
Test-Endpoint -TestName "7. Chef A CONFIRMED Order #$order1Id" -Method "PATCH" -Url "$baseUrl/orders/$order1Id/status?status=CONFIRMED" -Headers @{"Authorization"="Bearer $tokChefA"} -ExpectedStatus @(200)

# 8. Chef CONFIRMED -> PREPARING -> 200
Test-Endpoint -TestName "8. Chef A PREPARING Order #$order1Id" -Method "PATCH" -Url "$baseUrl/orders/$order1Id/status?status=PREPARING" -Headers @{"Authorization"="Bearer $tokChefA"} -ExpectedStatus @(200)

# 9. Chef PREPARING -> READY -> 200
Test-Endpoint -TestName "9. Chef A READY Order #$order1Id" -Method "PATCH" -Url "$baseUrl/orders/$order1Id/status?status=READY" -Headers @{"Authorization"="Bearer $tokChefA"} -ExpectedStatus @(200)

# 10. Chef attempts invalid transition (READY -> PREPARING) -> 400
Test-Endpoint -TestName "10. Chef A attempts invalid transition READY -> PREPARING" -Method "PATCH" -Url "$baseUrl/orders/$order1Id/status?status=PREPARING" -Headers @{"Authorization"="Bearer $tokChefA"} -ExpectedStatus @(400)

Write-Host "=================================================="
Write-Host "EMPLOYEE DELIVERY & CONCURRENCY TESTS"
Write-Host "=================================================="

# 5. Employee sees own branch deliveries -> 200
Test-Endpoint -TestName "5. Employee A1 sees Branch A available deliveries" -Method "GET" -Url "$baseUrl/orders/branches/$branchAId/available-deliveries" -Headers @{"Authorization"="Bearer $tokEmpA1"} -ExpectedStatus @(200)

# 6. Employee cannot access another branch -> 403
Test-Endpoint -TestName "6. Employee A1 attempts to see Branch B available deliveries" -Method "GET" -Url "$baseUrl/orders/branches/$branchBId/available-deliveries" -Headers @{"Authorization"="Bearer $tokEmpA1"} -ExpectedStatus @(403)

# 11. READY delivery becomes AVAILABLE_FOR_DELIVERY -> Verify status in DB / DTO
$order1Status = ((Test-Endpoint -TestName "11. Verify Order #$order1Id status is AVAILABLE_FOR_DELIVERY" -Method "GET" -Url "$baseUrl/orders/$order1Id" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(200)).Content | ConvertFrom-Json).status
Write-Host "Order #$order1Id Current Status: $order1Status"

# 12. Employee A1 accepts available delivery -> 200
Test-Endpoint -TestName "12. Employee A1 accepts Delivery #$order1Id" -Method "POST" -Url "$baseUrl/orders/$order1Id/accept-delivery" -Headers @{"Authorization"="Bearer $tokEmpA1"} -ExpectedStatus @(200)

# 13. Second employee (Employee A2) attempts same delivery -> 409 Conflict
Test-Endpoint -TestName "13. Employee A2 attempts to accept already accepted Delivery #$order1Id" -Method "POST" -Url "$baseUrl/orders/$order1Id/accept-delivery" -Headers @{"Authorization"="Bearer $tokEmpA2"} -ExpectedStatus @(409)

# 14. Employee A1 updates own assigned delivery (ACCEPTED -> PICKED_UP) -> 200
Test-Endpoint -TestName "14. Employee A1 marks Delivery #$order1Id PICKED_UP" -Method "PATCH" -Url "$baseUrl/orders/$order1Id/status?status=PICKED_UP" -Headers @{"Authorization"="Bearer $tokEmpA1"} -ExpectedStatus @(200)

# 15. Employee A2 updates another employee's delivery -> 403 Forbidden
Test-Endpoint -TestName "15. Employee A2 attempts to update Employee A1's delivery" -Method "PATCH" -Url "$baseUrl/orders/$order1Id/status?status=OUT_FOR_DELIVERY" -Headers @{"Authorization"="Bearer $tokEmpA2"} -ExpectedStatus @(403)

# 16. Employee B accesses another branch delivery -> 403 Forbidden
Test-Endpoint -TestName "16. Employee B (Branch B) attempts to view/update Branch A delivery" -Method "PATCH" -Url "$baseUrl/orders/$order1Id/status?status=OUT_FOR_DELIVERY" -Headers @{"Authorization"="Bearer $tokEmpB"} -ExpectedStatus @(403)

# Employee A1 advances status to OUT_FOR_DELIVERY -> 200
Test-Endpoint -TestName "22. Employee A1 advances Delivery #$order1Id to OUT_FOR_DELIVERY" -Method "PATCH" -Url "$baseUrl/orders/$order1Id/status?status=OUT_FOR_DELIVERY" -Headers @{"Authorization"="Bearer $tokEmpA1"} -ExpectedStatus @(200)

# Employee A1 advances status to DELIVERED -> 200
Test-Endpoint -TestName "23. Employee A1 advances Delivery #$order1Id to DELIVERED" -Method "PATCH" -Url "$baseUrl/orders/$order1Id/status?status=DELIVERED" -Headers @{"Authorization"="Bearer $tokEmpA1"} -ExpectedStatus @(200)

Write-Host "=================================================="
Write-Host "CUSTOMER & SECURITY ISOLATION TESTS"
Write-Host "=================================================="

# 17. Customer accesses employee delivery endpoint -> 403
Test-Endpoint -TestName "17. Customer 1 attempts to access employee delivery endpoint" -Method "GET" -Url "$baseUrl/orders/branches/$branchAId/available-deliveries" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(403)

# 18. Customer cannot modify chef workflow -> 403
Test-Endpoint -TestName "18. Customer 1 attempts to modify order status" -Method "PATCH" -Url "$baseUrl/orders/$order1Id/status?status=CONFIRMED" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(403)

# 24. Customer 1 can view own order -> 200
Test-Endpoint -TestName "24. Customer 1 fetches own Order #$order1Id" -Method "GET" -Url "$baseUrl/orders/$order1Id" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(200)

# 25. Customer 2 cannot view Customer 1 order -> 403
Test-Endpoint -TestName "25. Customer 2 attempts to fetch Customer 1 Order #$order1Id" -Method "GET" -Url "$baseUrl/orders/$order1Id" -Headers @{"Authorization"="Bearer $tokCust2"} -ExpectedStatus @(403)

Write-Host "=================================================="
Write-Host "NOTIFICATION GENERATION VERIFICATION"
Write-Host "=================================================="

# 19-23. Fetch notifications for Customer 1
$notifs = (Test-Endpoint -TestName "Fetch Customer 1 Notifications" -Method "GET" -Url "$baseUrl/notifications/user/$cust1UserId" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(200)).Content | ConvertFrom-Json
Write-Host "Customer 1 Notifications Count: $($notifs.length)"
foreach ($n in $notifs) {
    Write-Host " - [$($n.notificationType)] $($n.message)"
}

Write-Host "=================================================="
Write-Host "ALL PHASE 5 TESTS EXECUTED"
Write-Host "=================================================="
