# AWS Deployment Guide for Doo-Dah-AUI

This guide explains how to deploy the Doo-Dah-AUI Spring Boot + React application to AWS ECS with an Application Load Balancer (ALB) and SSL certificate.

## Overview

The deployment consists of:
- **Spring Boot backend** (Java) serving both API and static React frontend
- **React frontend** (Vite) built and bundled with the backend
- **AWS ECS Fargate** for container orchestration
- **AWS ECR** for Docker image storage
- **Application Load Balancer (ALB)** with SSL termination
- **AWS Secrets Manager** for sensitive configuration
- **AWS Systems Manager Parameter Store** for non-sensitive configuration

## Prerequisites

1. **AWS CLI** installed and configured
2. **AWS SSO** profile configured (profile name: `partyk1d24`)
3. **Domain** registered with DNS access (`secondave.net`)
4. **Java 17+** and **Gradle** installed
5. **Node.js 18+** for React frontend

## Quick Deployment

### 1. Setup AWS Secrets and Configuration

Run the setup script to configure AWS Secrets Manager and Parameter Store:

**PowerShell:**
```powershell
.\scripts\setup-aws-secrets.ps1
```

**Bash:**
```bash
./scripts/setup-aws-secrets.sh
```

This script creates:
- Secrets in AWS Secrets Manager (Auth0, database, Pinecone)
- Configuration parameters in SSM Parameter Store
- IAM policy for ECS task access

### 2. Build and Push Docker Image

Build the full-stack application and push to AWS ECR:

**PowerShell:**
```powershell
.\scripts\push-to-ecr.ps1
```

**Bash:**
```bash
./scripts/push-to-ecr.sh
```

This script:
- Builds the React frontend using Vite
- Copies frontend assets to Spring Boot static resources
- Builds Docker image using Gradle Jib
- Creates ECR repository if needed
- Pushes image to ECR

### 3. Deploy to ECS

Deploy the application to AWS ECS Fargate:

**PowerShell:**
```powershell
.\scripts\deploy-to-ecs.ps1
```

**Bash:**
```bash
./scripts/deploy-to-ecs.sh
```

This script:
- Registers ECS task definition with ECR image
- Creates or updates ECS service
- Configures auto-scaling and networking

### 4. Setup Application Load Balancer

Create ALB with SSL certificate and security groups:

**PowerShell:**
```powershell
.\scripts\alb-setup.ps1
```

**Bash:**
```bash
./scripts/alb-setup.sh
```

This script creates:
- Application Load Balancer (internet-facing)
- Target group for ECS tasks
- Security groups for ALB and ECS
- SSL certificate via AWS Certificate Manager
- HTTP → HTTPS redirect listener
- HTTPS listener with SSL termination

### 5. Complete ALB Setup

After SSL certificate validation, finish the ALB setup:

**PowerShell:**
```powershell
.\scripts\complete-alb-setup.ps1
```

**Bash:**
```bash
./scripts/complete-alb-setup.sh
```

## Manual Steps Required

### SSL Certificate Validation

After running the ALB setup script, you need to validate the SSL certificate:

1. Go to [AWS Certificate Manager Console](https://console.aws.amazon.com/acm/)
2. Find your certificate for `doodah.secondave.net`
3. Copy the CNAME record details
4. Add the CNAME record to your DNS provider
5. Wait for validation (can take up to 30 minutes)

### DNS Configuration

Once the certificate is validated:

1. Get the ALB DNS name from the script output or AWS console
2. Create a CNAME record in your DNS provider:
   - **Name:** `doodah`
   - **Type:** `CNAME`
   - **Value:** `[ALB-DNS-NAME]` (from script output)

## Configuration Details

### Environment Variables

The application uses these environment configurations:

**AWS Secrets Manager:**
- `doo-dah-aui/auth0-client-id` - Auth0 client credentials
- `doo-dah-aui/sqlite-password` - Database connection details
- `doo-dah-aui/pinecone-api-key` - Pinecone API configuration

**SSM Parameter Store:**
- `/doo-dah-aui/ollama-base-url` - Ollama base URL
- `/doo-dah-aui/ollama-model` - Ollama model name
- `/doo-dah-aui/logging-level` - Application logging level

### Security

- **ALB Security Group:** Allows HTTP (80) and HTTPS (443) from internet
- **ECS Security Group:** Allows port 8080 from ALB only
- **SSL/TLS:** Terminated at ALB, HTTP redirects to HTTPS
- **Secrets:** Stored in AWS Secrets Manager, accessed via IAM roles

### Monitoring

The application includes:
- **Health Check:** `/actuator/health` endpoint
- **ALB Health Checks:** 30-second intervals
- **ECS Service:** Auto-scaling enabled
- **CloudWatch Logs:** Automatic log collection

## Troubleshooting

### Common Issues

1. **Certificate Validation Fails**
   - Verify DNS CNAME record is correct
   - Check domain ownership
   - Wait up to 30 minutes for propagation

2. **ECS Tasks Failing**
   - Check CloudWatch logs for errors
   - Verify secrets are properly configured
   - Ensure IAM role has correct permissions

3. **ALB Health Checks Failing**
   - Verify application is running on port 8080
   - Check `/actuator/health` endpoint responds
   - Ensure security group allows ALB → ECS traffic

4. **DNS Not Resolving**
   - Verify CNAME record points to ALB DNS name
   - Check TTL settings (lower for testing)
   - Use DNS lookup tools to verify propagation

### Useful Commands

**Check ECS Service Status:**
```bash
aws ecs describe-services --cluster doo-dah --service doo-dah-aui --region us-east-2 --profile partyk1d24
```

**Check ALB Status:**
```bash
aws elbv2 describe-load-balancers --names doo-dah-aui-alb --region us-east-2 --profile partyk1d24
```

**View ECS Logs:**
```bash
aws logs describe-log-groups --log-group-name-prefix "/ecs/doo-dah-aui" --region us-east-2 --profile partyk1d24
```

**Check Certificate Status:**
```bash
aws acm describe-certificate --certificate-arn [CERT-ARN] --region us-east-2 --profile partyk1d24
```

## Cleanup

### Quick Cleanup (Automated)

To quickly remove all costly AWS resources while preserving configuration:

**PowerShell:**
```powershell
.\scripts\cleanup-aws.ps1
```

**Bash:**
```bash
./scripts/cleanup-aws.sh
```

This script will:
- ✅ Stop and delete ECS services and tasks
- ✅ Delete Application Load Balancer and target groups
- ✅ Remove security groups
- ✅ Delete SSL certificates
- 💾 Preserve ECR repository (images)
- 💾 Preserve secrets and parameters (for quick redeploy)

### Complete Cleanup (Manual)

To remove all AWS resources and avoid charges:

### Delete ECS Resources
```bash
# Stop ECS service
aws ecs update-service --cluster doo-dah --service doo-dah-aui --desired-count 0 --region us-east-2 --profile partyk1d24

# Delete ECS service
aws ecs delete-service --cluster doo-dah --service doo-dah-aui --region us-east-2 --profile partyk1d24

# Delete ECS cluster
aws ecs delete-cluster --cluster doo-dah --region us-east-2 --profile partyk1d24
```

### Delete ALB Resources
```bash
# Get ALB ARN from alb-config.env
source alb-config.env  # or manually get ARNs

# Delete ALB
aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN --region us-east-2 --profile partyk1d24

# Delete target group
aws elbv2 delete-target-group --target-group-arn $TARGET_GROUP_ARN --region us-east-2 --profile partyk1d24

# Delete security groups
aws ec2 delete-security-group --group-id $ALB_SG_ID --region us-east-2 --profile partyk1d24
```

### Delete Other Resources
```bash
# Delete ECR repository
aws ecr delete-repository --repository-name doo-dah-aui --force --region us-east-2 --profile partyk1d24

# Delete SSL certificate
aws acm delete-certificate --certificate-arn $CERT_ARN --region us-east-2 --profile partyk1d24

# Delete secrets
aws secretsmanager delete-secret --secret-id doo-dah-aui/auth0-client-id --force-delete-without-recovery --region us-east-2 --profile partyk1d24
aws secretsmanager delete-secret --secret-id doo-dah-aui/sqlite-password --force-delete-without-recovery --region us-east-2 --profile partyk1d24
aws secretsmanager delete-secret --secret-id doo-dah-aui/pinecone-api-key --force-delete-without-recovery --region us-east-2 --profile partyk1d24

# Delete SSM parameters
aws ssm delete-parameter --name /doo-dah-aui/ollama-base-url --region us-east-2 --profile partyk1d24
aws ssm delete-parameter --name /doo-dah-aui/ollama-model --region us-east-2 --profile partyk1d24
aws ssm delete-parameter --name /doo-dah-aui/logging-level --region us-east-2 --profile partyk1d24
```

## Cost Optimization

- **ECS Fargate:** ~$30-50/month for small workloads
- **ALB:** ~$20/month base cost
- **ECR:** ~$0.10/GB/month for storage
- **Secrets Manager:** ~$0.40/secret/month
- **Data Transfer:** Varies based on usage

To minimize costs:
- Use ECS auto-scaling to scale down during low usage
- Consider using ECS on EC2 for sustained workloads
- Monitor CloudWatch metrics and set up billing alerts

## Support

For issues or questions:
1. Check AWS CloudWatch logs for application errors
2. Review ECS service events in the AWS console
3. Verify DNS and certificate configuration
4. Check security group and IAM permissions

## Architecture Diagram

```
Internet → Route 53 (DNS) → ALB (SSL/HTTPS) → ECS Fargate (Spring Boot + React)
                                ↓
                         AWS Secrets Manager & SSM Parameter Store
                                ↓
                           CloudWatch Logs & Metrics
```

This setup provides a production-ready, scalable, and secure deployment of the Doo-Dah-AUI application on AWS.
.\push-to-ecr.ps1
```

```bash
# Bash
./push-to-ecr.sh
```

This script will:
- Build the React frontend using Vite
- Package the Spring Boot application with embedded frontend
- Create a Docker image using Jib
- Push the image to Amazon ECR

### 3. Deploy to ECS

The ECS task definition (`ecs-task-definition.json`) is automatically updated with:
- Correct ECR image URI
- Environment variables for Spring Boot
- Secrets and parameters from AWS services
- Health check configuration
- Logging configuration

Register the task definition and update the service:
```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
aws ecs update-service --cluster doo-dah --service doo-dah-aui --task-definition doo-dah-aui-task:latest
```

### 4. Set Up Application Load Balancer

```powershell
# PowerShell - Update domain in script first
.\alb-setup.ps1
```

```bash
# Bash - Update domain in script first
./alb-setup.sh
```

This creates:
- Application Load Balancer with public access
- Target group pointing to ECS tasks on port 8080
- Security groups for ALB and ECS communication
- SSL certificate request via AWS Certificate Manager
- HTTP listener (redirects to HTTPS)

### 5. Validate SSL Certificate

After running the ALB setup:

1. **Get DNS validation record** from AWS Certificate Manager console or:
   ```bash
   aws acm describe-certificate --certificate-arn <cert-arn>
   ```

2. **Add CNAME record** to your DNS:
   - Name: `_validation-hash.yourdomain.com`
   - Value: `_validation-value.acm-validations.aws.`

3. **Complete setup** after certificate validation:
   ```powershell
   .\complete-alb-setup.ps1
   ```

### 6. Update DNS

Point your domain to the Application Load Balancer:
- **Record Type**: CNAME or ALIAS
- **Name**: `doodah.secondave.net`
- **Value**: `your-alb-dns-name.us-east-2.elb.amazonaws.com`

## Configuration Files

### ECS Task Definition (`ecs-task-definition.json`)
- Defines container configuration
- Maps secrets and parameters to environment variables
- Configures health checks and logging
- Specifies CPU/memory requirements

### Spring Boot Configuration (`application-aws.yaml`)
- AWS-specific profile configuration
- References secrets via AWS integration
- Configures Auth0, SQLite, and Pinecone integration

### Build Configuration (`app/build.gradle`)
- Jib plugin for containerization
- gradle-node-plugin for frontend build automation
- Dependencies and build tasks

## Environment Variables

The application uses these environment variables in ECS:

**From Secrets Manager:**
- `AUTH0_CLIENT_ID`: Auth0 client identifier
- `SQLITE_PASSWORD`: Database password
- `PINECONE_API_KEY`: Pinecone vector database API key

**From Parameter Store:**
- `OLLAMA_BASE_URL`: Ollama service endpoint
- `OLLAMA_MODEL`: AI model specification
- `LOGGING_LEVEL`: Application logging level

**Direct Environment:**
- `SPRING_PROFILES_ACTIVE=aws`: Activates AWS profile
- `SERVER_PORT=8080`: Application port
- `JAVA_OPTS`: JVM configuration

## Monitoring and Logs

### CloudWatch Logs
- Log Group: `/ecs/doo-dah-aui`
- Stream Prefix: `ecs`
- Retention: Configurable (default 30 days)

### Health Checks
- **ALB Health Check**: `/actuator/health`
- **ECS Health Check**: `/actuator/health/readiness`
- **Fallback Check**: Root endpoint `/`

### Metrics
- ECS service metrics (CPU, memory, network)
- ALB metrics (request count, latency, errors)
- Application metrics via Spring Boot Actuator

## Security

### IAM Roles
- **ECS Task Execution Role**: Pulls images, accesses secrets
- **ECS Task Role**: Application runtime permissions

### Security Groups
- **ALB Security Group**: Allows HTTP (80) and HTTPS (443) from internet
- **ECS Security Group**: Allows traffic from ALB on port 8080

### Secrets Management
- Sensitive data stored in AWS Secrets Manager
- Non-sensitive config in Systems Manager Parameter Store
- Secrets injected as environment variables at runtime

## Troubleshooting

### Check ECS Service Status
```bash
aws ecs describe-services --cluster doo-dah --services doo-dah-aui
```

### View ECS Task Logs
```bash
aws logs tail /ecs/doo-dah-aui --follow
```

### Check ALB Target Health
```bash
aws elbv2 describe-target-health --target-group-arn <target-group-arn>
```

### Common Issues

1. **Certificate Validation Failed**
   - Verify DNS validation record is correctly added
   - Wait for DNS propagation (up to 48 hours)

2. **ECS Tasks Failing**
   - Check CloudWatch logs for application errors
   - Verify secrets and parameters are accessible
   - Ensure correct IAM permissions

3. **ALB Health Check Failing**
   - Verify application starts successfully
   - Check security group rules
   - Confirm health check endpoint responds

## Cost Optimization

### Resource Sizing
- **ECS Tasks**: 512 CPU, 1024 MB memory (adjustable based on load)
- **ALB**: Scales automatically based on traffic
- **ECR**: Pay for storage used

### Cost Monitoring
- Enable AWS Cost Explorer
- Set up billing alerts
- Monitor unused resources

## Cleanup

To remove all AWS resources:

```powershell
# PowerShell
.\cleanup-aws-resources.ps1
```

```bash
# Bash
./cleanup-aws-resources.sh
```

This will remove:
1. ECS service and tasks
2. Application Load Balancer and target groups
3. Security groups
4. ECR repository (optional)
5. Secrets and parameters (optional)
6. SSL certificate (optional)

**Note**: Domain DNS records must be manually removed.

## Development Workflow

### Local Development
```bash
# Backend
./gradlew bootRun

# Frontend (separate terminal)
cd ui && npm run dev
```

### Build and Test
```bash
# Full build with tests
./gradlew build

# Container build
./gradlew jib
```

### Deploy Changes
```bash
# 1. Build and push new image
./push-to-ecr.ps1

# 2. Update ECS service (automatic with latest tag)
aws ecs update-service --cluster doo-dah --service doo-dah-aui --force-new-deployment
```

## Support

For issues or questions:
1. Check CloudWatch logs for application errors
2. Review AWS service status pages
3. Verify IAM permissions and security groups
4. Check DNS configuration and SSL certificate status
