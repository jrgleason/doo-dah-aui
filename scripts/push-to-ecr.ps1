# PowerShell script to push image to ECR
$REGION = "us-east-2"
$REPOSITORY_NAME = "doo-dah-aui"
$AWS_PROFILE = "partyk1d24"

Write-Host "Setting up ECR deployment for doo-dah-aui..." -ForegroundColor Yellow

# 1. Create ECR repository
Write-Host "Creating ECR repository..." -ForegroundColor Yellow
$ECR_URI = aws ecr create-repository --repository-name $REPOSITORY_NAME --region $REGION --query "repository.repositoryUri" --output text --profile $AWS_PROFILE

if ($LASTEXITCODE -ne 0) {
    Write-Host "Repository might already exist, getting URI..." -ForegroundColor Yellow
    $ECR_URI = aws ecr describe-repositories --repository-names $REPOSITORY_NAME --region $REGION --query "repositories[0].repositoryUri" --output text --profile $AWS_PROFILE
}

Write-Host "ECR Repository URI: $ECR_URI" -ForegroundColor Green

# 2. Get ECR login token
Write-Host "Logging into ECR..." -ForegroundColor Yellow
$ECR_LOGIN_SERVER = $ECR_URI.Split('/')[0]
Write-Host "ECR Login Server: $ECR_LOGIN_SERVER" -ForegroundColor Cyan

$loginPassword = aws ecr get-login-password --region $REGION --profile $AWS_PROFILE
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to get ECR login password. Check your AWS credentials." -ForegroundColor Red
    exit 1
}

Write-Output $loginPassword | docker login --username AWS --password-stdin $ECR_LOGIN_SERVER
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to login to ECR. Check Docker daemon is running." -ForegroundColor Red
    exit 1
}

# 3. Build and push using Gradle Jib (directly to ECR)
Write-Host "Building and pushing image using Gradle Jib..." -ForegroundColor Yellow
Set-Location app
$env:AWS_PROFILE = $AWS_PROFILE
.\..\gradlew.bat jib
Set-Location ..

if ($LASTEXITCODE -eq 0) {
    Write-Host "Image successfully built and pushed to ECR using Jib!" -ForegroundColor Green
    Write-Host "ECR Image URI: $ECR_URI`:latest" -ForegroundColor Cyan
} else {
    Write-Host "Jib push failed, trying Docker fallback..." -ForegroundColor Yellow
    
    # Fallback: Build image locally and push via Docker
    Write-Host "Building image locally..." -ForegroundColor Yellow
    
    # Check if Dockerfile exists
    if (-not (Test-Path "Dockerfile")) {
        Write-Host "ERROR: Dockerfile not found. Cannot build image locally." -ForegroundColor Red
        exit 1
    }
    
    # Build image locally
    docker build -t "doo-dah-aui:latest" .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to build image locally." -ForegroundColor Red
        exit 1
    }

    # Tag image for ECR
    Write-Host "Tagging image for ECR..." -ForegroundColor Yellow
    docker tag "doo-dah-aui:latest" "$ECR_URI`:latest"

    # Push to ECR
    Write-Host "Pushing image to ECR..." -ForegroundColor Yellow
    docker push "$ECR_URI`:latest"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Image successfully pushed to ECR via Docker!" -ForegroundColor Green
        Write-Host "ECR Image URI: $ECR_URI`:latest" -ForegroundColor Cyan
    } else {
        Write-Host "Failed to push to ECR via Docker" -ForegroundColor Red
        exit 1
    }
}

# 6. Update task definition with ECR URI
Write-Host "Updating task definition with ECR URI..." -ForegroundColor Yellow

# Debug: Check what task definition files exist
Write-Host "DEBUG: Checking for task definition files..." -ForegroundColor Magenta
$possibleFiles = @(
    "aws/ecs-task-definition.json",
    "ecs-task-definition.json",
    "aws/ecs-task-definition-ecr.json"
)

$sourceFile = $null
foreach ($file in $possibleFiles) {
    Write-Host "DEBUG: Checking $file..." -ForegroundColor Magenta
    if (Test-Path $file) {
        Write-Host "DEBUG: Found $file" -ForegroundColor Green
        $sourceFile = $file
        break
    } else {
        Write-Host "DEBUG: $file not found" -ForegroundColor Yellow
    }
}

if (-not $sourceFile) {
    Write-Host "ERROR: No task definition template found!" -ForegroundColor Red
    Write-Host "Looked for:" -ForegroundColor Yellow
    $possibleFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
    
    if (Test-Path "aws") {
        Write-Host "Files in aws/ directory:" -ForegroundColor Yellow
        Get-ChildItem "aws" | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor White }
    }
    exit 1
}

Write-Host "Using source file: $sourceFile" -ForegroundColor Green

try {
    $taskDefContent = Get-Content $sourceFile -Raw
    Write-Host "Successfully read task definition template" -ForegroundColor Green
    
    # Replace external registry with ECR URI if it exists in the template
    $originalContent = $taskDefContent
    $taskDefContent = $taskDefContent -replace "108\.82\.238\.227:30500/doo-dah-aui:latest", "$ECR_URI`:latest"
    
    # Also replace any other common local registry patterns
    $taskDefContent = $taskDefContent -replace "localhost:30500/doo-dah-aui:latest", "$ECR_URI`:latest"

    # Get Account ID
    $ACCOUNT_ID = aws sts get-caller-identity --query "Account" --output text --profile $AWS_PROFILE
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to get AWS Account ID. Check your AWS credentials." -ForegroundColor Red
        exit 1
    }
    
    # Replace account ID placeholder
    $taskDefContent = $taskDefContent -replace "\{ACCOUNT_ID\}", $ACCOUNT_ID
    $taskDefContent = $taskDefContent -replace "660315378336", $ACCOUNT_ID

    # Check if any replacements were made
    if ($taskDefContent -eq $originalContent) {
        Write-Host "WARNING: No replacements were made to task definition" -ForegroundColor Yellow
    } else {
        Write-Host "Task definition updated with ECR URI and Account ID" -ForegroundColor Green
    }

    # Ensure aws directory exists
    if (-not (Test-Path "aws")) {
        New-Item -ItemType Directory -Path "aws" | Out-Null
        Write-Host "Created aws/ directory" -ForegroundColor Green
    }

    # Use UTF-8 without BOM to avoid AWS CLI parsing issues
    $outputFile = "aws/ecs-task-definition-ecr.json"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText("$PWD/$outputFile", $taskDefContent, $utf8NoBom)
    
    Write-Host "Task definition updated and saved to: $outputFile" -ForegroundColor Green
    Write-Host "Account ID: $ACCOUNT_ID" -ForegroundColor Cyan
    Write-Host "Image URI: $ECR_URI`:latest" -ForegroundColor Cyan
    
    # Validate the generated JSON
    try {
        $testJson = $taskDefContent | ConvertFrom-Json
        Write-Host "Generated JSON is valid" -ForegroundColor Green
    } catch {
        Write-Host "WARNING: Generated JSON may be invalid: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "ERROR: Failed to process task definition: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "You can now deploy to ECS using:" -ForegroundColor Yellow
Write-Host "  .\scripts\deploy-to-ecs.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Or manually with:" -ForegroundColor Yellow
Write-Host "  aws ecs register-task-definition --cli-input-json file://aws/ecs-task-definition-ecr.json --profile $AWS_PROFILE" -ForegroundColor White
Write-Host "  aws ecs update-service --cluster doo-dah --service doo-dah-aui --task-definition doo-dah-aui-task --profile $AWS_PROFILE" -ForegroundColor White