# 📦 CTI Driver Deployment Package Script
# Run this script to create a deployment package

Write-Host "🚀 Creating CTI Driver Deployment Package..." -ForegroundColor Green

# Set variables
$ProjectRoot = "c:\Users\aadebayo\OneDrive - Microsoft\Documents\Customer Engagements\Aldi DCC\DCC-Salesforce Integration\customCTIMethods\samples\SFExampleCTIDriver"
$DistPath = "$ProjectRoot\dist"
$PackagePath = "$ProjectRoot\deployment-package"
$Date = Get-Date -Format "yyyy-MM-dd"
$ZipName = "D365-Salesforce-CTI-Driver-$Date.zip"

# Create package directory
Write-Host "📁 Creating package directory..." -ForegroundColor Yellow
if (Test-Path $PackagePath) {
    Remove-Item $PackagePath -Recurse -Force
}
New-Item -ItemType Directory -Path $PackagePath -Force | Out-Null

# Copy deployment files
Write-Host "📋 Copying deployment files..." -ForegroundColor Yellow
Copy-Item "$DistPath\*" -Destination $PackagePath -Recurse

# Create version info
$VersionInfo = @"
D365 Contact Center - Salesforce CTI Driver
Version: 1.0
Build Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Build Size: $((Get-Item "$DistPath\SFExampleCTIDriver.js").Length) bytes

Files Included:
- SFExampleCTIDriver.js (Main CTI driver)
- call-center-definition.xml (Salesforce configuration)
- README.md (Quick deployment guide)
- deployment-instructions.md (Detailed instructions)
- deployment-checklist.md (Deployment checklist)

Deployment Notes:
1. Update the CTI Adapter URL in call-center-definition.xml
2. Create required custom fields on Case object
3. Upload CTI driver as Static Resource or host externally
4. Follow the deployment checklist for complete setup

For support, refer to the documentation files included in this package.
"@

$VersionInfo | Out-File -FilePath "$PackagePath\VERSION.txt" -Encoding UTF8

# Create deployment package zip
Write-Host "📦 Creating deployment package zip..." -ForegroundColor Yellow
$ZipPath = "$ProjectRoot\$ZipName"
if (Test-Path $ZipPath) {
    Remove-Item $ZipPath -Force
}

# Use .NET compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($PackagePath, $ZipPath)

# Summary
Write-Host "`n✅ Deployment package created successfully!" -ForegroundColor Green
Write-Host "📦 Package location: $ZipPath" -ForegroundColor Cyan
Write-Host "📁 Package contents: $PackagePath" -ForegroundColor Cyan

# List package contents
Write-Host "`n📋 Package Contents:" -ForegroundColor Yellow
Get-ChildItem $PackagePath | Format-Table Name, Length, LastWriteTime -AutoSize

Write-Host "`n🎯 Next Steps:" -ForegroundColor Magenta
Write-Host "1. Extract the deployment package in your Salesforce environment" -ForegroundColor White
Write-Host "2. Follow the deployment-checklist.md for step-by-step instructions" -ForegroundColor White
Write-Host "3. Update call-center-definition.xml with your Salesforce org URL" -ForegroundColor White
Write-Host "4. Create the required custom fields on the Case object" -ForegroundColor White
Write-Host "5. Upload and configure the Call Center in Salesforce" -ForegroundColor White

Write-Host "`n🚀 Deployment package ready!" -ForegroundColor Green
