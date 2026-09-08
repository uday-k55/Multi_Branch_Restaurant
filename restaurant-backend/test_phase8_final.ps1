# Phase 8 Final Comprehensive End-to-End Test Suite

$baseUrl = "http://localhost:8080/api"
$passCount = 0
$failCount = 0
$tests = @()

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
        if ($passed) {
            $script:passCount++
            Write-Host " [PASS] $TestName (Status: $statusCode, Expected: $($ExpectedStatus -join '/'))" -ForegroundColor Green
        } else {
            $script:failCount++
            Write-Host " [FAIL] $TestName (Status: $statusCode, Expected: $($ExpectedStatus -join '/'))" -ForegroundColor Red
            if ($resp.Content) { Write-Host "        Response: $($resp.Content)" -ForegroundColor Yellow }
        }
        $res = @{ Name = $TestName; Passed = $passed; StatusCode = $statusCode; Content = $resp.Content }
        $script:tests += $res
        return $res
    }
    catch {
        $statusCode = 0
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        $passed = $ExpectedStatus -contains $statusCode
        $body = ""
        if ($_.Exception.Response) {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $body = $reader.ReadToEnd()
        }
        if ($passed) {
            $script:passCount++
            Write-Host " [PASS] $TestName (Status: $statusCode, Expected: $($ExpectedStatus -join '/'))" -ForegroundColor Green
        } else {
            $script:failCount++
            Write-Host " [FAIL] $TestName (Status: $statusCode, Expected: $($ExpectedStatus -join '/'))" -ForegroundColor Red
            if ($body) { Write-Host "        Response: $body" -ForegroundColor Yellow }
            elseif ($_.Exception.Message) { Write-Host "        Exception: $($_.Exception.Message)" -ForegroundColor Yellow }
        }
        $res = @{ Name = $TestName; Passed = $passed; StatusCode = $statusCode; Content = $body }
        $script:tests += $res
        return $res
    }
}

$ticks = [DateTime]::Now.Ticks

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "PHASE 8 FINAL PRODUCTION READINESS TEST SUITE" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# ----------------------------------------------------
# 1. AUTHENTICATION & SEED SETUP
# ----------------------------------------------------
Write-Host "`n--- 1. AUTHENTICATION & SEED SETUP ---"
# Invalid Login test
Test-Endpoint -TestName "1.1 Invalid Login Rejection (/api/auth/login)" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email="admin1@gmail.com"; password="wrongpassword" } | ConvertTo-Json) -ExpectedStatus @(401)

# Admin Login
$adminLogin = (Test-Endpoint -TestName "1.2 Admin Login (/api/auth/login)" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email="admin1@gmail.com"; password="admin@1" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json
$tokAdmin = $adminLogin.token
$adminId = $adminLogin.userId

# Create Branch A and Branch B
$branchA = (Test-Endpoint -TestName "1.3 Admin Creates Branch Alpha" -Method "POST" -Url "$baseUrl/branches" -Headers @{"Authorization"="Bearer $tokAdmin"} -Body (@{ name="Branch P8 Alpha $ticks"; state="Kerala"; district="Kottayam"; address="Central Hub"; phone="9876543210"; latitude=9.59; longitude=76.52; active=$true } | ConvertTo-Json) -ExpectedStatus @(201)).Content | ConvertFrom-Json
$branchAId = $branchA.id

$branchB = (Test-Endpoint -TestName "1.4 Admin Creates Branch Beta" -Method "POST" -Url "$baseUrl/branches" -Headers @{"Authorization"="Bearer $tokAdmin"} -Body (@{ name="Branch P8 Beta $ticks"; state="Kerala"; district="Ernakulam"; address="North Hub"; phone="9876543211"; latitude=9.98; longitude=76.28; active=$true } | ConvertTo-Json) -ExpectedStatus @(201)).Content | ConvertFrom-Json
$branchBId = $branchB.id

# Onboard Staff for Branch A
$mgrA = (Test-Endpoint -TestName "1.5 Onboard Manager Alpha (Branch A)" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $tokAdmin"} -Body (@{ firstName="Manager"; lastName="Alpha"; email="mgrP8A_$ticks@test.com"; password="password123"; role="BRANCH_MANAGER"; branchId=$branchAId } | ConvertTo-Json) -ExpectedStatus @(201)).Content | ConvertFrom-Json
$tokMgrA = (Test-Endpoint -TestName "Login Manager Alpha" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email="mgrP8A_$ticks@test.com"; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json | Select-Object -ExpandProperty token

$chefA = (Test-Endpoint -TestName "1.6 Onboard Chef Alpha (Branch A)" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $tokAdmin"} -Body (@{ firstName="Chef"; lastName="Alpha"; email="chefP8A_$ticks@test.com"; password="password123"; role="CHEF"; branchId=$branchAId } | ConvertTo-Json) -ExpectedStatus @(201)).Content | ConvertFrom-Json
$tokChefA = (Test-Endpoint -TestName "Login Chef Alpha" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email="chefP8A_$ticks@test.com"; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json | Select-Object -ExpandProperty token

$empA1 = (Test-Endpoint -TestName "1.7 Onboard Employee A1 (Branch A)" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $tokAdmin"} -Body (@{ firstName="Employee"; lastName="A1"; email="empP8A1_$ticks@test.com"; password="password123"; role="EMPLOYEE"; branchId=$branchAId } | ConvertTo-Json) -ExpectedStatus @(201)).Content | ConvertFrom-Json
$tokEmpA1 = (Test-Endpoint -TestName "Login Employee A1" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email="empP8A1_$ticks@test.com"; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json | Select-Object -ExpandProperty token

$empA2 = (Test-Endpoint -TestName "1.8 Onboard Employee A2 (Branch A)" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $tokAdmin"} -Body (@{ firstName="Employee"; lastName="A2"; email="empP8A2_$ticks@test.com"; password="password123"; role="EMPLOYEE"; branchId=$branchAId } | ConvertTo-Json) -ExpectedStatus @(201)).Content | ConvertFrom-Json
$tokEmpA2 = (Test-Endpoint -TestName "Login Employee A2" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email="empP8A2_$ticks@test.com"; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json | Select-Object -ExpandProperty token

# Register Customers
$cust1 = (Test-Endpoint -TestName "1.9 Customer 1 Registration" -Method "POST" -Url "$baseUrl/register" -Body (@{ firstName="Alice"; lastName="Walker"; email="aliceP8_$ticks@test.com"; password="password123"; phoneNumber="9876543211"; gender="female" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json
$tokCust1 = (Test-Endpoint -TestName "Login Customer 1" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email="aliceP8_$ticks@test.com"; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json | Select-Object -ExpandProperty token

$cust2 = (Test-Endpoint -TestName "1.10 Customer 2 Registration" -Method "POST" -Url "$baseUrl/register" -Body (@{ firstName="Bob"; lastName="Smith"; email="bobP8_$ticks@test.com"; password="password123"; phoneNumber="9876543222"; gender="male" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json
$tokCust2 = (Test-Endpoint -TestName "Login Customer 2" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email="bobP8_$ticks@test.com"; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json | Select-Object -ExpandProperty token

# ----------------------------------------------------
# 2. MENU, TABLES & QR CODE TABLE ORDERING
# ----------------------------------------------------
Write-Host "`n--- 2. MENU, TABLES & QR CODE TABLE ORDERING ---"
$catA = (Test-Endpoint -TestName "2.1 Manager Alpha creates Category on Branch A" -Method "POST" -Url "$baseUrl/menu/branches/$branchAId/categories" -Headers @{"Authorization"="Bearer $tokMgrA"} -Body (@{ name="Steaks P8"; description="Prime Cuts" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json
$itemA = (Test-Endpoint -TestName "2.2 Manager Alpha creates Food Item on Branch A" -Method "POST" -Url "$baseUrl/menu/branches/$branchAId/categories/$($catA.id)/items" -Headers @{"Authorization"="Bearer $tokMgrA"} -Body (@{ name="Tomahawk Steak P8"; price=45.0; enabled=$true; isSeasonal=$false } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

$tableA = (Test-Endpoint -TestName "2.3 Manager Alpha creates Table 8 on Branch A" -Method "POST" -Url "$baseUrl/tables/branches/$branchAId" -Headers @{"Authorization"="Bearer $tokMgrA"} -Body (@{ tableNumber="8"; capacity=4; qrCode="QR-P8-BRANCHA-TBL8-$ticks" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

# QR Code Resolution
$qrResolved = (Test-Endpoint -TestName "2.4 Resolve Table by QR Code (/api/tables/qr/{qrCode})" -Method "GET" -Url "$baseUrl/tables/qr/$($tableA.qrCode)" -ExpectedStatus @(200)).Content | ConvertFrom-Json
Test-Endpoint -TestName "2.5 Verify Rejection of Invalid QR Code" -Method "GET" -Url "$baseUrl/tables/qr/INVALID-QR-CODE-9999" -ExpectedStatus @(404)

# Dine-In Order Placement & Demo Payment
$orderDineIn = (Test-Endpoint -TestName "2.6 Customer 1 places DINE_IN Order via Table 8" -Method "POST" -Url "$baseUrl/orders" -Headers @{"Authorization"="Bearer $tokCust1"} -Body (@{ branchId=$branchAId; orderType="DINE_IN"; tableId=$tableA.id; items=@(@{ foodItemId=$itemA.id; quantity=2 }) } | ConvertTo-Json) -ExpectedStatus @(201)).Content | ConvertFrom-Json

$payInit = (Test-Endpoint -TestName "2.7 Initiate Demo Payment for Order #$($orderDineIn.id)" -Method "POST" -Url "$baseUrl/payments/initiate" -Headers @{"Authorization"="Bearer $tokCust1"} -Body (@{ orderId=$orderDineIn.id; amount=$orderDineIn.totalAmount; paymentMethod="DEMO" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

Test-Endpoint -TestName "2.8 Process Demo Payment (Simulation Failure)" -Method "POST" -Url "$baseUrl/payments/$($payInit.id)/process" -Headers @{"Authorization"="Bearer $tokCust1"} -Body (@{ status="FAILED"; failureReason="Card Declined" } | ConvertTo-Json) -ExpectedStatus @(200)

$payProc = (Test-Endpoint -TestName "2.9 Process Demo Payment (Simulation Success)" -Method "POST" -Url "$baseUrl/payments/$($payInit.id)/process" -Headers @{"Authorization"="Bearer $tokCust1"} -Body (@{ status="PAID"; transactionId="TXN-P8-SUCCESS-$ticks" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

# ----------------------------------------------------
# 3. CUSTOMER HISTORY, RESERVATIONS & NOTIFICATIONS
# ----------------------------------------------------
Write-Host "`n--- 3. CUSTOMER HISTORY, RESERVATIONS & NOTIFICATIONS ---"
Test-Endpoint -TestName "3.1 Customer 1 fetches My Orders (/api/orders/my)" -Method "GET" -Url "$baseUrl/orders/my" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(200)

$resBook = (Test-Endpoint -TestName "3.2 Customer 1 books Table Reservation" -Method "POST" -Url "$baseUrl/reservations" -Headers @{"Authorization"="Bearer $tokCust1"} -Body (@{ branchId=$branchAId; tableId=$tableA.id; customerName="Alice Walker"; customerPhone="9876543211"; customerEmail="aliceP8_$ticks@test.com"; reservationDate="2026-09-15"; reservationTime="19:00:00"; numberOfPeople=4; specialRequests="Window table" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

Test-Endpoint -TestName "3.3 Available Tables Query (/api/reservations/available-tables)" -Method "GET" -Url "$baseUrl/reservations/available-tables?branchId=$branchAId&date=2026-09-15&time=19:00:00&numberOfPeople=4" -ExpectedStatus @(200)

Test-Endpoint -TestName "3.4 Customer 1 fetches My Reservations (/api/reservations/my)" -Method "GET" -Url "$baseUrl/reservations/my" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(200)

Test-Endpoint -TestName "3.5 Customer 1 cancels own reservation (/api/reservations/{id}/cancel)" -Method "PATCH" -Url "$baseUrl/reservations/$($resBook.id)/cancel" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(200)

# Notifications
$userNotifs = (Test-Endpoint -TestName "3.6 Customer 1 fetches My Notifications" -Method "GET" -Url "$baseUrl/notifications/user/$($cust1.userId)" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(200)).Content | ConvertFrom-Json
if ($userNotifs.Count -gt 0) {
    $notifId = $userNotifs[0].id
    Test-Endpoint -TestName "3.7 Mark Notification as Read (/api/notifications/{id}/read)" -Method "PATCH" -Url "$baseUrl/notifications/$notifId/read" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(200)
}

# ----------------------------------------------------
# 4. DELIVERY WORKFLOW, RADIUS CHECK & CONCURRENCY
# ----------------------------------------------------
Write-Host "`n--- 4. DELIVERY WORKFLOW, RADIUS CHECK & CONCURRENCY ---"
# Valid Delivery Order
$delivOrder = (Test-Endpoint -TestName "4.1 Customer 1 places valid DELIVERY Order (Inside 10km Radius)" -Method "POST" -Url "$baseUrl/orders" -Headers @{"Authorization"="Bearer $tokCust1"} -Body (@{ branchId=$branchAId; orderType="DELIVERY"; deliveryAddress="Kottayam Town Center"; latitude=9.591; longitude=76.521; items=@(@{ foodItemId=$itemA.id; quantity=1 }) } | ConvertTo-Json) -ExpectedStatus @(201)).Content | ConvertFrom-Json

# Chef advances status PLACED -> PREPARING -> READY
Test-Endpoint -TestName "4.2 Chef Alpha sets status PREPARING" -Method "PATCH" -Url "$baseUrl/orders/$($delivOrder.id)/status?status=PREPARING" -Headers @{"Authorization"="Bearer $tokChefA"} -ExpectedStatus @(200)
Test-Endpoint -TestName "4.3 Chef Alpha sets status READY" -Method "PATCH" -Url "$baseUrl/orders/$($delivOrder.id)/status?status=READY" -Headers @{"Authorization"="Bearer $tokChefA"} -ExpectedStatus @(200)

# Invalid Transition Rejection Test (READY -> PREPARING must fail)
Test-Endpoint -TestName "4.4 Reject Invalid Status Transition (READY -> PREPARING)" -Method "PATCH" -Url "$baseUrl/orders/$($delivOrder.id)/status?status=PREPARING" -Headers @{"Authorization"="Bearer $tokChefA"} -ExpectedStatus @(400, 409, 500)

# Concurrency Test: Employee A1 accepts delivery, Employee A2 attempts same delivery
Test-Endpoint -TestName "4.5 Employee A1 accepts Delivery #$($delivOrder.id)" -Method "POST" -Url "$baseUrl/orders/$($delivOrder.id)/accept-delivery" -Headers @{"Authorization"="Bearer $tokEmpA1"} -ExpectedStatus @(200)

Test-Endpoint -TestName "4.6 Employee A2 attempts to accept SAME Delivery (Expect 409 Conflict)" -Method "POST" -Url "$baseUrl/orders/$($delivOrder.id)/accept-delivery" -Headers @{"Authorization"="Bearer $tokEmpA2"} -ExpectedStatus @(409)

# Delivery Status Progression
Test-Endpoint -TestName "4.7 Employee A1 updates status PICKED_UP" -Method "PATCH" -Url "$baseUrl/orders/$($delivOrder.id)/status?status=PICKED_UP" -Headers @{"Authorization"="Bearer $tokEmpA1"} -ExpectedStatus @(200)
Test-Endpoint -TestName "4.8 Employee A1 updates status OUT_FOR_DELIVERY" -Method "PATCH" -Url "$baseUrl/orders/$($delivOrder.id)/status?status=OUT_FOR_DELIVERY" -Headers @{"Authorization"="Bearer $tokEmpA1"} -ExpectedStatus @(200)
Test-Endpoint -TestName "4.9 Employee A1 updates status DELIVERED" -Method "PATCH" -Url "$baseUrl/orders/$($delivOrder.id)/status?status=DELIVERED" -Headers @{"Authorization"="Bearer $tokEmpA1"} -ExpectedStatus @(200)

# ----------------------------------------------------
# 5. INVENTORY & STOCK MOVEMENTS
# ----------------------------------------------------
Write-Host "`n--- 5. INVENTORY & STOCK MOVEMENTS ---"
$invCat = (Test-Endpoint -TestName "5.1 Manager Alpha creates Inventory Category" -Method "POST" -Url "$baseUrl/inventory/branches/$branchAId/categories" -Headers @{"Authorization"="Bearer $tokMgrA"} -Body (@{ name="Proteins P8"; description="Meat & Poultry" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json
$invItem = (Test-Endpoint -TestName "5.2 Manager Alpha adds Inventory Item" -Method "POST" -Url "$baseUrl/inventory/branches/$branchAId/categories/$($invCat.id)/items" -Headers @{"Authorization"="Bearer $tokMgrA"} -Body (@{ name="Ribeye Cut P8"; unit="KG"; currentStock=30.0; minStockThreshold=10.0; costPerUnit=25.0 } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

Test-Endpoint -TestName "5.3 Manager Alpha performs Stock In (STOCK_IN)" -Method "POST" -Url "$baseUrl/inventory/items/$($invItem.id)/stock" -Headers @{"Authorization"="Bearer $tokMgrA"} -Body (@{ quantity=20.0; transactionType="STOCK_IN"; unitPrice=25.0; reason="Restock Shipment"; referenceNumber="PO-P8-1001" } | ConvertTo-Json) -ExpectedStatus @(200)

Test-Endpoint -TestName "5.4 Manager Alpha performs Stock Out (STOCK_OUT)" -Method "POST" -Url "$baseUrl/inventory/items/$($invItem.id)/stock" -Headers @{"Authorization"="Bearer $tokMgrA"} -Body (@{ quantity=5.0; transactionType="STOCK_OUT"; unitPrice=25.0; reason="Kitchen Prep Use"; referenceNumber="USAGE-P8-01" } | ConvertTo-Json) -ExpectedStatus @(200)

Test-Endpoint -TestName "5.5 Query Low Stock Items on Branch Alpha" -Method "GET" -Url "$baseUrl/inventory/branches/$branchAId/low-stock" -Headers @{"Authorization"="Bearer $tokMgrA"} -ExpectedStatus @(200)

# ----------------------------------------------------
# 6. ADMIN DASHBOARD, REPORTS & USER MANAGEMENT
# ----------------------------------------------------
Write-Host "`n--- 6. ADMIN DASHBOARD, REPORTS & USER MANAGEMENT ---"
Test-Endpoint -TestName "6.1 Admin fetches Central Dashboard Stats (/api/admin/dashboard)" -Method "GET" -Url "$baseUrl/admin/dashboard" -Headers @{"Authorization"="Bearer $tokAdmin"} -ExpectedStatus @(200)

Test-Endpoint -TestName "6.2 Admin fetches All Registered Users (/api/admin/users)" -Method "GET" -Url "$baseUrl/admin/users" -Headers @{"Authorization"="Bearer $tokAdmin"} -ExpectedStatus @(200)

Test-Endpoint -TestName "6.3 Admin fetches System-Wide Orders (/api/admin/orders)" -Method "GET" -Url "$baseUrl/admin/orders" -Headers @{"Authorization"="Bearer $tokAdmin"} -ExpectedStatus @(200)

Test-Endpoint -TestName "6.4 Admin fetches Executive Reports & Analytics (/api/admin/dashboard/reports)" -Method "GET" -Url "$baseUrl/admin/dashboard/reports" -Headers @{"Authorization"="Bearer $tokAdmin"} -ExpectedStatus @(200)

# Register Temp User & Admin Deletes Account
$tempUser = (Test-Endpoint -TestName "6.5 Register Temp User for Deletion" -Method "POST" -Url "$baseUrl/register" -Body (@{ firstName="Delete"; lastName="Me"; email="delP8_$ticks@test.com"; password="password123"; phoneNumber="9111111111"; gender="male" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

Test-Endpoint -TestName "6.6 Admin Deletes Temp User Account (/api/admin/users/{id})" -Method "DELETE" -Url "$baseUrl/admin/users/$($tempUser.userId)" -Headers @{"Authorization"="Bearer $tokAdmin"} -ExpectedStatus @(200, 204)

# Admin Self-Deletion Prevention Test
Test-Endpoint -TestName "6.7 Prevent Admin Self-Deletion Rejection Check" -Method "DELETE" -Url "$baseUrl/admin/users/$adminId" -Headers @{"Authorization"="Bearer $tokAdmin"} -ExpectedStatus @(400, 409, 403, 500)

# ----------------------------------------------------
# 7. SECURITY, IDOR, PRIVILEGE ESCALATION & ISOLATION
# ----------------------------------------------------
Write-Host "`n--- 7. SECURITY, IDOR, PRIVILEGE ESCALATION & ISOLATION ---"
# Customer blocked from Admin
Test-Endpoint -TestName "7.1 Customer 1 blocked from /api/admin/dashboard" -Method "GET" -Url "$baseUrl/admin/dashboard" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(403)
Test-Endpoint -TestName "7.2 Customer 1 blocked from /api/admin/users" -Method "GET" -Url "$baseUrl/admin/users" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(403)
Test-Endpoint -TestName "7.3 Customer 1 blocked from /api/admin/orders" -Method "GET" -Url "$baseUrl/admin/orders" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(403)

# Manager Alpha blocked from Branch Beta
Test-Endpoint -TestName "7.4 Manager Alpha blocked from Branch Beta inventory" -Method "GET" -Url "$baseUrl/inventory/branches/$branchBId/items" -Headers @{"Authorization"="Bearer $tokMgrA"} -ExpectedStatus @(403)
Test-Endpoint -TestName "7.5 Manager Alpha blocked from Branch Beta reservations" -Method "GET" -Url "$baseUrl/reservations/branches/$branchBId" -Headers @{"Authorization"="Bearer $tokMgrA"} -ExpectedStatus @(403)

# IDOR Protection
Test-Endpoint -TestName "7.6 Customer 2 blocked from fetching Customer 1 Order #$($orderDineIn.id)" -Method "GET" -Url "$baseUrl/orders/$($orderDineIn.id)" -Headers @{"Authorization"="Bearer $tokCust2"} -ExpectedStatus @(403)
Test-Endpoint -TestName "7.7 Customer 2 blocked from cancelling Customer 1 Reservation" -Method "PATCH" -Url "$baseUrl/reservations/$($resBook.id)/cancel" -Headers @{"Authorization"="Bearer $tokCust2"} -ExpectedStatus @(403)

# Privilege Escalation Protection
$updateProfile = (Test-Endpoint -TestName "7.8 Customer 1 profile update with injected role=ADMIN" -Method "PUT" -Url "$baseUrl/auth/me" -Headers @{"Authorization"="Bearer $tokCust1"} -Body (@{ firstName="Alice (Updated)"; lastName="Walker"; phoneNumber="9990001112"; gender="female"; role="ADMIN" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

$profileAfter = (Test-Endpoint -TestName "7.9 Verify Customer 1 Role strictly remains CUSTOMER" -Method "GET" -Url "$baseUrl/auth/me" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(200)).Content | ConvertFrom-Json
if ($profileAfter.role -eq "CUSTOMER") {
    $script:passCount++
    Write-Host " [PASS] Role unalterable by client input (Role remains CUSTOMER)" -ForegroundColor Green
} else {
    $script:failCount++
    Write-Host " [FAIL] Privilege Escalation! Role changed to $($profileAfter.role)" -ForegroundColor Red
}

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "PHASE 8 TEST RESULTS: $passCount PASSED, $failCount FAILED" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

if ($failCount -gt 0) {
    Write-Host "`n--- FAILED TESTS SUMMARY ---" -ForegroundColor Red
    $tests | Where-Object { -not $_.Passed } | ForEach-Object {
        Write-Host " [FAIL] $($_.Name) (Status Code: $($_.StatusCode))" -ForegroundColor Red
    }
}
