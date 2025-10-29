# Database Connection Troubleshooting Script for PowerShell
# Run this script on the system experiencing target machine errors

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   DATABASE CONNECTION TROUBLESHOOTING" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Database connection details
$DB_HOST = "43.225.53.118"
$DB_USER = "staging_sony_centeral"
$DB_PASSWORD = "sony_centeralsony_centeral"
$DB_NAME = "staging_central_hub"
$DB_PORT = 3306

Write-Host "Testing connection to: $DB_HOST" -ForegroundColor Yellow
Write-Host ""

# Test 1: Basic network connectivity
Write-Host "1. Testing basic network connectivity..." -ForegroundColor Green
try {
    $pingResult = Test-NetConnection -ComputerName $DB_HOST -Port $DB_PORT -InformationLevel Quiet
    if ($pingResult) {
        Write-Host "   ✅ Network connectivity to $DB_HOST`:$DB_PORT is OK" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Network connectivity to $DB_HOST`:$DB_PORT FAILED" -ForegroundColor Red
        Write-Host "   This indicates a firewall or network issue." -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Network test failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: DNS Resolution
Write-Host "2. Testing DNS resolution..." -ForegroundColor Green
try {
    # Check if it's already an IP address
    if ($DB_HOST -match '^\d+\.\d+\.\d+\.\d+$') {
        Write-Host "   ✅ Using IP address directly: $DB_HOST" -ForegroundColor Green
    } else {
        $dnsResult = Resolve-DnsName -Name $DB_HOST -ErrorAction Stop
        Write-Host "   ✅ DNS resolution successful" -ForegroundColor Green
        Write-Host "   IP Address: $($dnsResult[0].IPAddress)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ DNS resolution failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   This might cause connection issues" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Check Python installation
Write-Host "3. Checking Python installation..." -ForegroundColor Green
try {
    $pythonVersion = python --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Python is installed: $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Python not found or not working" -ForegroundColor Red
        Write-Host "   Please install Python and ensure it's in PATH" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Python check failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Check MySQL connector installation
Write-Host "4. Checking MySQL connector installation..." -ForegroundColor Green
try {
    $mysqlCheck = python -c "import mysql.connector; print('MySQL connector version:', mysql.connector.__version__)" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ MySQL connector is installed" -ForegroundColor Green
        Write-Host "   $mysqlCheck" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ MySQL connector not installed" -ForegroundColor Red
        Write-Host "   Run: pip install mysql-connector-python" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ MySQL connector check failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Direct MySQL connection test
Write-Host "5. Testing direct MySQL connection..." -ForegroundColor Green

# Create a temporary Python file for the connection test
$tempPythonFile = "$env:TEMP\mysql_connection_test.py"
$pythonCode = @"
import mysql.connector
import sys

try:
    print("Attempting connection...")
    conn = mysql.connector.connect(
        host='$DB_HOST',
        user='$DB_USER',
        password='$DB_PASSWORD',
        database='$DB_NAME',
        ssl_disabled=True,
        connection_timeout=30
    )
    print("✅ Direct connection successful!")
    print("Connected to:", conn.server_host, ":", conn.server_port)
    print("Database:", conn.database)
    conn.close()
except mysql.connector.Error as e:
    print("❌ Connection failed:", str(e))
    print("Error code:", e.errno)
    if e.errno == 2003:
        print("This is a 'target machine unreachable' error")
        print("Possible causes:")
        print("- Firewall blocking port 3306")
        print("- Network connectivity issues")
        print("- Database server overloaded")
    sys.exit(1)
except Exception as e:
    print("❌ Unexpected error:", str(e))
    sys.exit(1)
"@

# Write the Python code to a temporary file
$pythonCode | Out-File -FilePath $tempPythonFile -Encoding UTF8

try {
    $result = python $tempPythonFile 2>&1
    Write-Host "   $result" -ForegroundColor $(if ($LASTEXITCODE -eq 0) { "Green" } else { "Red" })
} catch {
    Write-Host "   ❌ Connection test failed: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Clean up the temporary file
    if (Test-Path $tempPythonFile) {
        Remove-Item $tempPythonFile -Force
    }
}
Write-Host ""

# Test 6: Environment variables check
Write-Host "6. Checking environment variables..." -ForegroundColor Green
$envVars = @("DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME")
foreach ($var in $envVars) {
    $value = [Environment]::GetEnvironmentVariable($var)
    if ($value) {
        Write-Host "   ✅ $var is set" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  $var is not set (using defaults)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test 7: Firewall check (Windows specific)
Write-Host "7. Checking Windows Firewall..." -ForegroundColor Green
try {
    $firewallRules = Get-NetFirewallRule -DisplayName "*MySQL*" -ErrorAction SilentlyContinue
    if ($firewallRules) {
        Write-Host "   Found MySQL firewall rules:" -ForegroundColor Yellow
        foreach ($rule in $firewallRules) {
            Write-Host "   - $($rule.DisplayName): $($rule.Enabled)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️  No specific MySQL firewall rules found" -ForegroundColor Yellow
        Write-Host "   Check if Windows Firewall is blocking outbound connections" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Firewall check failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Summary and recommendations
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SUMMARY & RECOMMENDATIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If you're getting 'target machine unreachable' errors:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Check Windows Firewall:" -ForegroundColor White
Write-Host "   - Open Windows Defender Firewall" -ForegroundColor Gray
Write-Host "   - Check 'Outbound Rules' for MySQL/port 3306" -ForegroundColor Gray
Write-Host "   - Temporarily disable firewall to test" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Check Antivirus Software:" -ForegroundColor White
Write-Host "   - Temporarily disable real-time protection" -ForegroundColor Gray
Write-Host "   - Add Python.exe to exclusions" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Check Corporate Network:" -ForegroundColor White
Write-Host "   - Contact IT to whitelist 43.225.53.118:3306" -ForegroundColor Gray
Write-Host "   - Check if VPN is required" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Install missing dependencies:" -ForegroundColor White
Write-Host "   pip install mysql-connector-python" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Try with explicit timeout:" -ForegroundColor White
Write-Host "   Add connection_timeout=30 to mysql.connector.connect()" -ForegroundColor Gray
Write-Host ""

Write-Host "Send this output to your system administrator for further assistance." -ForegroundColor Cyan
Write-Host ""

# Pause to allow reading
Read-Host "Press Enter to exit"
