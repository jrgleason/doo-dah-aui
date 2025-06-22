#!/bin/bash

# Variables - Update these with your values
ACCOUNT_ID="YOUR_ACCOUNT_ID"
REGION="us-east-2"
CLUSTER_NAME="doo-dah-cluster"
SERVICE_NAME="doo-dah-aui-service"
TASK_FAMILY="doo-dah-aui-task"
IMAGE_URI="YOUR_ECR_URI/doo-dah-aui:latest"  # You'll need to push to ECR first

echo "Starting ECS deployment for doo-dah-aui"

# 1. Create ECS Cluster
echo "Creating ECS cluster..."
aws ecs create-cluster --cluster-name "$CLUSTER_NAME" --region "$REGION"

# 2. Create CloudWatch Log Group
echo "Creating CloudWatch log group..."
aws logs create-log-group --log-group-name "/ecs/doo-dah-aui" --region "$REGION"

# 3. Create IAM roles if they don't exist
echo "Creating IAM roles..."

# ECS Task Execution Role
cat > trust-policy.json << EOF
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
EOF

aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document file://trust-policy.json
aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# ECS Task Role (for application permissions)
aws iam create-role --role-name ecsTaskRole --assume-role-policy-document file://trust-policy.json

# Create and attach custom policy for Secrets Manager and Parameter Store access
echo "Creating custom IAM policy for Secrets Manager and Parameter Store..."
aws iam create-policy --policy-name doo-dah-aui-secrets-policy --policy-document file://ssm-policy.json
aws iam attach-role-policy --role-name ecsTaskRole --policy-arn "arn:aws:iam::$ACCOUNT_ID:policy/doo-dah-aui-secrets-policy"

# 4. Get actual secret ARNs (they have random suffixes)
echo "Discovering secret ARNs..."
AUTH0_SECRET_ARN=$(aws secretsmanager describe-secret --secret-id "doo-dah-aui/auth0-client-id" --region "$REGION" --query "ARN" --output text 2>/dev/null)
SQLITE_SECRET_ARN=$(aws secretsmanager describe-secret --secret-id "doo-dah-aui/sqlite-password" --region "$REGION" --query "ARN" --output text 2>/dev/null)
PINECONE_SECRET_ARN=$(aws secretsmanager describe-secret --secret-id "doo-dah-aui/pinecone-api-key" --region "$REGION" --query "ARN" --output text 2>/dev/null)

# 5. Register task definition (use ECR version if available)
echo "Registering task definition..."
if [ -f "ecs-task-definition-ecr.json" ]; then
    echo "Using ECR task definition..."
    # Update ECR task definition with actual secret ARNs
    cp ecs-task-definition-ecr.json ecs-task-definition-ecr-updated.json
    if [ ! -z "$AUTH0_SECRET_ARN" ]; then
        sed -i "s|arn:aws:secretsmanager:us-east-2:660315378336:secret:doo-dah-aui/auth0-client-id[^\"]*|$AUTH0_SECRET_ARN|g" ecs-task-definition-ecr-updated.json
    fi
    if [ ! -z "$SQLITE_SECRET_ARN" ]; then
        sed -i "s|arn:aws:secretsmanager:us-east-2:660315378336:secret:doo-dah-aui/sqlite-password[^\"]*|$SQLITE_SECRET_ARN|g" ecs-task-definition-ecr-updated.json
    fi
    if [ ! -z "$PINECONE_SECRET_ARN" ]; then
        sed -i "s|arn:aws:secretsmanager:us-east-2:660315378336:secret:doo-dah-aui/pinecone-api-key[^\"]*|$PINECONE_SECRET_ARN|g" ecs-task-definition-ecr-updated.json
    fi
    aws ecs register-task-definition --cli-input-json file://aws/ecs-task-definition-ecr-updated.json --region "$REGION" --query "taskDefinition.taskDefinitionArn" --output text > /dev/null
    echo "Task definition registered successfully"
else
    echo "ECR task definition not found, using base definition..."
    # Update task definition with actual account ID and secret ARNs
    cp aws/ecs-task-definition.json aws/ecs-task-definition-updated.json
    sed -i "s/ACCOUNT_ID/$ACCOUNT_ID/g" ecs-task-definition-updated.json
    if [ ! -z "$AUTH0_SECRET_ARN" ]; then
        sed -i "s|arn:aws:secretsmanager:us-east-2:660315378336:secret:doo-dah-aui/auth0-client-id[^\"]*|$AUTH0_SECRET_ARN|g" ecs-task-definition-updated.json
    fi
    if [ ! -z "$SQLITE_SECRET_ARN" ]; then
        sed -i "s|arn:aws:secretsmanager:us-east-2:660315378336:secret:doo-dah-aui/sqlite-password[^\"]*|$SQLITE_SECRET_ARN|g" ecs-task-definition-updated.json
    fi
    if [ ! -z "$PINECONE_SECRET_ARN" ]; then
        sed -i "s|arn:aws:secretsmanager:us-east-2:660315378336:secret:doo-dah-aui/pinecone-api-key[^\"]*|$PINECONE_SECRET_ARN|g" ecs-task-definition-updated.json
    fi
    aws ecs register-task-definition --cli-input-json file://aws/ecs-task-definition-updated.json --region "$REGION" --query "taskDefinition.taskDefinitionArn" --output text > /dev/null
    echo "Task definition registered successfully"
fi

# 7. Get default VPC and subnets
echo "Getting VPC information..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region "$REGION")
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[*].SubnetId" --output text --region "$REGION")

echo "Default VPC ID: $VPC_ID"
echo "Available Subnets: $SUBNET_IDS"

# 8. Create Security Group
echo "Creating security group..."
SG_ID=$(aws ec2 create-security-group --group-name doo-dah-aui-sg --description "Security group for doo-dah-aui ECS service" --vpc-id "$VPC_ID" --region "$REGION" --query "GroupId" --output text)

# Allow inbound traffic on port 8080
aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 8080 --cidr 0.0.0.0/0 --region "$REGION"

echo "Security Group created: $SG_ID"

# 9. Run the task (one-time execution)
echo "Running ECS task..."
SUBNET_ARRAY=($SUBNET_IDS)
FIRST_SUBNET=${SUBNET_ARRAY[0]}

aws ecs run-task \
  --cluster "$CLUSTER_NAME" \
  --task-definition "$TASK_FAMILY" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$FIRST_SUBNET],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
  --region "$REGION"

echo "ECS task started successfully!"
echo "Monitor your task: https://$REGION.console.aws.amazon.com/ecs/home?region=$REGION#/clusters/$CLUSTER_NAME/tasks"

# Cleanup temporary files
rm -f trust-policy.json

echo "Deployment complete! Your application should be starting up."

# Note about image accessibility
echo ""
echo "IMPORTANT: Your image is currently on a local registry (10.0.0.58:30500)"
echo "   ECS cannot access this. You need to:"
echo "   1. Create an ECR repository"
echo "   2. Push your image to ECR"
echo "   3. Update the task definition with the ECR image URI"
