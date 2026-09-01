# Phase 3 Full Verification Test Suite

$baseUrl = "http://localhost:8080/api"
$results = @()

function Test-Endpoint {
    param(
        [string]$TestName,
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [string]$Body = "",
        [int[]]$ExpectedStatus = @(200)
    )
    
    $headersObj = @{
        "Content-Type" = "application/json"
    }
    foreach ($k in $Headers.Keys) {
        $headersObj[$k] = $Headers[$k]
    }

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
        return @{
            Name = $TestName
            Passed = $passed
            StatusCode = $statusCode
            Expected = $ExpectedStatus
            Content = $resp.Content
        }
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
        return @{
            Name = $TestName
            Passed = $passed
            StatusCode = $statusCode
            Expected = $ExpectedStatus
            Content = $body
        }
    }
}

Write-Host "=================================================="
Write-Host "PHASE 3 VERIFICATION - AUTH & BRANCH TESTS"
Write-Host "=================================================="

# 1. Admin Login
$loginBody = '{"email":"admin1@gmail.com","password":"admin@1"}'
$adminLogin = Test-Endpoint -TestName "1. Admin Login" -Method "POST" -Url "$baseUrl/auth/login" -Body $loginBody -ExpectedStatus @(200)
$adminJson = $adminLogin.Content | ConvertFrom-Json
$adminToken = $adminJson.token
Write-Host "Admin Token: $($adminToken.Substring(0, 20))..."

# 2. Public / Anonymous fetches branches
$getBranches = Test-Endpoint -TestName "2. Anonymous GET /api/branches" -Method "GET" -Url "$baseUrl/branches" -ExpectedStatus @(200)

# 3. Admin creates Branch
$branchPayload = @{
    name = "Koramangala Gourmet Hub"
    state = "Karnataka"
    district = "Bangalore Urban"
    address = "80 Feet Road, 4th Block Koramangala"
    phone = "+91 9876543210"
    latitude = 12.9352
    longitude = 77.6245
    openingHours = "08:00 AM"
    closingHours = "11:00 PM"
    active = $true
} | ConvertTo-Json
$createBranch = Test-Endpoint -TestName "3. Admin creates Branch" -Method "POST" -Url "$baseUrl/branches" -Headers @{"Authorization"="Bearer $adminToken"} -Body $branchPayload -ExpectedStatus @(201)
$createdBranch = $createBranch.Content | ConvertFrom-Json
$branchId = $createdBranch.id
Write-Host "Created Branch ID: $branchId, Name: $($createdBranch.name)"

# 4. Admin edits Branch
$branchEditPayload = @{
    name = "Koramangala Gourmet Hub (Updated)"
    state = "Karnataka"
    district = "Bangalore Urban"
    address = "80 Feet Road, 4th Block Koramangala"
    phone = "+91 9876543211"
    latitude = 12.9352
    longitude = 77.6245
    openingHours = "08:00 AM"
    closingHours = "11:30 PM"
    active = $true
} | ConvertTo-Json
$editBranch = Test-Endpoint -TestName "4. Admin edits Branch" -Method "PUT" -Url "$baseUrl/branches/$branchId" -Headers @{"Authorization"="Bearer $adminToken"} -Body $branchEditPayload -ExpectedStatus @(200)

# 5. Cascading: Get States & Districts
$getStates = Test-Endpoint -TestName "5. Get States" -Method "GET" -Url "$baseUrl/branches/states" -ExpectedStatus @(200)
$getDistricts = Test-Endpoint -TestName "6. Get Districts for Karnataka" -Method "GET" -Url "$baseUrl/branches/districts?state=Karnataka" -ExpectedStatus @(200)

Write-Host "=================================================="
Write-Host "EMPLOYEE ONBOARDING TESTS"
Write-Host "=================================================="

# 7. Admin creates BRANCH_MANAGER
$bmPayload = @{
    firstName = "Suresh"
    lastName = "Kumar"
    email = "manager.blr$([System.DateTime]::Now.Ticks)@restaurant.com"
    phoneNumber = "+91 9123456780"
    gender = "male"
    password = "managerPassword@123"
    role = "BRANCH_MANAGER"
    branchId = $branchId
} | ConvertTo-Json
$createBM = Test-Endpoint -TestName "7. Admin creates BRANCH_MANAGER" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $adminToken"} -Body $bmPayload -ExpectedStatus @(201)
$bmEmail = ($bmPayload | ConvertFrom-Json).email

# 8. Admin creates CHEF
$chefPayload = @{
    firstName = "Vikram"
    lastName = "Singh"
    email = "chef.vikram$([System.DateTime]::Now.Ticks)@restaurant.com"
    phoneNumber = "+91 9123456781"
    gender = "male"
    password = "chefPassword@123"
    role = "CHEF"
    branchId = $branchId
} | ConvertTo-Json
$createChef = Test-Endpoint -TestName "8. Admin creates CHEF" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $adminToken"} -Body $chefPayload -ExpectedStatus @(201)
$chefEmail = ($chefPayload | ConvertFrom-Json).email

# 9. Admin creates EMPLOYEE
$empPayload = @{
    firstName = "Anita"
    lastName = "Deshmukh"
    email = "staff.anita$([System.DateTime]::Now.Ticks)@restaurant.com"
    phoneNumber = "+91 9123456782"
    gender = "female"
    password = "staffPassword@123"
    role = "EMPLOYEE"
    branchId = $branchId
} | ConvertTo-Json
$createEmp = Test-Endpoint -TestName "9. Admin creates EMPLOYEE" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $adminToken"} -Body $empPayload -ExpectedStatus @(201)
$empEmail = ($empPayload | ConvertFrom-Json).email
$empCreatedJson = $createEmp.Content | ConvertFrom-Json
$empId = $empCreatedJson.id

# 10. Login as BRANCH_MANAGER
$bmLoginBody = @{ email = $bmEmail; password = "managerPassword@123" } | ConvertTo-Json
$bmLogin = Test-Endpoint -TestName "10. Branch Manager Login" -Method "POST" -Url "$baseUrl/auth/login" -Body $bmLoginBody -ExpectedStatus @(200)
$bmToken = ($bmLogin.Content | ConvertFrom-Json).token
$bmRole = ($bmLogin.Content | ConvertFrom-Json).role
$bmBranchId = ($bmLogin.Content | ConvertFrom-Json).branchId
Write-Host "Branch Manager Role: $bmRole, Branch ID: $bmBranchId"

# 11. Login as CHEF
$chefLoginBody = @{ email = $chefEmail; password = "chefPassword@123" } | ConvertTo-Json
$chefLogin = Test-Endpoint -TestName "11. Chef Login" -Method "POST" -Url "$baseUrl/auth/login" -Body $chefLoginBody -ExpectedStatus @(200)
$chefToken = ($chefLogin.Content | ConvertFrom-Json).token

# 12. Login as EMPLOYEE
$empLoginBody = @{ email = $empEmail; password = "staffPassword@123" } | ConvertTo-Json
$empLogin = Test-Endpoint -TestName "12. Employee Login" -Method "POST" -Url "$baseUrl/auth/login" -Body $empLoginBody -ExpectedStatus @(200)
$empToken = ($empLogin.Content | ConvertFrom-Json).token

# 13. Customer Registration & Login
$custEmail = "customer.test$([System.DateTime]::Now.Ticks)@test.com"
$custRegBody = @{
    firstName = "Rahul"
    lastName = "Sharma"
    email = $custEmail
    phoneNumber = "9876543210"
    gender = "male"
    password = "customerPassword@123"
} | ConvertTo-Json
$custReg = Test-Endpoint -TestName "13. Public Customer Registration" -Method "POST" -Url "$baseUrl/register" -Body $custRegBody -ExpectedStatus @(200)
$custLoginBody = @{ email = $custEmail; password = "customerPassword@123" } | ConvertTo-Json
$custLogin = Test-Endpoint -TestName "14. Customer Login" -Method "POST" -Url "$baseUrl/auth/login" -Body $custLoginBody -ExpectedStatus @(200)
$custToken = ($custLogin.Content | ConvertFrom-Json).token
$custRole = ($custLogin.Content | ConvertFrom-Json).role
Write-Host "Customer Registered Role: $custRole"

Write-Host "=================================================="
Write-Host "FAILURE & SECURITY TESTS"
Write-Host "=================================================="

# F1. Customer attempts POST /api/branches -> Rejected (403)
$f1 = Test-Endpoint -TestName "F1. Customer attempts POST /api/branches" -Method "POST" -Url "$baseUrl/branches" -Headers @{"Authorization"="Bearer $custToken"} -Body $branchPayload -ExpectedStatus @(403)

# F2. Employee attempts POST /api/branches -> Rejected (403)
$f2 = Test-Endpoint -TestName "F2. Employee attempts POST /api/branches" -Method "POST" -Url "$baseUrl/branches" -Headers @{"Authorization"="Bearer $empToken"} -Body $branchPayload -ExpectedStatus @(403)

# F3. Customer attempts employee creation -> Rejected (403)
$f3 = Test-Endpoint -TestName "F3. Customer attempts POST /api/admin/employees" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $custToken"} -Body $empPayload -ExpectedStatus @(403)

# F4. Employee attempts employee creation -> Rejected (403)
$f4 = Test-Endpoint -TestName "F4. Employee attempts POST /api/admin/employees" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $empToken"} -Body $empPayload -ExpectedStatus @(403)

# F5. Public registration attempts role=ADMIN -> must not create ADMIN
$hackedAdminReg = @{
    firstName = "Hacker"
    lastName = "Admin"
    email = "hacker.admin$([System.DateTime]::Now.Ticks)@test.com"
    phoneNumber = "1111111111"
    gender = "male"
    password = "password123"
    role = "ADMIN"
} | ConvertTo-Json
$f5Reg = Test-Endpoint -TestName "F5. Public registration with role=ADMIN" -Method "POST" -Url "$baseUrl/register" -Body $hackedAdminReg -ExpectedStatus @(200)
$hackerLoginBody = @{ email = ($hackedAdminReg | ConvertFrom-Json).email; password = "password123" } | ConvertTo-Json
$hackerLogin = Test-Endpoint -TestName "F5b. Hacker Login Check Role" -Method "POST" -Url "$baseUrl/auth/login" -Body $hackerLoginBody -ExpectedStatus @(200)
$hackerRole = ($hackerLogin.Content | ConvertFrom-Json).role
Write-Host "Hacker Actual Role in Database: $hackerRole (Must be CUSTOMER)"

# F6. Public registration attempts role=CHEF
$hackedChefReg = @{
    firstName = "Hacker"
    lastName = "Chef"
    email = "hacker.chef$([System.DateTime]::Now.Ticks)@test.com"
    phoneNumber = "2222222222"
    gender = "male"
    password = "password123"
    role = "CHEF"
} | ConvertTo-Json
$f6Reg = Test-Endpoint -TestName "F6. Public registration with role=CHEF" -Method "POST" -Url "$baseUrl/register" -Body $hackedChefReg -ExpectedStatus @(200)
$hackerChefLoginBody = @{ email = ($hackedChefReg | ConvertFrom-Json).email; password = "password123" } | ConvertTo-Json
$hackerChefLogin = Test-Endpoint -TestName "F6b. Hacker Chef Login Check Role" -Method "POST" -Url "$baseUrl/auth/login" -Body $hackerChefLoginBody -ExpectedStatus @(200)
$hackerChefRole = ($hackerChefLogin.Content | ConvertFrom-Json).role
Write-Host "Hacker Chef Actual Role in Database: $hackerChefRole (Must be CUSTOMER)"

# F7. Invalid branch ID during employee creation -> Rejected (400)
$invalidBranchEmp = @{
    firstName = "Test"
    lastName = "InvalidBranch"
    email = "invalid.branch$([System.DateTime]::Now.Ticks)@test.com"
    phoneNumber = "3333333333"
    gender = "male"
    password = "password123"
    role = "EMPLOYEE"
    branchId = 999999
} | ConvertTo-Json
$f7 = Test-Endpoint -TestName "F7. Invalid branch ID employee creation" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $adminToken"} -Body $invalidBranchEmp -ExpectedStatus @(400)

# F8. Duplicate email during employee creation -> Rejected (400)
$dupEmailEmp = @{
    firstName = "Duplicate"
    lastName = "User"
    email = $empEmail
    phoneNumber = "4444444444"
    gender = "male"
    password = "password123"
    role = "EMPLOYEE"
    branchId = $branchId
} | ConvertTo-Json
$f8 = Test-Endpoint -TestName "F8. Duplicate email employee creation" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $adminToken"} -Body $dupEmailEmp -ExpectedStatus @(400)

# F9. Missing required branch for branch employee -> Rejected (400)
$noBranchEmp = @{
    firstName = "NoBranch"
    lastName = "User"
    email = "nobranch$([System.DateTime]::Now.Ticks)@test.com"
    phoneNumber = "5555555555"
    gender = "male"
    password = "password123"
    role = "EMPLOYEE"
    branchId = $null
} | ConvertTo-Json
$f9 = Test-Endpoint -TestName "F9. Missing branchId employee creation" -Method "POST" -Url "$baseUrl/admin/employees" -Headers @{"Authorization"="Bearer $adminToken"} -Body $noBranchEmp -ExpectedStatus @(400)

Write-Host "=================================================="
Write-Host "ALL PHASE 3 TESTS EXECUTED"
Write-Host "=================================================="
