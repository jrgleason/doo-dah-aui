# PowerShell script to set up Application Load Balancer for doo-dah-aui
$AWS_PROFILE = "partyk1d24"
$REGION = "us-east-2"
$DOMAIN_NAME = "secondave.net"
$SUBDOMAIN = "doodah"  # This will create doodah.secondave.net

Write-Host "Setting up Application Load Balancer for doo-dah-aui..." -ForegroundColor Yellow
Write-Host "AWS Profile: $AWS_PROFILE" -ForegroundColor Cyan
Write-Host "Region: $REGION" -ForegroundColor Cyan
Write-Host ""

# Get VPC ID and subnets
Write-Host "Getting VPC and subnet information..." -ForegroundColor Green
$VPC_ID = aws ec2 describe-vpcs --profile $AWS_PROFILE --region $REGION --query "Vpcs[?IsDefault==``true``].VpcId" --output text
$SUBNET_IDS = aws ec2 describe-subnets --profile $AWS_PROFILE --region $REGION --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[?MapPublicIpOnLaunch==``true``].SubnetId" --output text
$SUBNET_ARRAY = $SUBNET_IDS -split "`t"

Write-Host "VPC ID: $VPC_ID" -ForegroundColor White
Write-Host "Public Subnets: $($SUBNET_ARRAY -join ', ')" -ForegroundColor White
Write-Host ""

# Create security group for ALB
Write-Host "Creating security group for ALB..." -ForegroundColor Green
$ALB_SG_ID = aws ec2 create-security-group `
    --group-name doo-dah-aui-alb-sg `
    --description "Security group for doo-dah-aui Application Load Balancer" `
    --vpc-id $VPC_ID `
    --profile $AWS_PROFILE `
    --region $REGION `
    --query "GroupId" `
    --output text 2>$null

if ($ALB_SG_ID -and $ALB_SG_ID -ne "None") {
    Write-Host "ALB Security Group created: $ALB_SG_ID" -ForegroundColor White
} else {
    # Security group might already exist, try to find it
    $ALB_SG_ID = aws ec2 describe-security-groups `
        --filters "Name=group-name,Values=doo-dah-aui-alb-sg" `
        --query "SecurityGroups[0].GroupId" `
        --output text `
        --profile $AWS_PROFILE `
        --region $REGION 2>$null
    Write-Host "Using existing ALB Security Group: $ALB_SG_ID" -ForegroundColor White
}

# Add inbound rules for HTTP and HTTPS (only if we have a valid security group ID)
if ($ALB_SG_ID -and $ALB_SG_ID -ne "None" -and $ALB_SG_ID -ne "") {
    aws ec2 authorize-security-group-ingress `
        --group-id $ALB_SG_ID `
        --protocol tcp `
        --port 80 `
        --cidr 0.0.0.0/0 `
        --profile $AWS_PROFILE `
        --region $REGION 2>$null

    aws ec2 authorize-security-group-ingress `
        --group-id $ALB_SG_ID `
        --protocol tcp `
        --port 443 `
        --cidr 0.0.0.0/0 `
        --profile $AWS_PROFILE `
        --region $REGION 2>$null

    Write-Host "Security group rules added for ports 80 and 443" -ForegroundColor Green
} else {
    Write-Host "Warning: Could not configure ALB security group rules" -ForegroundColor Yellow
}
Write-Host ""

# Create Application Load Balancer
Write-Host "Creating Application Load Balancer..." -ForegroundColor Green
$ALB_ARN = aws elbv2 create-load-balancer `
    --name doo-dah-aui-alb `
    --subnets $SUBNET_ARRAY `
    --security-groups $ALB_SG_ID `
    --scheme internet-facing `
    --type application `
    --ip-address-type ipv4 `
    --profile $AWS_PROFILE `
    --region $REGION `
    --query "LoadBalancers[0].LoadBalancerArn" `
    --output text

Write-Host "ALB ARN: $ALB_ARN" -ForegroundColor White

# Get ALB DNS name
$ALB_DNS = aws elbv2 describe-load-balancers `
    --load-balancer-arns $ALB_ARN `
    --profile $AWS_PROFILE `
    --region $REGION `
    --query "LoadBalancers[0].DNSName" `
    --output text

Write-Host "ALB DNS Name: $ALB_DNS" -ForegroundColor White
Write-Host ""

# Create target group
Write-Host "Creating target group..." -ForegroundColor Green
$TARGET_GROUP_ARN = aws elbv2 create-target-group `
    --name doo-dah-aui-tg `
    --protocol HTTP `
    --port 8080 `
    --vpc-id $VPC_ID `
    --target-type ip `
    --health-check-path "/actuator/health" `
    --health-check-interval-seconds 30 `
    --health-check-timeout-seconds 10 `
    --healthy-threshold-count 2 `
    --unhealthy-threshold-count 3 `
    --profile $AWS_PROFILE `
    --region $REGION `
    --query "TargetGroups[0].TargetGroupArn" `
    --output text

Write-Host "Target Group ARN: $TARGET_GROUP_ARN" -ForegroundColor White
Write-Host ""

# Request SSL certificate
Write-Host "Requesting SSL certificate..." -ForegroundColor Green
Write-Host "Note: You'll need to validate this certificate via DNS or email" -ForegroundColor Yellow
$CERT_ARN = aws acm request-certificate `
    --domain-name "$SUBDOMAIN.$DOMAIN_NAME" `
    --validation-method DNS `
    --profile $AWS_PROFILE `
    --region $REGION `
    --query "CertificateArn" `
    --output text

Write-Host "Certificate ARN: $CERT_ARN" -ForegroundColor White
Write-Host ""

# Create HTTP listener (redirect to HTTPS)
Write-Host "Creating HTTP listener (redirect to HTTPS)..." -ForegroundColor Green
$HTTP_LISTENER_ARN = aws elbv2 create-listener `
    --load-balancer-arn $ALB_ARN `
    --protocol HTTP `
    --port 80 `
    --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' `
    --profile $AWS_PROFILE `
    --region $REGION `
    --query "Listeners[0].ListenerArn" `
    --output text

Write-Host "HTTP Listener ARN: $HTTP_LISTENER_ARN" -ForegroundColor White

# Note: HTTPS listener will be created after certificate validation
Write-Host "HTTPS listener will be created after SSL certificate validation." -ForegroundColor Yellow
Write-Host "Run the complete-alb-setup.ps1 script after validating your certificate." -ForegroundColor Yellow
Write-Host ""

# Update ECS service security group to allow traffic from ALB
Write-Host "Updating ECS service security group..." -ForegroundColor Green
$ECS_SG_ID = aws ec2 describe-security-groups `
    --filters "Name=group-name,Values=*doo-dah*" `
    --profile $AWS_PROFILE `
    --region $REGION `
    --query "SecurityGroups[0].GroupId" `
    --output text

if ($ECS_SG_ID -and $ECS_SG_ID -ne "None") {
    aws ec2 authorize-security-group-ingress `
        --group-id $ECS_SG_ID `
        --protocol tcp `
        --port 8080 `
        --source-group $ALB_SG_ID `
        --profile $AWS_PROFILE `
        --region $REGION | Out-Null
    
    Write-Host "Updated ECS security group to allow ALB traffic" -ForegroundColor Green
} else {
    Write-Host "Could not find ECS security group. You may need to manually update it." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Application Load Balancer setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "ALB DNS Name: $ALB_DNS" -ForegroundColor Cyan
Write-Host "Target Group ARN: $TARGET_GROUP_ARN" -ForegroundColor Cyan
Write-Host "Certificate ARN: $CERT_ARN" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Validate your SSL certificate in the AWS Certificate Manager console" -ForegroundColor White
Write-Host "2. Update your DNS to point $SUBDOMAIN.$DOMAIN_NAME to $ALB_DNS" -ForegroundColor White
Write-Host "3. Update your ECS service to use the target group (see update-ecs-service.ps1)" -ForegroundColor White
Write-Host ""

# Save configuration for later use
$configContent = @"
ALB_ARN=$ALB_ARN
ALB_DNS=$ALB_DNS
TARGET_GROUP_ARN=$TARGET_GROUP_ARN
CERT_ARN=$CERT_ARN
ALB_SG_ID=$ALB_SG_ID
"@

$configContent | Out-File -FilePath "alb-config.env" -Encoding UTF8

Write-Host "Configuration saved to alb-config.env" -ForegroundColor Green
