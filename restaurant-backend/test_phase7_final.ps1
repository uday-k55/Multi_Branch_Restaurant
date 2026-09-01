# Phase 7 Final Application Completion & End-to-End Test Suite

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
Write-Host "PHASE 7 FINAL COMPREHENSIVE TEST SUITE" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# ----------------------------------------------------
# A. AUTHENTICATION & SEED SETUP
# ----------------------------------------------------
Write-Host "`n--- A. AUTHENTICATION & SEED SETUP ---"
$adminLogin = (Test-Endpoint -TestName "1. Admin Login (/api/auth/login)" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email="admin1@gmail.com"; password="admin@1" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json
$tokAdmin = $adminLogin.token

# Create Branch A and Branch B
$branchA = (Test-Endpoint -TestName "2. Admin Creates Branch Alpha" -Method "POST" -Url "$baseUrl/branches" -Headers @{"Authorization"="Bearer $tokAdmin"} -Body (@{ name="Branch Alpha $ticks"; state="Kerala"; district="Kottayam"; address="Central Hub"; phone="9876543210"; latitude=9.59; longitude=76.52; active=$true } | ConvertTo-Json) -ExpectedStatus @(201)).Content | ConvertFrom-Json
$branchAId = $branchA.id

$branchB = (Test-Endpoint -TestName "3. Admin Creates Branch Beta" -Method "POST" -Url "$baseUrl/branches" -Headers @{"Authorization"="Bearer $tokAdmin"} -Body (@{ name="Branch Beta $ticks"; state="Kerala"; district="Ernakulam"; address="North Hub"; phone="9876543211"; latitude=9.98; longitude=76.28; active=$true } | ConvertTo-Json) -ExpectedStatus @(201)).Content | ConvertFrom-Json
$branchBId = $branchB.id

# Onboard Staff for Branch A and B
$mgrA = (Test-Endpoint -TestName "4. Onboard Manager Alpha (Branch A)" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $tokAdmin"} -Body (@{ firstName="Manager"; lastName="Alpha"; email="mgrA_$ticks@test.com"; password="password123"; role="BRANCH_MANAGER"; branchId=$branchAId } | ConvertTo-Json) -ExpectedStatus @(201)).Content | ConvertFrom-Json
$tokMgrA = (Test-Endpoint -TestName "Login Manager Alpha" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email="mgrA_$ticks@test.com"; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json | Select-Object -ExpandProperty token

$chefA = (Test-Endpoint -TestName "5. Onboard Chef Alpha (Branch A)" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $tokAdmin"} -Body (@{ firstName="Chef"; lastName="Alpha"; email="chefA_$ticks@test.com"; password="password123"; role="CHEF"; branchId=$branchAId } | ConvertTo-Json) -ExpectedStatus @(201)).Content | ConvertFrom-Json
$tokChefA = (Test-Endpoint -TestName "Login Chef Alpha" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email="chefA_$ticks@test.com"; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json | Select-Object -ExpandProperty token

$empA1 = (Test-Endpoint -TestName "6. Onboard Employee A1 (Branch A)" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $tokAdmin"} -Body (@{ firstName="Employee"; lastName="A1"; email="empA1_$ticks@test.com"; password="password123"; role="EMPLOYEE"; branchId=$branchAId } | ConvertTo-Json) -ExpectedStatus @(201)).Content | ConvertFrom-Json
$tokEmpA1 = (Test-Endpoint -TestName "Login Employee A1" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email="empA1_$ticks@test.com"; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json | Select-Object -ExpandProperty token

# Register Customers
$cust1 = (Test-Endpoint -TestName "7. Customer 1 Registration" -Method "POST" -Url "$baseUrl/register" -Body (@{ firstName="Alice"; lastName="Walker"; email="alice_$ticks@test.com"; password="password123"; phoneNumber="9876543211"; gender="female" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json
$tokCust1 = (Test-Endpoint -TestName "Login Customer 1" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email="alice_$ticks@test.com"; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json | Select-Object -ExpandProperty token

$cust2 = (Test-Endpoint -TestName "8. Customer 2 Registration" -Method "POST" -Url "$baseUrl/register" -Body (@{ firstName="Bob"; lastName="Smith"; email="bob_$ticks@test.com"; password="password123"; phoneNumber="9876543222"; gender="male" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json
$tokCust2 = (Test-Endpoint -TestName "Login Customer 2" -Method "POST" -Url "$baseUrl/auth/login" -Body (@{ email="bob_$ticks@test.com"; password="password123" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json | Select-Object -ExpandProperty token

# ----------------------------------------------------
# B. MENU & QR ORDERING FLOW
# ----------------------------------------------------
Write-Host "`n--- B. MENU & QR ORDERING FLOW ---"
$catA = (Test-Endpoint -TestName "9. Manager Alpha creates Category on Branch A" -Method "POST" -Url "$baseUrl/menu/branches/$branchAId/categories" -Headers @{"Authorization"="Bearer $tokMgrA"} -Body (@{ name="Steaks"; description="Prime Cuts" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json
$itemA = (Test-Endpoint -TestName "10. Manager Alpha creates Food Item on Branch A" -Method "POST" -Url "$baseUrl/menu/branches/$branchAId/categories/$($catA.id)/items" -Headers @{"Authorization"="Bearer $tokMgrA"} -Body (@{ name="Tomahawk Steak"; price=45.0; enabled=$true; isSeasonal=$false } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

$tableA = (Test-Endpoint -TestName "11. Manager Alpha creates Table 7 on Branch A" -Method "POST" -Url "$baseUrl/tables/branches/$branchAId" -Headers @{"Authorization"="Bearer $tokMgrA"} -Body (@{ tableNumber="7"; capacity=4; qrCode="QR-P7-BRANCHA-TBL7-$ticks" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

# QR Resolution & Dine-in Order
$qrResolved = (Test-Endpoint -TestName "12. Resolve Table by QR Code (/api/tables/qr/{qrCode})" -Method "GET" -Url "$baseUrl/tables/qr/$($tableA.qrCode)" -ExpectedStatus @(200)).Content | ConvertFrom-Json
Test-Endpoint -TestName "13. Verify Rejection of Invalid QR Code" -Method "GET" -Url "$baseUrl/tables/qr/INVALID-QR-9999" -ExpectedStatus @(404)

$orderDineIn = (Test-Endpoint -TestName "14. Customer 1 places DINE_IN Order via Table 7" -Method "POST" -Url "$baseUrl/orders" -Headers @{"Authorization"="Bearer $tokCust1"} -Body (@{ branchId=$branchAId; orderType="DINE_IN"; tableId=$tableA.id; items=@(@{ foodItemId=$itemA.id; quantity=2 }) } | ConvertTo-Json) -ExpectedStatus @(201)).Content | ConvertFrom-Json

# Demo Payment Processing
$payInit = (Test-Endpoint -TestName "15. Initiate Demo Payment" -Method "POST" -Url "$baseUrl/payments/initiate" -Headers @{"Authorization"="Bearer $tokCust1"} -Body (@{ orderId=$orderDineIn.id; amount=$orderDineIn.totalAmount; paymentMethod="DEMO" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

Test-Endpoint -TestName "16. Process Demo Payment (Simulation Failure)" -Method "POST" -Url "$baseUrl/payments/$($payInit.id)/process" -Headers @{"Authorization"="Bearer $tokCust1"} -Body (@{ status="FAILED"; failureReason="Card Declined" } | ConvertTo-Json) -ExpectedStatus @(200)

$payProc = (Test-Endpoint -TestName "17. Process Demo Payment (Simulation Success)" -Method "POST" -Url "$baseUrl/payments/$($payInit.id)/process" -Headers @{"Authorization"="Bearer $tokCust1"} -Body (@{ status="PAID"; transactionId="TXN-P7-SUCCESS-$ticks" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

# ----------------------------------------------------
# C. CUSTOMER ORDERS & RESERVATIONS HISTORY
# ----------------------------------------------------
Write-Host "`n--- C. CUSTOMER ORDERS & RESERVATIONS HISTORY ---"
# Customer 1 My Orders
Test-Endpoint -TestName "18. Customer 1 fetches My Orders (/api/orders/my)" -Method "GET" -Url "$baseUrl/orders/my" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(200)

# Table Reservation Booking
$resBook = (Test-Endpoint -TestName "19. Customer 1 books Table Reservation" -Method "POST" -Url "$baseUrl/reservations" -Headers @{"Authorization"="Bearer $tokCust1"} -Body (@{ branchId=$branchAId; tableId=$tableA.id; customerName="Alice Walker"; customerPhone="9876543211"; customerEmail="alice_$ticks@test.com"; reservationDate="2026-09-10"; reservationTime="19:00:00"; numberOfPeople=4; specialRequests="Window seat" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

# Customer 1 My Reservations
Test-Endpoint -TestName "20. Customer 1 fetches My Reservations (/api/reservations/my)" -Method "GET" -Url "$baseUrl/reservations/my" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(200)

# Customer 1 cancels reservation
Test-Endpoint -TestName "21. Customer 1 cancels own reservation (/api/reservations/{id}/cancel)" -Method "PATCH" -Url "$baseUrl/reservations/$($resBook.id)/cancel" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(200)

# ----------------------------------------------------
# D. ADMIN MANAGEMENT (USERS, ORDERS, REPORTS, DASHBOARD, SETTINGS)
# ----------------------------------------------------
Write-Host "`n--- D. ADMIN MANAGEMENT (USERS, ORDERS, REPORTS, SETTINGS) ---"
Test-Endpoint -TestName "22. Admin fetches Central Dashboard Stats (/api/admin/dashboard)" -Method "GET" -Url "$baseUrl/admin/dashboard" -Headers @{"Authorization"="Bearer $tokAdmin"} -ExpectedStatus @(200)

Test-Endpoint -TestName "23. Admin fetches All Registered Users (/api/admin/users)" -Method "GET" -Url "$baseUrl/admin/users" -Headers @{"Authorization"="Bearer $tokAdmin"} -ExpectedStatus @(200)

Test-Endpoint -TestName "24. Admin fetches System-Wide Orders (/api/admin/orders)" -Method "GET" -Url "$baseUrl/admin/orders" -Headers @{"Authorization"="Bearer $tokAdmin"} -ExpectedStatus @(200)

Test-Endpoint -TestName "25. Admin fetches Executive Reports & Analytics (/api/admin/dashboard/reports)" -Method "GET" -Url "$baseUrl/admin/dashboard/reports" -Headers @{"Authorization"="Bearer $tokAdmin"} -ExpectedStatus @(200)

# User Deletion test (create temp user and delete)
$tempUser = (Test-Endpoint -TestName "26. Register Temp User for Deletion" -Method "POST" -Url "$baseUrl/register" -Body (@{ firstName="Temp"; lastName="User"; email="temp_$ticks@test.com"; password="password123"; phoneNumber="9000000000"; gender="male" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

Test-Endpoint -TestName "27. Admin Deletes Temp User Account (/api/admin/users/{id})" -Method "DELETE" -Url "$baseUrl/admin/users/$($tempUser.userId)" -Headers @{"Authorization"="Bearer $tokAdmin"} -ExpectedStatus @(240, 200, 204)

# ----------------------------------------------------
# E. INVENTORY & STOCK MOVEMENTS
# ----------------------------------------------------
Write-Host "`n--- E. INVENTORY & STOCK MOVEMENTS ---"
$invCat = (Test-Endpoint -TestName "28. Manager Alpha creates Inventory Category" -Method "POST" -Url "$baseUrl/inventory/branches/$branchAId/categories" -Headers @{"Authorization"="Bearer $tokMgrA"} -Body (@{ name="Meats"; description="Beef & Poultry" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json
$invItem = (Test-Endpoint -TestName "29. Manager Alpha adds Inventory Item" -Method "POST" -Url "$baseUrl/inventory/branches/$branchAId/categories/$($invCat.id)/items" -Headers @{"Authorization"="Bearer $tokMgrA"} -Body (@{ name="Wagyu Beef Cut"; unit="KG"; currentStock=25.0; minStockThreshold=10.0; costPerUnit=30.0 } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

Test-Endpoint -TestName "30. Manager Alpha performs Stock Adjustment (STOCK_IN)" -Method "POST" -Url "$baseUrl/inventory/items/$($invItem.id)/stock" -Headers @{"Authorization"="Bearer $tokMgrA"} -Body (@{ quantity=15.0; transactionType="STOCK_IN"; unitPrice=30.0; reason="Routine Restock"; referenceNumber="PO-P7-101" } | ConvertTo-Json) -ExpectedStatus @(200)

Test-Endpoint -TestName "31. Query Low Stock Items on Branch Alpha" -Method "GET" -Url "$baseUrl/inventory/branches/$branchAId/low-stock" -Headers @{"Authorization"="Bearer $tokMgrA"} -ExpectedStatus @(200)

# ----------------------------------------------------
# F. WORKFLOW LIFECYCLE (CHEF & EMPLOYEE DELIVERY)
# ----------------------------------------------------
Write-Host "`n--- F. WORKFLOW LIFECYCLE (CHEF & EMPLOYEE DELIVERY) ---"
$delivOrder = (Test-Endpoint -TestName "32. Customer 1 places DELIVERY Order" -Method "POST" -Url "$baseUrl/orders" -Headers @{"Authorization"="Bearer $tokCust1"} -Body (@{ branchId=$branchAId; orderType="DELIVERY"; deliveryAddress="Civil Station Road, Kottayam"; latitude=9.591; longitude=76.521; items=@(@{ foodItemId=$itemA.id; quantity=1 }) } | ConvertTo-Json) -ExpectedStatus @(201)).Content | ConvertFrom-Json

# Chef advances status PLACED -> PREPARING -> READY
Test-Endpoint -TestName "33a. Chef Alpha sets Order status to PREPARING" -Method "PATCH" -Url "$baseUrl/orders/$($delivOrder.id)/status?status=PREPARING" -Headers @{"Authorization"="Bearer $tokChefA"} -ExpectedStatus @(200)

Test-Endpoint -TestName "33b. Chef Alpha sets Order status to READY" -Method "PATCH" -Url "$baseUrl/orders/$($delivOrder.id)/status?status=READY" -Headers @{"Authorization"="Bearer $tokChefA"} -ExpectedStatus @(200)

# Employee A1 accepts delivery
Test-Endpoint -TestName "34. Employee A1 accepts Delivery #$($delivOrder.id)" -Method "POST" -Url "$baseUrl/orders/$($delivOrder.id)/accept-delivery" -Headers @{"Authorization"="Bearer $tokEmpA1"} -ExpectedStatus @(200)

# Employee A1 updates delivery status: ACCEPTED -> PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED
Test-Endpoint -TestName "35. Employee A1 updates delivery status to PICKED_UP" -Method "PATCH" -Url "$baseUrl/orders/$($delivOrder.id)/status?status=PICKED_UP" -Headers @{"Authorization"="Bearer $tokEmpA1"} -ExpectedStatus @(200)
Test-Endpoint -TestName "36. Employee A1 updates delivery status to OUT_FOR_DELIVERY" -Method "PATCH" -Url "$baseUrl/orders/$($delivOrder.id)/status?status=OUT_FOR_DELIVERY" -Headers @{"Authorization"="Bearer $tokEmpA1"} -ExpectedStatus @(200)
Test-Endpoint -TestName "37. Employee A1 updates delivery status to DELIVERED" -Method "PATCH" -Url "$baseUrl/orders/$($delivOrder.id)/status?status=DELIVERED" -Headers @{"Authorization"="Bearer $tokEmpA1"} -ExpectedStatus @(200)

# ----------------------------------------------------
# G. SECURITY, IDOR & ISOLATION VERIFICATION
# ----------------------------------------------------
Write-Host "`n--- G. SECURITY, IDOR & ISOLATION VERIFICATION ---"
# Customer blocked from Admin
Test-Endpoint -TestName "38. Customer 1 blocked from /api/admin/dashboard" -Method "GET" -Url "$baseUrl/admin/dashboard" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(403)
Test-Endpoint -TestName "39. Customer 1 blocked from /api/admin/users" -Method "GET" -Url "$baseUrl/admin/users" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(403)
Test-Endpoint -TestName "40. Customer 1 blocked from /api/admin/orders" -Method "GET" -Url "$baseUrl/admin/orders" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(403)

# Manager Alpha blocked from Branch Beta
Test-Endpoint -TestName "41. Manager Alpha blocked from Branch Beta inventory" -Method "GET" -Url "$baseUrl/inventory/branches/$branchBId/items" -Headers @{"Authorization"="Bearer $tokMgrA"} -ExpectedStatus @(403)
Test-Endpoint -TestName "42. Manager Alpha blocked from Branch Beta reservations" -Method "GET" -Url "$baseUrl/reservations/branches/$branchBId" -Headers @{"Authorization"="Bearer $tokMgrA"} -ExpectedStatus @(403)

# Customer IDOR Protection
Test-Endpoint -TestName "43. Customer 2 blocked from fetching Customer 1 Order #$($orderDineIn.id)" -Method "GET" -Url "$baseUrl/orders/$($orderDineIn.id)" -Headers @{"Authorization"="Bearer $tokCust2"} -ExpectedStatus @(403)

# Customer Profile Escalation Protection
$updateProfile = (Test-Endpoint -TestName "44. Customer 1 updates profile safely" -Method "PUT" -Url "$baseUrl/auth/me" -Headers @{"Authorization"="Bearer $tokCust1"} -Body (@{ firstName="Alice (Updated)"; lastName="Walker"; phoneNumber="9990001112"; gender="female"; role="ADMIN" } | ConvertTo-Json) -ExpectedStatus @(200)).Content | ConvertFrom-Json

$profileAfter = (Test-Endpoint -TestName "45. Verify Customer 1 Role remains CUSTOMER" -Method "GET" -Url "$baseUrl/auth/me" -Headers @{"Authorization"="Bearer $tokCust1"} -ExpectedStatus @(200)).Content | ConvertFrom-Json
if ($profileAfter.role -eq "CUSTOMER") {
    $script:passCount++
    Write-Host " [PASS] Role unalterable by client input (Role remains CUSTOMER)" -ForegroundColor Green
} else {
    $script:failCount++
    Write-Host " [FAIL] Privilege Escalation! Role changed to $($profileAfter.role)" -ForegroundColor Red
}

Write-Host "`n=================================================="
Write-Host "PHASE 7 TEST RESULTS: $passCount PASSED, $failCount FAILED"
Write-Host "=================================================="

if ($failCount -gt 0) {
    Write-Host "`n--- FAILED TESTS SUMMARY ---" -ForegroundColor Red
    $tests | Where-Object { -not $_.Passed } | ForEach-Object {
        Write-Host " [FAIL] $($_.Name) (Status Code: $($_.StatusCode))" -ForegroundColor Red
    }
}
