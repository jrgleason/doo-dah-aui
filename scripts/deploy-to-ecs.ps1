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
aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $REGION --profile $AWS_PROFILE 2>$null

# 2. Create CloudWatch Log Group
Write-Host "Creating CloudWatch log group..." -ForegroundColor Yellow
aws logs create-log-group --log-group-name "/ecs/doo-dah-aui" --region $REGION --profile $AWS_PROFILE 2>$null

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

$trustPolicyJson | Out-File -FilePath "trust-policy.json" -Encoding UTF8

aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document file://trust-policy.json --region $REGION --profile $AWS_PROFILE 2>$null
aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy --region $REGION --profile $AWS_PROFILE 2>$null

# ECS Task Role (for application permissions)
aws iam create-role --role-name ecsTaskRole --assume-role-policy-document file://trust-policy.json --region $REGION --profile $AWS_PROFILE 2>$null

# Create and attach custom policy for Secrets Manager and Parameter Store access
Write-Host "Creating custom IAM policy for Secrets Manager and Parameter Store..." -ForegroundColor Yellow
aws iam create-policy --policy-name doo-dah-aui-secrets-policy --policy-document file://aws/ssm-policy.json --region $REGION --profile $AWS_PROFILE 2>$null
aws iam attach-role-policy --role-name ecsTaskRole --policy-arn "arn:aws:iam::$ACCOUNT_ID:policy/doo-dah-aui-secrets-policy" --region $REGION --profile $AWS_PROFILE 2>$null

# 4. Get actual secret ARNs (they have random suffixes)
Write-Host "Discovering secret ARNs..." -ForegroundColor Yellow
$AUTH0_SECRET_ARN = aws secretsmanager describe-secret --secret-id "doo-dah-aui/auth0-client-id" --region $REGION --profile $AWS_PROFILE --query "ARN" --output text 2>$null
$SQLITE_SECRET_ARN = aws secretsmanager describe-secret --secret-id "doo-dah-aui/sqlite-password" --region $REGION --profile $AWS_PROFILE --query "ARN" --output text 2>$null
$PINECONE_SECRET_ARN = aws secretsmanager describe-secret --secret-id "doo-dah-aui/pinecone-api-key" --region $REGION --profile $AWS_PROFILE --query "ARN" --output text 2>$null

# 5. Register task definition
Write-Host "Registering task definition..." -ForegroundColor Yellow

# Update task definition with actual account ID and secret ARNs
$taskDefContent = Get-Content "aws/ecs-task-definition.json" -Raw
$taskDefContent = $taskDefContent -replace "660315378336", $ACCOUNT_ID

# Replace placeholder ARNs with actual ARNs (which include random suffixes)
if ($AUTH0_SECRET_ARN) { 
    $taskDefContent = $taskDefContent -replace "arn:aws:secretsmanager:us-east-2:660315378336:secret:doo-dah-aui/auth0-client-id[^""]*", $AUTH0_SECRET_ARN 
}
if ($SQLITE_SECRET_ARN) { 
    $taskDefContent = $taskDefContent -replace "arn:aws:secretsmanager:us-east-2:660315378336:secret:doo-dah-aui/sqlite-password[^""]*", $SQLITE_SECRET_ARN 
}
if ($PINECONE_SECRET_ARN) { 
    $taskDefContent = $taskDefContent -replace "arn:aws:secretsmanager:us-east-2:660315378336:secret:doo-dah-aui/pinecone-api-key[^""]*", $PINECONE_SECRET_ARN 
}

# Save updated task definition
$taskDefContent | Set-Content -Path "aws/ecs-task-definition-updated.json" -Encoding UTF8

# Validate JSON before registering
try {
    $testJson = $taskDefContent | ConvertFrom-Json
    Write-Host "Task definition JSON is valid" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Task definition JSON is invalid: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Register the task definition
# Use this:
Write-Host "Attempting to register task definition..." -ForegroundColor Yellow
$taskDefArn = aws ecs register-task-definition --cli-input-json file://aws/ecs-task-definition-updated.json --region $REGION --profile $AWS_PROFILE --query "taskDefinition.taskDefinitionArn" --output text

if ($LASTEXITCODE -eq 0) {
    Write-Host "Task definition registered successfully: $taskDefArn" -ForegroundColor Green
} else {
    Write-Host "Task definition registration failed!" -ForegroundColor Red
    Write-Host "Let's try to see what's in the generated file:" -ForegroundColor Yellow
    Get-Content "aws/ecs-task-definition-updated.json" | Select-Object -First 10
    exit 1
}
Write-Host "Task definition registered successfully" -ForegroundColor Green

# 6. Get default VPC and subnets
Write-Host "Getting VPC information..." -ForegroundColor Yellow
$VPC_ID = aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region $REGION --profile $AWS_PROFILE
$SUBNET_IDS = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[*].SubnetId" --output text --region $REGION --profile $AWS_PROFILE

Write-Host "Default VPC ID: $VPC_ID" -ForegroundColor Cyan
Write-Host "Available Subnets: $SUBNET_IDS" -ForegroundColor Cyan

# 7. Create Security Group
Write-Host "Creating security group..." -ForegroundColor Yellow
$SG_ID = aws ec2 create-security-group --group-name doo-dah-aui-sg --description "Security group for doo-dah-aui ECS service" --vpc-id $VPC_ID --region $REGION --profile $AWS_PROFILE --query "GroupId" --output text 2>$null

if ($SG_ID -and $SG_ID -ne "None") {
    # Allow inbound traffic on port 8080
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 8080 --cidr 0.0.0.0/0 --region $REGION --profile $AWS_PROFILE 2>$null
    Write-Host "Security Group created: $SG_ID" -ForegroundColor Green
} else {
    # Security group might already exist, try to find it
    $SG_ID = aws ec2 describe-security-groups --filters "Name=group-name,Values=doo-dah-aui-sg" --query "SecurityGroups[0].GroupId" --output text --region $REGION --profile $AWS_PROFILE 2>$null
    Write-Host "Using existing Security Group: $SG_ID" -ForegroundColor Green
}

# 8. Create ECS Service (persistent) instead of one-time task
Write-Host "Creating ECS service..." -ForegroundColor Yellow
$SUBNET_ARRAY = $SUBNET_IDS -split "`t"
$FIRST_SUBNET = $SUBNET_ARRAY[0]

Write-Host "DEBUG: Creating service with subnet: $FIRST_SUBNET and security group: $SG_ID" -ForegroundColor Magenta

$serviceResult = aws ecs create-service --cluster $CLUSTER_NAME --service-name $SERVICE_NAME --task-definition $TASK_FAMILY --desired-count 1 --launch-type FARGATE --network-configuration "awsvpcConfiguration={subnets=[$FIRST_SUBNET],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" --region $REGION --profile $AWS_PROFILE --output json 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "ECS service created successfully!" -ForegroundColor Green
    Write-Host "DEBUG: Service creation result: $serviceResult" -ForegroundColor Magenta
} else {
    Write-Host "ERROR: Failed to create ECS service: $serviceResult" -ForegroundColor Red
    exit 1
}
Write-Host "Monitor your service: https://$REGION.console.aws.amazon.com/ecs/home?region=$REGION#/clusters/$CLUSTER_NAME/services" -ForegroundColor Yellow

# Cleanup temporary files
Remove-Item "trust-policy.json" -ErrorAction SilentlyContinue

Write-Host "Deployment complete! Your application should be starting up." -ForegroundColor Green
Write-Host "Monitor your service: https://$REGION.console.aws.amazon.com/ecs/home?region=$REGION#/clusters/$CLUSTER_NAME/services" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Set up Application Load Balancer: .\scripts\alb-setup.ps1" -ForegroundColor White
Write-Host "   2. Complete ALB setup after certificate validation: .\scripts\complete-alb-setup.ps1" -ForegroundColor White
