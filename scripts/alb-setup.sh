#!/bin/bash

# Shell script to set up Application Load Balancer for doo-dah-aui
AWS_PROFILE="partyk1d24"
REGION="us-east-2"
DOMAIN_NAME="secondave.net"
SUBDOMAIN="doodah"  # This will create doodah.secondave.net

echo "Setting up Application Load Balancer for doo-dah-aui..."
echo "AWS Profile: $AWS_PROFILE"
echo "Region: $REGION"
echo ""

# Get VPC ID and subnets
echo "Getting VPC and subnet information..."
VPC_ID=$(aws ec2 describe-vpcs --profile "$AWS_PROFILE" --region "$REGION" --query "Vpcs[?IsDefault==\`true\`].VpcId" --output text)
SUBNET_IDS=$(aws ec2 describe-subnets --profile "$AWS_PROFILE" --region "$REGION" --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[?MapPublicIpOnLaunch==\`true\`].SubnetId" --output text)

echo "VPC ID: $VPC_ID"
echo "Public Subnets: $SUBNET_IDS"
echo ""

# Create security group for ALB
echo "Creating security group for ALB..."
ALB_SG_ID=$(aws ec2 create-security-group \
    --group-name doo-dah-aui-alb-sg \
    --description "Security group for doo-dah-aui Application Load Balancer" \
    --vpc-id "$VPC_ID" \
    --profile "$AWS_PROFILE" \
    --region "$REGION" \
    --query "GroupId" \
    --output text 2>/dev/null)

if [[ -n "$ALB_SG_ID" && "$ALB_SG_ID" != "None" ]]; then
    echo "ALB Security Group created: $ALB_SG_ID"
else
    # Security group might already exist, try to find it
    ALB_SG_ID=$(aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=doo-dah-aui-alb-sg" \
        --query "SecurityGroups[0].GroupId" \
        --output text \
        --profile "$AWS_PROFILE" \
        --region "$REGION" 2>/dev/null)
    echo "Using existing ALB Security Group: $ALB_SG_ID"
fi

# Add inbound rules for HTTP and HTTPS (only if we have a valid security group ID)
if [[ -n "$ALB_SG_ID" && "$ALB_SG_ID" != "None" && "$ALB_SG_ID" != "" ]]; then
    aws ec2 authorize-security-group-ingress \
        --group-id "$ALB_SG_ID" \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0 \
        --profile "$AWS_PROFILE" \
        --region "$REGION" 2>/dev/null

    aws ec2 authorize-security-group-ingress \
        --group-id "$ALB_SG_ID" \
        --protocol tcp \
        --port 443 \
        --cidr 0.0.0.0/0 \
        --profile "$AWS_PROFILE" \
        --region "$REGION" 2>/dev/null

    echo "Security group rules added for ports 80 and 443"
else
    echo "Warning: Could not configure ALB security group rules"
fi
echo ""

# Create Application Load Balancer
echo "Creating Application Load Balancer..."
ALB_ARN=$(aws elbv2 create-load-balancer \
    --name doo-dah-aui-alb \
    --subnets $SUBNET_IDS \
    --security-groups "$ALB_SG_ID" \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --profile "$AWS_PROFILE" \
    --region "$REGION" \
    --query "LoadBalancers[0].LoadBalancerArn" \
    --output text)

echo "ALB ARN: $ALB_ARN"

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns "$ALB_ARN" \
    --profile "$AWS_PROFILE" \
    --region "$REGION" \
    --query "LoadBalancers[0].DNSName" \
    --output text)

echo "ALB DNS Name: $ALB_DNS"
echo ""

# Create target group
echo "Creating target group..."
TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
    --name doo-dah-aui-tg \
    --protocol HTTP \
    --port 8080 \
    --vpc-id "$VPC_ID" \
    --target-type ip \
    --health-check-path "/actuator/health" \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 10 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --profile "$AWS_PROFILE" \
    --region "$REGION" \
    --query "TargetGroups[0].TargetGroupArn" \
    --output text)

echo "Target Group ARN: $TARGET_GROUP_ARN"
echo ""

# Request SSL certificate
echo "Requesting SSL certificate..."
echo "Note: You'll need to validate this certificate via DNS or email"
CERT_ARN=$(aws acm request-certificate \
    --domain-name "$SUBDOMAIN.$DOMAIN_NAME" \
    --validation-method DNS \
    --profile "$AWS_PROFILE" \
    --region "$REGION" \
    --query "CertificateArn" \
    --output text)

echo "Certificate ARN: $CERT_ARN"
echo ""

# Create HTTP listener (redirect to HTTPS)
echo "Creating HTTP listener (redirect to HTTPS)..."
HTTP_LISTENER_ARN=$(aws elbv2 create-listener \
    --load-balancer-arn "$ALB_ARN" \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
    --profile "$AWS_PROFILE" \
    --region "$REGION" \
    --query "Listeners[0].ListenerArn" \
    --output text)

echo "HTTP Listener ARN: $HTTP_LISTENER_ARN"

# Note: HTTPS listener will be created after certificate validation
echo "HTTPS listener will be created after SSL certificate validation."
echo "Run the complete-alb-setup.sh script after validating your certificate."
# Update ECS service security group to allow traffic from ALB
echo "Updating ECS service security group..."
ECS_SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=*doo-dah*" \
    --profile "$AWS_PROFILE" \
    --region "$REGION" \
    --query "SecurityGroups[0].GroupId" \
    --output text)

if [[ "$ECS_SG_ID" != "None" && -n "$ECS_SG_ID" ]]; then
    aws ec2 authorize-security-group-ingress \
        --group-id "$ECS_SG_ID" \
        --protocol tcp \
        --port 8080 \
        --source-group "$ALB_SG_ID" \
        --profile "$AWS_PROFILE" \
        --region "$REGION" >/dev/null 2>&1
    
    echo "Updated ECS security group to allow ALB traffic"
else
    echo "Could not find ECS security group. You may need to manually update it."
fi

echo ""
echo "Application Load Balancer setup complete!"
echo ""
echo "Summary:"
echo "ALB DNS Name: $ALB_DNS"
echo "Target Group ARN: $TARGET_GROUP_ARN"
echo "Certificate ARN: $CERT_ARN"
echo ""
echo "Next Steps:"
echo "1. Validate your SSL certificate in the AWS Certificate Manager console"
echo "2. Update your DNS to point $SUBDOMAIN.$DOMAIN_NAME to $ALB_DNS"
echo "3. Update your ECS service to use the target group (see complete-alb-setup.sh)"
echo ""

# Save configuration for later use
cat > alb-config.env << EOF
ALB_ARN=$ALB_ARN
ALB_DNS=$ALB_DNS
TARGET_GROUP_ARN=$TARGET_GROUP_ARN
CERT_ARN=$CERT_ARN
ALB_SG_ID=$ALB_SG_ID
EOF

echo "Configuration saved to alb-config.env"
