#!/bin/bash

# Shell script to complete ALB setup after certificate validation
AWS_PROFILE="partyk1d24"
REGION="us-east-2"

echo "Completing ALB setup after certificate validation..."

# Load ALB configuration
if [[ -f "alb-config.env" ]]; then
    source alb-config.env
    echo "Loaded ALB configuration"
else
    echo "alb-config.env not found. Please run alb-setup.sh first."
    exit 1
fi

# Check certificate status
echo "Checking certificate validation status..."
CERT_STATUS=$(aws acm describe-certificate \
    --certificate-arn "$CERT_ARN" \
    --profile "$AWS_PROFILE" \
    --region "$REGION" \
    --query "Certificate.Status" \
    --output text)

echo "Certificate Status: $CERT_STATUS"

if [[ "$CERT_STATUS" == "ISSUED" ]]; then
    echo "Certificate is validated! Creating HTTPS listener..."
    
    # Create HTTPS listener
    HTTPS_LISTENER_ARN=$(aws elbv2 create-listener \
        --load-balancer-arn "$ALB_ARN" \
        --protocol HTTPS \
        --port 443 \
        --certificates CertificateArn="$CERT_ARN" \
        --default-actions Type=forward,TargetGroupArn="$TARGET_GROUP_ARN" \
        --profile "$AWS_PROFILE" \
        --region "$REGION" \
        --query "Listeners[0].ListenerArn" \
        --output text)

    if [[ -n "$HTTPS_LISTENER_ARN" ]]; then
        echo "HTTPS Listener created: $HTTPS_LISTENER_ARN"
        
        # Update ECS service to use the load balancer
        echo "Updating ECS service to use ALB..."
        aws ecs update-service \
            --cluster doo-dah \
            --service doo-dah-aui \
            --load-balancers targetGroupArn="$TARGET_GROUP_ARN",containerName=doo-dah-aui,containerPort=8080 \
            --profile "$AWS_PROFILE" \
            --region "$REGION" >/dev/null

        if [[ $? -eq 0 ]]; then
            echo "ECS service updated successfully!"
            echo ""
            echo "Your application will be available at:"
            echo "https://doodah.secondave.net"
            echo "http://doodah.secondave.net (redirects to HTTPS)"
            echo ""
            echo "Make sure to update your DNS to point doodah.secondave.net to:"
            echo "$ALB_DNS"
        else
            echo "Failed to update ECS service"
        fi
    else
        echo "Failed to create HTTPS listener"
    fi
else
    echo "Certificate is not yet validated. Please add the DNS validation record:"
    
    # Get validation details
    echo "DNS Validation Record:"
    aws acm describe-certificate \
        --certificate-arn "$CERT_ARN" \
        --profile "$AWS_PROFILE" \
        --region "$REGION" \
        --query "Certificate.DomainValidationOptions[0].ResourceRecord" \
        --output table
    
    echo ""
    echo "After adding the DNS record, run this script again to complete the setup."
fi
