# PowerShell script to push image to ECR
$REGION = "us-east-2"
$REPOSITORY_NAME = "doo-dah-aui"
$EXTERNAL_IP = "108.82.238.227"
$LOCAL_REGISTRY_PORT = "30500"
$EXTERNAL_REGISTRY = "$EXTERNAL_IP" + ":" + "$LOCAL_REGISTRY_PORT"
$AWS_PROFILE = "partyk1d24"

Write-Host "🐳 Registry setup for doo-dah-aui..." -ForegroundColor Yellow
Write-Host "Using external IP: $EXTERNAL_IP" -ForegroundColor Cyan

# Test if external registry is accessible
Write-Host "Testing external registry accessibility: $EXTERNAL_REGISTRY" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://$EXTERNAL_REGISTRY/v2/" -Method GET -TimeoutSec 10
    Write-Host "External registry is accessible via HTTP!" -ForegroundColor Green
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Your registry should work with ECS!" -ForegroundColor Green
    Write-Host "Registry URL: $EXTERNAL_REGISTRY/doo-dah-aui:latest" -ForegroundColor Cyan
    Write-Host ""
    $choice = Read-Host "Do you want to (1) Use external registry or (2) Use ECR? [1/2]"
    
    if ($choice -eq "1") {
        Write-Host "Creating ECS task definition for external registry..." -ForegroundColor Green
        
        # Update task definition with external IP
        $taskDefContent = Get-Content "ecs-task-definition.json" -Raw
          # Get Account ID
        $ACCOUNT_ID = aws sts get-caller-identity --query "Account" --output text --profile $AWS_PROFILE
        $taskDefContent = $taskDefContent -replace "{ACCOUNT_ID}", $ACCOUNT_ID
        
        $taskDefContent | Out-File -FilePath "ecs-task-definition-external.json" -Encoding ascii -NoNewline
        
        Write-Host "Task definition created: ecs-task-definition-external.json" -ForegroundColor Green
        Write-Host "Image URI: $EXTERNAL_REGISTRY/doo-dah-aui:latest" -ForegroundColor Cyan
        Write-Host "You can now run the ECS deployment script with this task definition!" -ForegroundColor Yellow
        exit 0
    }
}
catch {
    Write-Host "Cannot reach external registry: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "This might be because:" -ForegroundColor Yellow
    Write-Host "   1. Port $LOCAL_REGISTRY_PORT is not forwarded through your router/firewall" -ForegroundColor Yellow
    Write-Host "   2. Your Kubernetes NodePort service isn't accessible externally" -ForegroundColor Yellow
    Write-Host "   3. Your ISP blocks incoming connections on port $LOCAL_REGISTRY_PORT" -ForegroundColor Yellow
    Write-Host "Proceeding with ECR setup..." -ForegroundColor Yellow
}

# Continue with ECR setup...
Write-Host ""
Write-Host "Setting up ECR..." -ForegroundColor Yellow

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

echo $loginPassword | docker login --username AWS --password-stdin $ECR_LOGIN_SERVER
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
    
    # Fallback: Pull from local registry and push via Docker
    Write-Host "Pulling image from local registry..." -ForegroundColor Yellow
    docker pull 108.82.238.227:30500/doo-dah-aui:latest
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to pull from local registry. Build image first with 'gradlew build'" -ForegroundColor Red
        exit 1
    }

    # Tag image for ECR
    Write-Host "Tagging image for ECR..." -ForegroundColor Yellow
    docker tag 108.82.238.227:30500/doo-dah-aui:latest "$ECR_URI`:latest"

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
$taskDefContent = Get-Content "ecs-task-definition.json" -Raw
$taskDefContent = $taskDefContent -replace "108\.82\.238\.227:30500/doo-dah-aui:latest", "$ECR_URI`:latest"

# Get Account ID
$ACCOUNT_ID = aws sts get-caller-identity --query "Account" --output text --profile $AWS_PROFILE
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to get AWS Account ID. Check your AWS credentials." -ForegroundColor Red
    exit 1
}
$taskDefContent = $taskDefContent -replace "\{ACCOUNT_ID\}", $ACCOUNT_ID

# Use Set-Content instead of Out-File to avoid BOM issues
$taskDefContent | Set-Content -Path "aws/ecs-task-definition-ecr.json" -Encoding UTF8

Write-Host "Task definition updated with ECR image URI" -ForegroundColor Green
Write-Host "Updated file: aws/ecs-task-definition-ecr.json" -ForegroundColor Cyan
Write-Host "Account ID: $ACCOUNT_ID" -ForegroundColor Cyan
Write-Host "Image URI: $ECR_URI`:latest" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now deploy to ECS using:" -ForegroundColor Yellow
Write-Host "aws ecs register-task-definition --cli-input-json file://aws/ecs-task-definition-ecr.json --profile $AWS_PROFILE" -ForegroundColor White
Write-Host "aws ecs update-service --cluster doo-dah --service doo-dah-aui --task-definition doo-dah-aui --profile $AWS_PROFILE" -ForegroundColor White