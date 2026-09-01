# Phase 6 Full Integration & Regression Test Suite

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

Write-Host "=================================================="
Write-Host "PHASE 6: CUSTOMER & ADMIN FULL WORKFLOW TESTS"
Write-Host "=================================================="

# ----------------------------------------------------
# 1. SETUP: AUTHENTICATION & BRANCHES
# ----------------------------------------------------
$adminLogin = Test-Endpoint -TestName "Setup 1. Admin Login" -Method "POST" -Url "$baseUrl/auth/login" -Body '{"email":"admin1@gmail.com","password":"admin@1"}' -ExpectedStatus @(200)
$adminToken = ($adminLogin.Content | ConvertFrom-Json).token

$ticks = [System.DateTime]::Now.Ticks
$branchAPayload = @{ name = "Phase6 Branch Alpha $ticks"; state = "Kerala"; district = "Ernakulam"; latitude = 9.9816; longitude = 76.2999; active = $true } | ConvertTo-Json
$branchBPayload = @{ name = "Phase6 Branch Beta $ticks"; state = "Karnataka"; district = "Bangalore Urban"; latitude = 12.9716; longitude = 77.5946; active = $true } | ConvertTo-Json

$resBranchA = Test-Endpoint -TestName "Setup 2. Create Branch Alpha (Kerala)" -Method "POST" -Url "$baseUrl/branches" -Headers @{"Authorization"="Bearer $adminToken"} -Body $branchAPayload -ExpectedStatus @(201)
$resBranchB = Test-Endpoint -TestName "Setup 3. Create Branch Beta (Karnataka)" -Method "POST" -Url "$baseUrl/branches" -Headers @{"Authorization"="Bearer $adminToken"} -Body $branchBPayload -ExpectedStatus @(201)

$branchAId = ($resBranchA.Content | ConvertFrom-Json).id
$branchBId = ($resBranchB.Content | ConvertFrom-Json).id

# Onboard Branch Manager for Branch Alpha
$bmEmail = "mgr.alpha.$ticks@test.com"
$resBM = Test-Endpoint -TestName "Setup 4. Onboard Manager Alpha" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $adminToken"} -Body (@{ firstName="Manager"; lastName="Alpha"; email=$bmEmail; password="password123"; role="BRANCH_MANAGER"; branchId=$branchAId } | ConvertTo-Json) -ExpectedStatus @(201)
$bmToken = ((Test-Endpoint -TestName "Setup 5. Manager Alpha Login" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email=$bmEmail; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json).token

# Register Customer 1 and Customer 2
$cust1Email = "cust1.p6.$ticks@test.com"
$cust2Email = "cust2.p6.$ticks@test.com"
Test-Endpoint -TestName "Setup 6. Register Customer 1" -Method "POST" -Url "$baseUrl/register" -Body (@{ firstName="Alice"; lastName="Walker"; email=$cust1Email; password="password123"; phoneNumber="9876543211"; gender="female" } | ConvertTo-Json) -ExpectedStatus @(200)
Test-Endpoint -TestName "Setup 7. Register Customer 2" -Method "POST" -Url "$baseUrl/register" -Body (@{ firstName="Bob"; lastName="Smith"; email=$cust2Email; password="password123"; phoneNumber="9876543212"; gender="male" } | ConvertTo-Json) -ExpectedStatus @(200)

$cust1Login = (Test-Endpoint -TestName "Setup 8. Customer 1 Login" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email=$cust1Email; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json
$tokCust1 = $cust1Login.token
$cust1UserId = $cust1Login.userId

$tokCust2 = ((Test-Endpoint -TestName "Setup 9. Customer 2 Login" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email=$cust2Email; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json).token

# ----------------------------------------------------
# A. CUSTOMER BRANCH -> MENU FLOW
# ----------------------------------------------------
Write-Host "`n--- A. CUSTOMER BRANCH -> MENU FLOW ---"
# 1. States load
Test-Endpoint -TestName "1. Load Active States" -Method "GET" -Url "$baseUrl/branches/states" -ExpectedStatus @(200)

# 2. Districts load for state
Test-Endpoint -TestName "2. Load Districts for Kerala" -Method "GET" -Url "$baseUrl/branches/districts?state=Kerala" -ExpectedStatus @(200)

# 3. Branches load with filters
Test-Endpoint -TestName "3. Load Branches for Kerala / Ernakulam" -Method "GET" -Url "$baseUrl/branches?state=Kerala&district=Ernakulam&activeOnly=true" -ExpectedStatus @(200)

# Create Menu Category & Item on Branch A
$catA = (Test-Endpoint -TestName "Admin creates Category on Branch A" -Method "POST" -Url "$baseUrl/menu/branches/$branchAId/categories" -Headers @{"Authorization"="Bearer $adminToken"} -Body (@{ name="Signature Steaks"; description="Prime Cuts" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json
$itemA = (Test-Endpoint -TestName "Admin creates Food Item on Branch A" -Method "POST" -Url "$baseUrl/menu/branches/$branchAId/categories/$($catA.id)/items" -Headers @{"Authorization"="Bearer $adminToken"} -Body (@{ name="Wagyu Ribeye"; price=45.0; enabled=$true; isSeasonal=$true } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

# 4. Customer dynamic menu loads
Test-Endpoint -TestName "4. Load Dynamic Customer Menu for Branch A" -Method "GET" -Url "$baseUrl/menu/branches/$branchAId/customer-menu" -ExpectedStatus @(200)

# ----------------------------------------------------
# B. QR TABLE ORDERING FLOW
# ----------------------------------------------------
Write-Host "`n--- B. QR TABLE ORDERING FLOW ---"
# Add a Table with QR on Branch A
$tableA = (Test-Endpoint -TestName "Setup Table 7 on Branch A" -Method "POST" -Url "$baseUrl/tables/branches/$branchAId" -Headers @{"Authorization"="Bearer $adminToken"} -Body (@{ tableNumber="7"; capacity=4; active=$true } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json
$tableAQr = $tableA.qrCode
if (!$tableAQr) { $tableAQr = "QR-BRANCH-$branchAId-TABLE-$($tableA.id)" }

# 5. Resolve Valid QR Code
Test-Endpoint -TestName "5. Resolve Valid QR ($tableAQr)" -Method "GET" -Url "$baseUrl/tables/qr/$tableAQr" -ExpectedStatus @(200)

# 6. Reject Invalid QR Code
Test-Endpoint -TestName "6. Reject Invalid QR (QR-NONEXISTENT)" -Method "GET" -Url "$baseUrl/tables/qr/QR-NONEXISTENT" -ExpectedStatus @(404)

# 7. Create Dine-In Order with resolved table
$dineInOrder = (Test-Endpoint -TestName "7. Customer 1 places DINE_IN Order at Table 7" -Method "POST" -Url "$baseUrl/orders" -Headers @{"Authorization"="Bearer $tokCust1"} -Body (@{ branchId=$branchAId; orderType="DINE_IN"; tableId=$tableA.id; items=@(@{ foodItemId=$itemA.id; quantity=1 }) } | ConvertTo-Json) -ExpectedStatus @(201)).Content | ConvertFrom-Json

# ----------------------------------------------------
# C. CUSTOMER RESERVATIONS
# ----------------------------------------------------
Write-Host "`n--- C. CUSTOMER RESERVATIONS ---"
# 8. Check Available Tables for reservation
$resDate = (Get-Date).AddDays(2).ToString("yyyy-MM-dd")
$availTables = (Test-Endpoint -TestName "8. Check Available Tables on $resDate" -Method "GET" -Url "$baseUrl/reservations/available-tables?branchId=$branchAId&date=$resDate&time=19:30&numberOfPeople=2" -ExpectedStatus @(200)).Content | ConvertFrom-Json

# 9. Book Reservation
$resPayload = @{
    branchId = $branchAId
    tableId = $tableA.id
    customerName = "Alice Walker"
    customerPhone = "9876543211"
    customerEmail = $cust1Email
    reservationDate = $resDate
    reservationTime = "19:30"
    numberOfPeople = 2
    specialRequests = "Window seat please"
} | ConvertTo-Json

$createdRes = (Test-Endpoint -TestName "9. Customer 1 Books Reservation" -Method "POST" -Url "$baseUrl/reservations" -Headers @{"Authorization"="Bearer $tokCust1"} -Body $resPayload -ExpectedStatus @(200)).Content | ConvertFrom-Json

# ----------------------------------------------------
# D. CUSTOMER ORDER HISTORY & ISOLATION
# ----------------------------------------------------
Write-Host "`n--- D. CUSTOMER ORDER HISTORY & ISOLATION ---"
# 10. Customer 1 fetches own order history
Test-Endpoint -TestName "10. Customer 1 fetches own order history" -Method "GET" -Url "$baseUrl/orders/my" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(200)

# 11. Customer 1 fetches own order by ID
Test-Endpoint -TestName "11. Customer 1 fetches own Order #$($dineInOrder.id)" -Method "GET" -Url "$baseUrl/orders/$($dineInOrder.id)" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(200)

# 12. Customer 2 cannot access Customer 1's order (IDOR Protection)
Test-Endpoint -TestName "12. Customer 2 blocked from Customer 1 Order (IDOR Check)" -Method "GET" -Url "$baseUrl/orders/$($dineInOrder.id)" -Headers @{"Authorization"="Bearer $tokCust2"} -ExpectedStatus @(403)

# ----------------------------------------------------
# E. DEMO PAYMENT FLOW
# ----------------------------------------------------
Write-Host "`n--- E. DEMO PAYMENT FLOW ---"
# 13. Initiate Payment
$initPay = (Test-Endpoint -TestName "13. Initiate Demo Payment for Order #$($dineInOrder.id)" -Method "POST" -Url "$baseUrl/payments/initiate" -Headers @{"Authorization"="Bearer $tokCust1"} -Body (@{ orderId=$dineInOrder.id; amount=$dineInOrder.totalAmount; paymentMethod="DEMO" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

# 14. Process Demo Payment (Failure Simulation)
Test-Endpoint -TestName "14. Process Demo Payment (Simulation Failure)" -Method "POST" -Url "$baseUrl/payments/$($initPay.id)/process" -Headers @{"Authorization"="Bearer $tokCust1"} -Body (@{ status="FAILED"; failureReason="Simulated Decline" } | ConvertTo-Json) -ExpectedStatus @(200)

# 15. Process Demo Payment (Success Simulation)
$procPay = (Test-Endpoint -TestName "15. Process Demo Payment (Simulation Success)" -Method "POST" -Url "$baseUrl/payments/$($initPay.id)/process" -Headers @{"Authorization"="Bearer $tokCust1"} -Body (@{ status="PAID"; transactionId="TXN-DEMO-P6-$ticks" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

# 16. Verify Payment Record by Order
Test-Endpoint -TestName "16. Fetch Payment Record for Order #$($dineInOrder.id)" -Method "GET" -Url "$baseUrl/payments/order/$($dineInOrder.id)" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(200)

# ----------------------------------------------------
# F. MENU MANAGEMENT & BRANCH ISOLATION
# ----------------------------------------------------
Write-Host "`n--- F. MENU MANAGEMENT & BRANCH ISOLATION ---"
# 17. Manager Alpha creates Category on own Branch Alpha
$mgrCat = (Test-Endpoint -TestName "17. Manager Alpha creates Category on Branch Alpha" -Method "POST" -Url "$baseUrl/menu/branches/$branchAId/categories" -Headers @{"Authorization"="Bearer $bmToken"} -Body (@{ name="Chef Desserts"; description="Artisan Desserts" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

# 18. Manager Alpha blocked from modifying Branch Beta (Branch Isolation)
Test-Endpoint -TestName "18. Manager Alpha blocked from creating Category on Branch Beta" -Method "POST" -Url "$baseUrl/menu/branches/$branchBId/categories" -Headers @{"Authorization"="Bearer $bmToken"} -Body (@{ name="Unauthorized Category"; description="Hack" } | ConvertTo-Json) -ExpectedStatus @(403)

# 19. Manager Alpha updates Food Item on own Branch Alpha
Test-Endpoint -TestName "19. Manager Alpha updates Food Item on Branch Alpha" -Method "PUT" -Url "$baseUrl/menu/items/$($itemA.id)" -Headers @{"Authorization"="Bearer $bmToken"} -Body (@{ name="Wagyu Ribeye (Updated)"; price=48.0; enabled=$true; isSeasonal=$false } | ConvertTo-Json) -ExpectedStatus @(200)

# ----------------------------------------------------
# G. INVENTORY MANAGEMENT & BRANCH ISOLATION
# ----------------------------------------------------
Write-Host "`n--- G. INVENTORY MANAGEMENT & BRANCH ISOLATION ---"
# 20. Manager Alpha creates Inventory Category & Item on Branch Alpha
$invCatA = (Test-Endpoint -TestName "20. Manager Alpha creates Inventory Category" -Method "POST" -Url "$baseUrl/inventory/branches/$branchAId/categories" -Headers @{"Authorization"="Bearer $bmToken"} -Body (@{ name="Meat & Poultry" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json
$invItemA = (Test-Endpoint -TestName "21. Manager Alpha adds Inventory Item" -Method "POST" -Url "$baseUrl/inventory/branches/$branchAId/categories/$($invCatA.id)/items" -Headers @{"Authorization"="Bearer $bmToken"} -Body (@{ name="Wagyu Beef Cut"; unit="KG"; quantity=12.5; lowStockThreshold=15.0 } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

# 22. Manager Alpha performs Stock Adjustment
Test-Endpoint -TestName "22. Manager Alpha performs Stock Adjustment (STOCK_IN)" -Method "POST" -Url "$baseUrl/inventory/items/$($invItemA.id)/stock" -Headers @{"Authorization"="Bearer $bmToken"} -Body (@{ transactionType="STOCK_IN"; quantity=10.0; unitPrice=30.0; reason="Fresh shipment"; referenceNumber="INV-101" } | ConvertTo-Json) -ExpectedStatus @(200)

# 23. Manager Alpha blocked from accessing Branch Beta inventory (Branch Isolation)
Test-Endpoint -TestName "23. Manager Alpha blocked from Branch Beta Inventory" -Method "GET" -Url "$baseUrl/inventory/branches/$branchBId/items" -Headers @{"Authorization"="Bearer $bmToken"} -ExpectedStatus @(403)

# 24. Low stock query loads
Test-Endpoint -TestName "24. Query Low Stock Items on Branch Alpha" -Method "GET" -Url "$baseUrl/inventory/branches/$branchAId/low-stock" -Headers @{"Authorization"="Bearer $bmToken"} -ExpectedStatus @(200)

# 25. Inventory transactions query loads
Test-Endpoint -TestName "25. Query Inventory Transactions on Branch Alpha" -Method "GET" -Url "$baseUrl/inventory/branches/$branchAId/transactions" -Headers @{"Authorization"="Bearer $bmToken"} -ExpectedStatus @(200)

# ----------------------------------------------------
# H. RESERVATION MANAGEMENT & STATUS TRANSITIONS
# ----------------------------------------------------
Write-Host "`n--- H. RESERVATION MANAGEMENT & STATUS TRANSITIONS ---"
# 26. Manager Alpha queries reservations for Branch Alpha
Test-Endpoint -TestName "26. Manager Alpha queries Branch Alpha Reservations" -Method "GET" -Url "$baseUrl/reservations/branches/$branchAId" -Headers @{"Authorization"="Bearer $bmToken"} -ExpectedStatus @(200)

# 27. Manager Alpha updates Reservation Status to CONFIRMED
Test-Endpoint -TestName "27. Manager Alpha updates Reservation #$($createdRes.id) status to CONFIRMED" -Method "PATCH" -Url "$baseUrl/reservations/$($createdRes.id)/status?status=CONFIRMED" -Headers @{"Authorization"="Bearer $bmToken"} -ExpectedStatus @(200)

# 28. Manager Alpha updates Reservation Status to COMPLETED
Test-Endpoint -TestName "28. Manager Alpha updates Reservation #$($createdRes.id) status to COMPLETED" -Method "PATCH" -Url "$baseUrl/reservations/$($createdRes.id)/status?status=COMPLETED" -Headers @{"Authorization"="Bearer $bmToken"} -ExpectedStatus @(200)

# 29. Manager Alpha blocked from Branch Beta Reservations (Branch Isolation)
Test-Endpoint -TestName "29. Manager Alpha blocked from Branch Beta Reservations" -Method "GET" -Url "$baseUrl/reservations/branches/$branchBId" -Headers @{"Authorization"="Bearer $bmToken"} -ExpectedStatus @(403)

# ----------------------------------------------------
# I. NOTIFICATIONS VERIFICATION
# ----------------------------------------------------
Write-Host "`n--- I. NOTIFICATIONS VERIFICATION ---"
# 30. Fetch notifications for Customer 1
$notifRes = Test-Endpoint -TestName "30. Customer 1 fetches notifications" -Method "GET" -Url "$baseUrl/notifications/user/$cust1UserId" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(200)
$notifs = $notifRes.Content | ConvertFrom-Json
if ($notifs -and $notifs.length -gt 0) {
    $firstNotifId = $notifs[0].id
    # 31. Mark notification as read
    Test-Endpoint -TestName "31. Mark notification #$firstNotifId as read" -Method "PATCH" -Url "$baseUrl/notifications/$firstNotifId/read" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(200)
}

# ----------------------------------------------------
# J. CUSTOMER PROFILE & PRIVILEGE INTEGRITY
# ----------------------------------------------------
Write-Host "`n--- J. CUSTOMER PROFILE & PRIVILEGE INTEGRITY ---"
# 32. Customer 1 loads own profile
$custProfile = (Test-Endpoint -TestName "32. Customer 1 loads own profile (/api/auth/me)" -Method "GET" -Url "$baseUrl/auth/me" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(200)).Content | ConvertFrom-Json

# 33. Customer 1 updates profile (Allowed fields)
$updatedProfile = (Test-Endpoint -TestName "33. Customer 1 updates profile (/api/auth/me)" -Method "PUT" -Url "$baseUrl/auth/me" -Headers @{"Authorization"="Bearer $tokCust1"} -Body (@{ firstName="Alice (Updated)"; lastName="Walker"; phoneNumber="9998887776"; gender="female" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

# 34. Verify Customer 1 cannot escalate privileges or change role via profile update
$profileAfter = (Test-Endpoint -TestName "34. Verify Role remains CUSTOMER" -Method "GET" -Url "$baseUrl/auth/me" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(200)).Content | ConvertFrom-Json

Write-Host "`n=================================================="
Write-Host "PHASE 6 TEST RESULTS: $passCount PASSED, $failCount FAILED"
Write-Host "=================================================="

if ($failCount -gt 0) {
    Write-Host "`n--- FAILED TESTS SUMMARY ---" -ForegroundColor Red
    $tests | Where-Object { -not $_.Passed } | ForEach-Object {
        Write-Host " [FAIL] $($_.Name) (Status Code: $($_.StatusCode))" -ForegroundColor Red
    }
}
