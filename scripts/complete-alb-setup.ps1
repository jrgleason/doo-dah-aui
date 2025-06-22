# PowerShell script to complete ALB setup after certificate validation
$AWS_PROFILE = "partyk1d24"
$REGION = "us-east-2"

Write-Host "Completing ALB setup after certificate validation..." -ForegroundColor Yellow

# Load ALB configuration
if (Test-Path "alb-config.env") {
    Get-Content "alb-config.env" | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            Set-Variable -Name $matches[1] -Value $matches[2]
        }
    }
    Write-Host "Loaded ALB configuration" -ForegroundColor Green
    
    if (-not $CERT_ARN) {
        Write-Host "Certificate ARN not found in alb-config.env. Please run alb-setup.ps1 first." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "alb-config.env not found. Please run alb-setup.ps1 first." -ForegroundColor Red
    exit 1
}

# Check certificate status
Write-Host "Checking certificate validation status..." -ForegroundColor Green
$CERT_STATUS = aws acm describe-certificate `
    --certificate-arn $CERT_ARN `
    --profile $AWS_PROFILE `
    --region $REGION `
    --query "Certificate.Status" `
    --output text

Write-Host "Certificate Status: $CERT_STATUS" -ForegroundColor Cyan

if ($CERT_STATUS -eq "ISSUED") {
    Write-Host "Certificate is validated! Creating HTTPS listener..." -ForegroundColor Green
    
    # Create HTTPS listener
    $HTTPS_LISTENER_ARN = aws elbv2 create-listener `
        --load-balancer-arn $ALB_ARN `
        --protocol HTTPS `
        --port 443 `
        --certificates CertificateArn=$CERT_ARN `
        --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN `
        --profile $AWS_PROFILE `
        --region $REGION `
        --query "Listeners[0].ListenerArn" `
        --output text

    if ($HTTPS_LISTENER_ARN) {
        Write-Host "HTTPS Listener created: $HTTPS_LISTENER_ARN" -ForegroundColor Green
        
        # Update ECS service to use the load balancer
        Write-Host "Updating ECS service to use ALB..." -ForegroundColor Green
        aws ecs update-service `
            --cluster doo-dah `
            --service doo-dah-aui `
            --load-balancers targetGroupArn=$TARGET_GROUP_ARN,containerName=doo-dah-aui,containerPort=8080 `
            --profile $AWS_PROFILE `
            --region $REGION | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Host "ECS service updated successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Your application will be available at:" -ForegroundColor Yellow
            Write-Host "https://doodah.secondave.net" -ForegroundColor Cyan
            Write-Host "http://doodah.secondave.net (redirects to HTTPS)" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Make sure to update your DNS to point doodah.secondave.net to:" -ForegroundColor Yellow
            Write-Host "$ALB_DNS" -ForegroundColor Cyan
        } else {
            Write-Host "Failed to update ECS service" -ForegroundColor Red
        }
    } else {
        Write-Host "Failed to create HTTPS listener" -ForegroundColor Red
    }
} else {
    Write-Host "Certificate is not yet validated. Please add the DNS validation record:" -ForegroundColor Yellow
    
    # Get validation details
    $VALIDATION_RECORD = aws acm describe-certificate `
        --certificate-arn $CERT_ARN `
        --profile $AWS_PROFILE `
        --region $REGION `
        --query "Certificate.DomainValidationOptions[0].ResourceRecord" `
        --output table
    
    Write-Host "DNS Validation Record:" -ForegroundColor Cyan
    Write-Host $VALIDATION_RECORD
    Write-Host ""
    Write-Host "After adding the DNS record, run this script again to complete the setup." -ForegroundColor Yellow
}
