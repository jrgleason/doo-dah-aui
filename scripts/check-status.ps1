# PowerShell script to check ECS service status
$AWS_PROFILE = "partyk1d24"
$REGION = "us-east-2"

Write-Host "Checking ECS service status..." -ForegroundColor Yellow
Write-Host ""

# Get service status
$SERVICE_STATUS = aws ecs describe-services `
    --cluster doo-dah `
    --services doo-dah-aui `
    --profile $AWS_PROFILE `
    --region $REGION `
    --query 'services[0].{Status:status,TaskDef:taskDefinition,RunningCount:runningCount,PendingCount:pendingCount,DesiredCount:desiredCount}' `
    --output table

Write-Host "Service Status:" -ForegroundColor Green
Write-Host $SERVICE_STATUS
Write-Host ""

# Get task public IP
$TASK_ARN = aws ecs list-tasks `
    --cluster doo-dah `
    --service-name doo-dah-aui `
    --profile $AWS_PROFILE `
    --region $REGION `
    --query "taskArns[0]" `
    --output text

if ($TASK_ARN -and $TASK_ARN -ne "None") {
    $ENI_ID = aws ecs describe-tasks `
        --cluster doo-dah `
        --tasks $TASK_ARN `
        --profile $AWS_PROFILE `
        --region $REGION `
        --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" `
        --output text

    if ($ENI_ID -and $ENI_ID -ne "None") {
        $PUBLIC_IP = aws ec2 describe-network-interfaces `
            --network-interface-ids $ENI_ID `
            --profile $AWS_PROFILE `
            --region $REGION `
            --query "NetworkInterfaces[0].Association.PublicIp" `
            --output text

        Write-Host "Current Public IP: $PUBLIC_IP" -ForegroundColor Cyan
        Write-Host "Application URL: http://$($PUBLIC_IP):8080" -ForegroundColor Cyan
        Write-Host ""
    }
}

# Check if ALB exists
try {
    $ALB_EXISTS = aws elbv2 describe-load-balancers `
        --names doo-dah-aui-alb `
        --profile $AWS_PROFILE `
        --region $REGION `
        --query "LoadBalancers[0].DNSName" `
        --output text 2>$null

    if ($ALB_EXISTS -and $ALB_EXISTS -ne "None") {
        Write-Host "ALB DNS Name: $ALB_EXISTS" -ForegroundColor Green
        Write-Host "ALB URL: https://$ALB_EXISTS" -ForegroundColor Green
    } else {
        Write-Host "No ALB found. Run alb-setup.ps1 to create one." -ForegroundColor Yellow
    }
} catch {
    Write-Host "No ALB found. Run alb-setup.ps1 to create one." -ForegroundColor Yellow
}
