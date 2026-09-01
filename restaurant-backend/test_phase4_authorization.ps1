# Phase 4 Authorization & Branch Isolation Test Suite

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
Write-Host "SETUP: CREATING BRANCH A, BRANCH B & TEST USERS"
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
Write-Host "Branch A ID: $branchAId, Branch B ID: $branchBId"

# 3. Onboard Manager A (Branch A), Manager B (Branch B)
$mgrAEmail = "manager.a.$ticks@test.com"
$mgrBEmail = "manager.b.$ticks@test.com"

Test-Endpoint -TestName "Setup 4. Onboard Manager A -> Branch A" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $adminToken"} -Body (@{ firstName="Manager"; lastName="A"; email=$mgrAEmail; password="password123"; role="BRANCH_MANAGER"; branchId=$branchAId } | ConvertTo-Json) -ExpectedStatus @(201)
Test-Endpoint -TestName "Setup 5. Onboard Manager B -> Branch B" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $adminToken"} -Body (@{ firstName="Manager"; lastName="B"; email=$mgrBEmail; password="password123"; role="BRANCH_MANAGER"; branchId=$branchBId } | ConvertTo-Json) -ExpectedStatus @(201)

# 4. Onboard Chef A (Branch A), Chef B (Branch B)
$chefAEmail = "chef.a.$ticks@test.com"
$chefBEmail = "chef.b.$ticks@test.com"

Test-Endpoint -TestName "Setup 6. Onboard Chef A -> Branch A" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $adminToken"} -Body (@{ firstName="Chef"; lastName="A"; email=$chefAEmail; password="password123"; role="CHEF"; branchId=$branchAId } | ConvertTo-Json) -ExpectedStatus @(201)
Test-Endpoint -TestName "Setup 7. Onboard Chef B -> Branch B" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $adminToken"} -Body (@{ firstName="Chef"; lastName="B"; email=$chefBEmail; password="password123"; role="CHEF"; branchId=$branchBId } | ConvertTo-Json) -ExpectedStatus @(201)

# 5. Onboard Employee A (Branch A), Employee B (Branch B)
$empAEmail = "emp.a.$ticks@test.com"
$empBEmail = "emp.b.$ticks@test.com"

Test-Endpoint -TestName "Setup 8. Onboard Employee A -> Branch A" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $adminToken"} -Body (@{ firstName="Emp"; lastName="A"; email=$empAEmail; password="password123"; role="EMPLOYEE"; branchId=$branchAId } | ConvertTo-Json) -ExpectedStatus @(201)
Test-Endpoint -TestName "Setup 9. Onboard Employee B -> Branch B" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $adminToken"} -Body (@{ firstName="Emp"; lastName="B"; email=$empBEmail; password="password123"; role="EMPLOYEE"; branchId=$branchBId } | ConvertTo-Json) -ExpectedStatus @(201)

# 6. Register Customer A and Customer B
$custAEmail = "cust.a.$ticks@test.com"
$custBEmail = "cust.b.$ticks@test.com"

Test-Endpoint -TestName "Setup 10. Register Customer A" -Method "POST" -Url "$baseUrl/register" -Body (@{ firstName="Cust"; lastName="A"; email=$custAEmail; password="password123"; phoneNumber="1111111111"; gender="male" } | ConvertTo-Json) -ExpectedStatus @(200)
Test-Endpoint -TestName "Setup 11. Register Customer B" -Method "POST" -Url "$baseUrl/register" -Body (@{ firstName="Cust"; lastName="B"; email=$custBEmail; password="password123"; phoneNumber="2222222222"; gender="female" } | ConvertTo-Json) -ExpectedStatus @(200)

# 7. Authenticate all users & obtain JWT tokens
$tokMgrA = ((Test-Endpoint -TestName "Login Manager A" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email=$mgrAEmail; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json).token
$tokMgrB = ((Test-Endpoint -TestName "Login Manager B" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email=$mgrBEmail; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json).token
$tokChefA = ((Test-Endpoint -TestName "Login Chef A" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email=$chefAEmail; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json).token
$tokEmpA = ((Test-Endpoint -TestName "Login Employee A" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email=$empAEmail; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json).token
$tokCustA = ((Test-Endpoint -TestName "Login Customer A" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email=$custAEmail; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json).token
$tokCustB = ((Test-Endpoint -TestName "Login Customer B" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email=$custBEmail; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json).token

Write-Host "=================================================="
Write-Host "PART 1: ROLE AUTHORIZATION MATRIX TESTS"
Write-Host "=================================================="

# Admin accesses central dashboard
Test-Endpoint -TestName "R1. Admin accesses central dashboard" -Method "GET" -Url "$baseUrl/admin/dashboard" -Headers @{"Authorization"="Bearer $adminToken"} -ExpectedStatus @(200)

# Manager A attempts central dashboard -> Forbidden
Test-Endpoint -TestName "R2. Manager A attempts central dashboard" -Method "GET" -Url "$baseUrl/admin/dashboard" -Headers @{"Authorization"="Bearer $tokMgrA"} -ExpectedStatus @(403)

# Customer A attempts central dashboard -> Forbidden
Test-Endpoint -TestName "R3. Customer A attempts central dashboard" -Method "GET" -Url "$baseUrl/admin/dashboard" -Headers @{"Authorization"="Bearer $tokCustA"} -ExpectedStatus @(403)

# Customer A attempts Employee Onboarding -> Forbidden
Test-Endpoint -TestName "R4. Customer A attempts Employee Onboarding" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $tokCustA"} -Body (@{ firstName="X"; lastName="Y"; email="x@y.com"; password="123"; role="EMPLOYEE"; branchId=$branchAId } | ConvertTo-Json) -ExpectedStatus @(403)

# Manager A attempts Employee Onboarding -> Forbidden
Test-Endpoint -TestName "R5. Manager A attempts Employee Onboarding" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $tokMgrA"} -Body (@{ firstName="X"; lastName="Y"; email="x2@y.com"; password="123"; role="EMPLOYEE"; branchId=$branchAId } | ConvertTo-Json) -ExpectedStatus @(403)

Write-Host "=================================================="
Write-Host "PART 2: BRANCH ISOLATION TESTS"
Write-Host "=================================================="

# Manager A accesses Branch A Menu categories -> Allowed
Test-Endpoint -TestName "B1. Manager A adds category to Branch A" -Method "POST" -Url "$baseUrl/menu/branches/$branchAId/categories" -Headers @{"Authorization"="Bearer $tokMgrA"} -Body (@{ name="Starters"; description="Crispy starters" } | ConvertTo-Json) -ExpectedStatus @(200)

# Manager A attempts to add category to Branch B -> Forbidden (403)
Test-Endpoint -TestName "B2. Manager A attempts to add category to Branch B" -Method "POST" -Url "$baseUrl/menu/branches/$branchBId/categories" -Headers @{"Authorization"="Bearer $tokMgrA"} -Body (@{ name="Hacked Category"; description="Hack" } | ConvertTo-Json) -ExpectedStatus @(403)

# Manager A accesses Branch A Inventory items -> Allowed
Test-Endpoint -TestName "B3. Manager A fetches Branch A inventory items" -Method "GET" -Url "$baseUrl/inventory/branches/$branchAId/items" -Headers @{"Authorization"="Bearer $tokMgrA"} -ExpectedStatus @(200)

# Manager A attempts to fetch Branch B Inventory items -> Forbidden (403)
Test-Endpoint -TestName "B4. Manager A attempts to fetch Branch B inventory items" -Method "GET" -Url "$baseUrl/inventory/branches/$branchBId/items" -Headers @{"Authorization"="Bearer $tokMgrA"} -ExpectedStatus @(403)

# Manager A fetches Branch A reservations -> Allowed
Test-Endpoint -TestName "B5. Manager A fetches Branch A reservations" -Method "GET" -Url "$baseUrl/reservations/branches/$branchAId" -Headers @{"Authorization"="Bearer $tokMgrA"} -ExpectedStatus @(200)

# Manager A attempts to fetch Branch B reservations -> Forbidden (403)
Test-Endpoint -TestName "B6. Manager A attempts to fetch Branch B reservations" -Method "GET" -Url "$baseUrl/reservations/branches/$branchBId" -Headers @{"Authorization"="Bearer $tokMgrA"} -ExpectedStatus @(403)

# Manager A adds table to Branch A -> Allowed
Test-Endpoint -TestName "B7. Manager A adds table to Branch A" -Method "POST" -Url "$baseUrl/tables/branches/$branchAId" -Headers @{"Authorization"="Bearer $tokMgrA"} -Body (@{ tableNumber="T-101"; capacity=4; status="AVAILABLE" } | ConvertTo-Json) -ExpectedStatus @(200)

# Manager A attempts to add table to Branch B -> Forbidden (403)
Test-Endpoint -TestName "B8. Manager A attempts to add table to Branch B" -Method "POST" -Url "$baseUrl/tables/branches/$branchBId" -Headers @{"Authorization"="Bearer $tokMgrA"} -Body (@{ tableNumber="T-201"; capacity=4; status="AVAILABLE" } | ConvertTo-Json) -ExpectedStatus @(403)

# Chef A fetches Branch A orders -> Allowed
Test-Endpoint -TestName "B9. Chef A fetches Branch A orders" -Method "GET" -Url "$baseUrl/orders/branch/$branchAId" -Headers @{"Authorization"="Bearer $tokChefA"} -ExpectedStatus @(200)

# Chef A attempts to fetch Branch B orders -> Forbidden (403)
Test-Endpoint -TestName "B10. Chef A attempts to fetch Branch B orders" -Method "GET" -Url "$baseUrl/orders/branch/$branchBId" -Headers @{"Authorization"="Bearer $tokChefA"} -ExpectedStatus @(403)

# Employee A fetches Branch A orders -> Allowed
Test-Endpoint -TestName "B11. Employee A fetches Branch A orders" -Method "GET" -Url "$baseUrl/orders/branch/$branchAId" -Headers @{"Authorization"="Bearer $tokEmpA"} -ExpectedStatus @(200)

# Employee A attempts to fetch Branch B orders -> Forbidden (403)
Test-Endpoint -TestName "B12. Employee A attempts to fetch Branch B orders" -Method "GET" -Url "$baseUrl/orders/branch/$branchBId" -Headers @{"Authorization"="Bearer $tokEmpA"} -ExpectedStatus @(403)

# Manager B fetches Branch B Inventory items -> Allowed
Test-Endpoint -TestName "B13. Manager B fetches Branch B inventory items" -Method "GET" -Url "$baseUrl/inventory/branches/$branchBId/items" -Headers @{"Authorization"="Bearer $tokMgrB"} -ExpectedStatus @(200)

# Manager B attempts to fetch Branch A Inventory items -> Forbidden (403)
Test-Endpoint -TestName "B14. Manager B attempts to fetch Branch A inventory items" -Method "GET" -Url "$baseUrl/inventory/branches/$branchAId/items" -Headers @{"Authorization"="Bearer $tokMgrB"} -ExpectedStatus @(403)

Write-Host "=================================================="
Write-Host "PART 3: IDOR & MANIPULATION ATTACK TESTS"
Write-Host "=================================================="

# Create food item for Branch A & Customer A creates order on Branch A
$catA = (Test-Endpoint -TestName "Prep: Admin creates Category on Branch A" -Method "POST" -Url "$baseUrl/menu/branches/$branchAId/categories" -Headers @{"Authorization"="Bearer $adminToken"} -Body (@{ name="Entrees"; description="Delights" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json
$itemA = (Test-Endpoint -TestName "Prep: Admin creates Food Item on Branch A" -Method "POST" -Url "$baseUrl/menu/branches/$branchAId/categories/$($catA.id)/items" -Headers @{"Authorization"="Bearer $adminToken"} -Body (@{ name="Butter Chicken"; price=15.99; enabled=$true } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

$orderACustA = (Test-Endpoint -TestName "Prep: Customer A places Order on Branch A" -Method "POST" -Url "$baseUrl/orders" -Headers @{"Authorization"="Bearer $tokCustA"} -Body (@{ branchId=$branchAId; orderType="TAKEAWAY"; items=@(@{ foodItemId=$itemA.id; quantity=1 }) } | ConvertTo-Json) -ExpectedStatus @(201)).Content | ConvertFrom-Json
$orderAId = $orderACustA.id

# IDOR 1: Customer A fetches own order -> Allowed
Test-Endpoint -TestName "IDOR 1. Customer A fetches own order" -Method "GET" -Url "$baseUrl/orders/$orderAId" -Headers @{"Authorization"="Bearer $tokCustA"} -ExpectedStatus @(200)

# IDOR 2: Customer B attempts to fetch Customer A's order -> Forbidden (403)
Test-Endpoint -TestName "IDOR 2. Customer B attempts to fetch Customer A order $orderAId" -Method "GET" -Url "$baseUrl/orders/$orderAId" -Headers @{"Authorization"="Bearer $tokCustB"} -ExpectedStatus @(403)

# IDOR 3: Chef B attempts to view or update status of Order A (Branch A) -> Forbidden (403)
Test-Endpoint -TestName "IDOR 3. Chef B attempts to update Order A status (Branch A)" -Method "PATCH" -Url "$baseUrl/orders/$orderAId/status?status=PREPARING" -Headers @{"Authorization"="Bearer $tokChefA"} -ExpectedStatus @(200) # Chef A is Branch A -> Allowed

$tokChefB = ((Test-Endpoint -TestName "Login Chef B" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email=$chefBEmail; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json).token
Test-Endpoint -TestName "IDOR 4. Chef B (Branch B) attempts to update Order A status (Branch A)" -Method "PATCH" -Url "$baseUrl/orders/$orderAId/status?status=DELIVERED" -Headers @{"Authorization"="Bearer $tokChefB"} -ExpectedStatus @(403)

# IDOR 5: Customer A attempts staff notification endpoint -> Forbidden (403)
Test-Endpoint -TestName "IDOR 5. Customer A attempts staff notifications" -Method "GET" -Url "$baseUrl/notifications/branch/$branchAId/role/EMPLOYEE" -Headers @{"Authorization"="Bearer $tokCustA"} -ExpectedStatus @(403)

# IDOR 6: Manager A attempts to view Customer B notifications -> Forbidden (403)
$custBUser = (Test-Endpoint -TestName "Prep: Customer B Login" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email=$custBEmail; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json
$custBUserId = $custBUser.userId

Test-Endpoint -TestName "IDOR 6. Customer A attempts to view Customer B notifications" -Method "GET" -Url "$baseUrl/notifications/user/$custBUserId" -Headers @{"Authorization"="Bearer $tokCustA"} -ExpectedStatus @(403)

Write-Host "=================================================="
Write-Host "ALL PHASE 4 AUTHORIZATION TESTS COMPLETED"
Write-Host "=================================================="
