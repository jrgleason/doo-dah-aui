# PowerShell script for Windows deployment to ECS
# Variables - Update these with your values
$AWS_PROFILE = "partyk1d24"
$REGION = "us-east-2"
$CLUSTER_NAME = "doo-dah"
$SERVICE_NAME = "doo-dah-aui"
$TASK_FAMILY = "doo-dah-aui-task"

Write-Host "Starting ECS deployment for doo-dah-aui" -ForegroundColor Yellow

# Get Account ID
$ACCOUNT_ID = aws sts get-caller-identity --query "Account" --output text --profile $AWS_PROFILE
Write-Host "Detected Account ID: $ACCOUNT_ID" -ForegroundColor Cyan

# 1. Create ECS Cluster
Write-Host "Creating ECS cluster..." -ForegroundColor Yellow
$clusterResult = aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $REGION --profile $AWS_PROFILE 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "ECS cluster created/verified successfully" -ForegroundColor Green
} else {
    # Check if cluster already exists
    $existingCluster = aws ecs describe-clusters --clusters $CLUSTER_NAME --region $REGION --profile $AWS_PROFILE --query "clusters[0].status" --output text 2>$null
    if ($existingCluster -eq "ACTIVE") {
        Write-Host "ECS cluster already exists and is active" -ForegroundColor Green
    } else {
        Write-Host "Failed to create ECS cluster: $clusterResult" -ForegroundColor Red
        exit 1
    }
}

# 2. Create CloudWatch Log Group
Write-Host "Creating CloudWatch log group..." -ForegroundColor Yellow
$logResult = aws logs create-log-group --log-group-name "/ecs/doo-dah-aui" --region $REGION --profile $AWS_PROFILE 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "CloudWatch log group created successfully" -ForegroundColor Green
} else {
    if ($logResult -match "ResourceAlreadyExistsException") {
        Write-Host "CloudWatch log group already exists" -ForegroundColor Green
    } else {
        Write-Host "Failed to create CloudWatch log group: $logResult" -ForegroundColor Red
        exit 1
    }
}

# 3. Create IAM roles if they don't exist
Write-Host "Creating IAM roles..." -ForegroundColor Yellow

# ECS Task Execution Role
$trustPolicyJson = @'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
'@

$trustPolicyJson | Set-Content -Path "trust-policy.json" -Encoding UTF8

# Create execution role
$execRoleResult = aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document file://trust-policy.json --region $REGION --profile $AWS_PROFILE 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "ECS Task Execution Role created successfully" -ForegroundColor Green
} else {
    if ($execRoleResult -match "EntityAlreadyExists") {
        Write-Host "ECS Task Execution Role already exists" -ForegroundColor Green
    } else {
        Write-Host "Failed to create ECS Task Execution Role: $execRoleResult" -ForegroundColor Red
        exit 1
    }
}

# Attach policy to execution role
aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy --region $REGION --profile $AWS_PROFILE 2>$null

# ECS Task Role (for application permissions)
$taskRoleResult = aws iam create-role --role-name ecsTaskRole --assume-role-policy-document file://trust-policy.json --region $REGION --profile $AWS_PROFILE 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "ECS Task Role created successfully" -ForegroundColor Green
} else {
    if ($taskRoleResult -match "EntityAlreadyExists") {
        Write-Host "ECS Task Role already exists" -ForegroundColor Green
    } else {
        Write-Host "Failed to create ECS Task Role: $taskRoleResult" -ForegroundColor Red
        exit 1
    }
}

# Create and attach custom policy for Secrets Manager and Parameter Store access
Write-Host "Creating custom IAM policy for Secrets Manager and Parameter Store..." -ForegroundColor Yellow
$policyResult = aws iam create-policy --policy-name doo-dah-aui-secrets-policy --policy-document file://aws/ssm-policy.json --region $REGION --profile $AWS_PROFILE 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Custom secrets policy created successfully" -ForegroundColor Green
} else {
    if ($policyResult -match "EntityAlreadyExists") {
        Write-Host "Custom secrets policy already exists" -ForegroundColor Green
    } else {
        Write-Host "Failed to create custom secrets policy: $policyResult" -ForegroundColor Red
        exit 1
    }
}

aws iam attach-role-policy --role-name ecsTaskRole --policy-arn "arn:aws:iam::$ACCOUNT_ID:policy/doo-dah-aui-secrets-policy" --region $REGION --profile $AWS_PROFILE 2>$null

# 4. Get actual secret ARNs (they have random suffixes)
Write-Host "Discovering secret ARNs..." -ForegroundColor Yellow
$AUTH0_SECRET_ARN = aws secretsmanager describe-secret --secret-id "doo-dah-aui/auth0-client-id" --region $REGION --profile $AWS_PROFILE --query "ARN" --output text 2>$null
$SQLITE_SECRET_ARN = aws secretsmanager describe-secret --secret-id "doo-dah-aui/sqlite-password" --region $REGION --profile $AWS_PROFILE --query "ARN" --output text 2>$null
$PINECONE_SECRET_ARN = aws secretsmanager describe-secret --secret-id "doo-dah-aui/pinecone-api-key" --region $REGION --profile $AWS_PROFILE --query "ARN" --output text 2>$null

Write-Host "Found secrets:" -ForegroundColor Cyan
Write-Host "  AUTH0_SECRET_ARN: $AUTH0_SECRET_ARN" -ForegroundColor White
Write-Host "  SQLITE_SECRET_ARN: $SQLITE_SECRET_ARN" -ForegroundColor White
Write-Host "  PINECONE_SECRET_ARN: $PINECONE_SECRET_ARN" -ForegroundColor White

# 5. Register task definition
Write-Host "Registering task definition..." -ForegroundColor Yellow

# Check if task definition file exists
if (-not (Test-Path "aws/ecs-task-definition.json")) {
    Write-Host "ERROR: Task definition file not found at aws/ecs-task-definition.json" -ForegroundColor Red
    exit 1
}

# Update task definition with actual account ID and secret ARNs
$taskDefContent = Get-Content "aws/ecs-task-definition.json" -Raw
$originalContent = $taskDefContent

# Replace account ID - be more specific to avoid unintended replacements
$taskDefContent = $taskDefContent -replace '"660315378336"', """$ACCOUNT_ID"""
$taskDefContent = $taskDefContent -replace '660315378336\.dkr\.ecr', "$ACCOUNT_ID.dkr.ecr"

# Replace placeholder ARNs with actual ARNs (which include random suffixes)
if ($AUTH0_SECRET_ARN -and $AUTH0_SECRET_ARN -ne "None") { 
    $taskDefContent = $taskDefContent -replace "arn:aws:secretsmanager:us-east-2:660315378336:secret:doo-dah-aui/auth0-client-id[^""]*", $AUTH0_SECRET_ARN 
    Write-Host "Replaced AUTH0_CLIENT_ID ARN" -ForegroundColor Green
} else {
    Write-Host "WARNING: AUTH0_CLIENT_ID secret not found" -ForegroundColor Yellow
}

if ($SQLITE_SECRET_ARN -and $SQLITE_SECRET_ARN -ne "None") { 
    $taskDefContent = $taskDefContent -replace "arn:aws:secretsmanager:us-east-2:660315378336:secret:doo-dah-aui/sqlite-password[^""]*", $SQLITE_SECRET_ARN 
    Write-Host "Replaced SQLITE_PASSWORD ARN" -ForegroundColor Green
} else {
    Write-Host "WARNING: SQLITE_PASSWORD secret not found" -ForegroundColor Yellow
}

if ($PINECONE_SECRET_ARN -and $PINECONE_SECRET_ARN -ne "None") { 
    $taskDefContent = $taskDefContent -replace "arn:aws:secretsmanager:us-east-2:660315378336:secret:doo-dah-aui/pinecone-api-key[^""]*", $PINECONE_SECRET_ARN 
    Write-Host "Replaced PINECONE_API_KEY ARN" -ForegroundColor Green
} else {
    Write-Host "WARNING: PINECONE_API_KEY secret not found" -ForegroundColor Yellow
}

# Check if any replacements were made
if ($taskDefContent -eq $originalContent) {
    Write-Host "WARNING: No replacements were made to the task definition" -ForegroundColor Yellow
}

# Save updated task definition without BOM to prevent AWS CLI JSON parsing issues
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("$PWD/aws/ecs-task-definition-updated.json", $taskDefContent, $utf8NoBom)

# Validate JSON before registering
try {
    $testJson = $taskDefContent | ConvertFrom-Json
    Write-Host "Task definition JSON is valid" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Task definition JSON is invalid: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "First 500 characters of generated JSON:" -ForegroundColor Yellow
    Write-Host $taskDefContent.Substring(0, [Math]::Min(500, $taskDefContent.Length)) -ForegroundColor White
    exit 1
}

# Register the task definition
Write-Host "Attempting to register task definition..." -ForegroundColor Yellow
$taskDefResult = aws ecs register-task-definition --cli-input-json file://aws/ecs-task-definition-updated.json --region $REGION --profile $AWS_PROFILE 2>&1

if ($LASTEXITCODE -eq 0) {
    # Extract task definition ARN from the result
    try {
        $taskDefJson = $taskDefResult | ConvertFrom-Json
        $taskDefArn = $taskDefJson.taskDefinition.taskDefinitionArn
        Write-Host "Task definition registered successfully: $taskDefArn" -ForegroundColor Green
    } catch {
        Write-Host "Task definition registered successfully (could not parse ARN)" -ForegroundColor Green
    }
} else {
    Write-Host "ERROR: Task definition registration failed!" -ForegroundColor Red
    Write-Host "Error details: $taskDefResult" -ForegroundColor Red
    Write-Host "First 10 lines of generated file:" -ForegroundColor Yellow
    Get-Content "aws/ecs-task-definition-updated.json" | Select-Object -First 10 | ForEach-Object { Write-Host $_ }
    exit 1
}

# 6. Get default VPC and subnets
Write-Host "Getting VPC information..." -ForegroundColor Yellow
$VPC_ID = aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region $REGION --profile $AWS_PROFILE

if (-not $VPC_ID -or $VPC_ID -eq "None") {
    Write-Host "ERROR: No default VPC found" -ForegroundColor Red
    exit 1
}

$SUBNET_IDS = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[*].SubnetId" --output text --region $REGION --profile $AWS_PROFILE

if (-not $SUBNET_IDS -or $SUBNET_IDS -eq "None") {
    Write-Host "ERROR: No subnets found in default VPC" -ForegroundColor Red
    exit 1
}

Write-Host "Default VPC ID: $VPC_ID" -ForegroundColor Cyan
Write-Host "Available Subnets: $SUBNET_IDS" -ForegroundColor Cyan

# 7. Create Security Group
Write-Host "Creating security group..." -ForegroundColor Yellow
$sgResult = aws ec2 create-security-group --group-name doo-dah-aui-sg --description "Security group for doo-dah-aui ECS service" --vpc-id $VPC_ID --region $REGION --profile $AWS_PROFILE --output json 2>&1

if ($LASTEXITCODE -eq 0) {
    try {
        $sgJson = $sgResult | ConvertFrom-Json
        $SG_ID = $sgJson.GroupId
        Write-Host "Security Group created: $SG_ID" -ForegroundColor Green
        
        # Allow inbound traffic on port 8080
        aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 8080 --cidr 0.0.0.0/0 --region $REGION --profile $AWS_PROFILE 2>$null
        Write-Host "Security group rules added for port 8080" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: Could not parse security group creation result" -ForegroundColor Red
        exit 1
    }
} else {
    if ($sgResult -match "InvalidGroup.Duplicate") {
        # Security group already exists, try to find it
        $SG_ID = aws ec2 describe-security-groups --filters "Name=group-name,Values=doo-dah-aui-sg" --query "SecurityGroups[0].GroupId" --output text --region $REGION --profile $AWS_PROFILE 2>$null
        if ($SG_ID -and $SG_ID -ne "None") {
            Write-Host "Using existing Security Group: $SG_ID" -ForegroundColor Green
        } else {
            Write-Host "ERROR: Could not find existing security group" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "ERROR: Failed to create security group: $sgResult" -ForegroundColor Red
        exit 1
    }
}

# 8. Create ECS Service (persistent) instead of one-time task
Write-Host "Creating ECS service..." -ForegroundColor Yellow

# Parse subnets more carefully - they're tab-separated
$SUBNET_ARRAY = $SUBNET_IDS -split "`t" | Where-Object { $_.Trim() -ne "" -and $_.StartsWith("subnet-") }
$FIRST_SUBNET = $SUBNET_ARRAY[0].Trim()

if (-not $FIRST_SUBNET -or -not $FIRST_SUBNET.StartsWith("subnet-")) {
    Write-Host "ERROR: No valid subnet found. Available subnets: $SUBNET_IDS" -ForegroundColor Red
    Write-Host "Parsed subnets: $($SUBNET_ARRAY -join ', ')" -ForegroundColor Red
    exit 1
}

Write-Host "Using subnet: $FIRST_SUBNET and security group: $SG_ID" -ForegroundColor Cyan

# Check if service already exists
$existingService = aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION --profile $AWS_PROFILE --query "services[0].status" --output text 2>$null

if ($existingService -and $existingService -ne "None" -and $existingService -ne "INACTIVE") {
    Write-Host "ECS service already exists with status: $existingService" -ForegroundColor Yellow
    Write-Host "Updating service to use latest task definition..." -ForegroundColor Yellow
    
    $updateResult = aws ecs update-service --cluster $CLUSTER_NAME --service $SERVICE_NAME --task-definition $TASK_FAMILY --region $REGION --profile $AWS_PROFILE --output json 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "ECS service updated successfully!" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Failed to update ECS service: $updateResult" -ForegroundColor Red
        exit 1
    }
} else {
    # Create new service
    $serviceResult = aws ecs create-service --cluster $CLUSTER_NAME --service-name $SERVICE_NAME --task-definition $TASK_FAMILY --desired-count 1 --launch-type FARGATE --network-configuration "awsvpcConfiguration={subnets=[$FIRST_SUBNET],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" --region $REGION --profile $AWS_PROFILE --output json 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "ECS service created successfully!" -ForegroundColor Green
        Write-Host "Service creation completed" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Failed to create ECS service: $serviceResult" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Monitor your service: https://$REGION.console.aws.amazon.com/ecs/home?region=$REGION#/clusters/$CLUSTER_NAME/services" -ForegroundColor Yellow

# Cleanup temporary files
Remove-Item "trust-policy.json" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Deployment complete! Your application should be starting up." -ForegroundColor Green
Write-Host "Monitor your service: https://$REGION.console.aws.amazon.com/ecs/home?region=$REGION#/clusters/$CLUSTER_NAME/services" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Set up Application Load Balancer: .\scripts\alb-setup.ps1" -ForegroundColor White
Write-Host "   2. Complete ALB setup after certificate validation: .\scripts\complete-alb-setup.ps1" -ForegroundColor White