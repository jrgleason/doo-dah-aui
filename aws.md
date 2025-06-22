# AWS Deployment Guide for doo-dah-aui

This guide covers deploying the doo-dah-aui application to AWS using ECS Fargate with an Application Load Balancer and SSL certificate.

## Prerequisites

1. AWS CLI installed and configured with profile `partyk1d24`
2. Docker installed and running
3. An AWS account with appropriate permissions
4. A registered domain (we use `secondave.net` with subdomain `doodah`)
5. PowerShell execution policy set to allow script execution

## Deployment Steps

### 1. Set up AWS Secrets and Configuration

First, configure your sensitive data in AWS Secrets Manager and non-sensitive config in Parameter Store:

```powershell
.\scripts\setup-aws-secrets.ps1
```

This will prompt you for:
- Auth0 Client ID
- SQLite Password (optional, can be empty)
- Pinecone API Key

**What it creates:**
- **AWS Secrets Manager** (sensitive data):
  - `doo-dah-aui/auth0-client-id`
  - `doo-dah-aui/sqlite-password`
  - `doo-dah-aui/pinecone-api-key`
- **AWS Parameter Store** (non-sensitive config):
  - `/doo-dah-aui/ollama-base-url`
  - `/doo-dah-aui/ollama-model`
  - `/doo-dah-aui/logging-level`

### 2. Build and Push Docker Image to ECR

```powershell
.\scripts\push-to-ecr.ps1
```

This script will:
- Create an ECR repository named `doo-dah-aui`
- Log into ECR using AWS credentials
- Build your application using Gradle Jib (includes React frontend build)
- Push the image to ECR with tags: `latest` and `0.0.1-SNAPSHOT`
- Update the ECS task definition with the correct ECR image URI
- Generate `aws/ecs-task-definition-ecr.json` for deployment

### 3. Deploy to ECS

```powershell
.\scripts\deploy-to-ecs.ps1
```

This script will:
- Create ECS cluster named `doo-dah`
- Create CloudWatch log group `/ecs/doo-dah-aui`
- Set up IAM roles:
  - `ecsTaskExecutionRole` - for ECS to pull images and write logs
  - `ecsTaskRole` - for application to access AWS services
- Create custom IAM policy for Secrets Manager and Parameter Store access
- Register the task definition with secret ARNs
- Create security group with port 8080 access
- Create and start the ECS service named `doo-dah-aui`

### 4. Set up Application Load Balancer with SSL

```powershell
.\scripts\alb-setup.ps1
```

This script will:
- Create VPC security group for ALB (ports 80, 443)
- Create Application Load Balancer named `doo-dah-aui-alb`
- Create target group for port 8080 with health checks
- Request SSL certificate from AWS Certificate Manager for `doodah.secondave.net`
- Create HTTP listener with redirect to HTTPS
- Save configuration to `alb-config.env`

**Important**: After running this script, you'll need to add a DNS validation record to your domain. The script will display the required CNAME record that looks like:
```
Name: _abc123def456.doodah.secondave.net
Value: _xyz789abc123.acm-validations.aws.
```

### 5. Complete ALB Setup (after DNS validation)

Once you've added the DNS validation record and the certificate is validated (usually takes 5-10 minutes):

```powershell
.\scripts\complete-alb-setup.ps1
```

This script will:
- Check certificate validation status
- Create HTTPS listener (port 443) when certificate is validated
- Update the ECS service to use the load balancer
- Display your final application URLs

**Final URLs:**
- https://doodah.secondave.net
- http://doodah.secondave.net (redirects to HTTPS)

## Monitoring and Management

### Check Service Status

```powershell
.\scripts\check-status.ps1
```

This shows:
- ECS service status (running/pending/desired task counts)
- Current public IP if using direct task access
- ALB URL if load balancer is configured

### View Application Logs

Access CloudWatch logs at: `/ecs/doo-dah-aui`

### AWS Console Links

- **ECS Service**: https://us-east-2.console.aws.amazon.com/ecs/home?region=us-east-2#/clusters/doo-dah/services
- **CloudWatch Logs**: https://us-east-2.console.aws.amazon.com/cloudwatch/home?region=us-east-2#logStream:group=/ecs/doo-dah-aui
- **Load Balancer**: https://us-east-2.console.aws.amazon.com/ec2/home?region=us-east-2#LoadBalancers:

### Clean up Resources (to avoid charges)

```powershell
.\scripts\cleanup-aws.ps1
```

This script safely removes all billable resources:
- Scales ECS service to 0 tasks
- Deletes ECS service and cluster
- Removes Application Load Balancer and target groups
- Deletes security groups
- Removes ECR repository and images
- Deletes SSL certificate
- Preserves IAM roles and secrets for future deployments

## Configuration Details

### Application Configuration

- **Runtime**: Java 24 with Spring Boot
- **Port**: 8080
- **Health Check**: `/actuator/health`
- **Memory**: 512MB - 1024MB
- **CPU**: 256 CPU units (0.25 vCPU)

### Security Configuration

- **VPC**: Uses default VPC and public subnets
- **Security Groups**: 
  - ALB: ports 80, 443 from internet
  - ECS Tasks: port 8080 from ALB only
- **IAM**: Least privilege access to required AWS services
- **SSL**: TLS 1.2+ with AWS managed certificate

### File Structure

```
aws/
├── ecs-task-definition.json          # Template task definition
├── ecs-task-definition-ecr.json      # Generated with ECR image URI
├── ecs-task-definition-updated.json  # Generated with secret ARNs
└── ecs-service-definition.json       # ECS service configuration

scripts/
├── setup-aws-secrets.ps1      # Step 1: Configure secrets
├── push-to-ecr.ps1            # Step 2: Build and push image
├── deploy-to-ecs.ps1          # Step 3: Deploy to ECS
├── alb-setup.ps1              # Step 4: Create load balancer
├── complete-alb-setup.ps1     # Step 5: Complete HTTPS setup
├── check-status.ps1           # Monitor deployment
└── cleanup-aws.ps1            # Remove all resources

alb-config.env                 # Generated ALB configuration
```

## Troubleshooting

### Common Issues

1. **PowerShell Execution Policy**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **AWS CLI Profile Issues**
   - Ensure profile `partyk1d24` is configured: `aws configure --profile partyk1d24`
   - Check credentials: `aws sts get-caller-identity --profile partyk1d24`

3. **Docker Issues**
   - Ensure Docker Desktop is running
   - Check Docker login: `docker info`

4. **Certificate Validation Stuck**
   - Verify CNAME record was added to DNS
   - Check certificate status in AWS Console
   - DNS propagation can take up to 72 hours

5. **Service Not Starting**
   - Check CloudWatch logs: `/ecs/doo-dah-aui`
   - Verify task definition has correct image URI
   - Check security group allows port 8080

6. **502 Bad Gateway Errors**
   - Verify health check endpoint `/actuator/health` responds with 200
   - Check application is listening on port 8080
   - Review application logs for startup errors

7. **DNS Issues**
   - Ensure domain DNS points to ALB DNS name
   - Use `nslookup doodah.secondave.net` to verify resolution

### Debug Commands

```powershell
# Check ECS service details
aws ecs describe-services --cluster doo-dah --services doo-dah-aui --profile partyk1d24

# View recent logs
aws logs tail /ecs/doo-dah-aui --profile partyk1d24 --region us-east-2

# Check certificate status
aws acm describe-certificate --certificate-arn <cert-arn> --profile partyk1d24 --region us-east-2

# Test health endpoint directly
curl http://<task-public-ip>:8080/actuator/health
```

## Costs

This setup incurs AWS charges for:
- **ECS Fargate**: ~$0.04048/hour per task (0.25 vCPU, 512MB RAM)
- **Application Load Balancer**: ~$0.025/hour + $0.008 per LCU-hour
- **ECR Storage**: $0.10/GB/month
- **CloudWatch Logs**: $0.50/GB ingested, $0.03/GB stored
- **Data Transfer**: $0.09/GB outbound

**Estimated monthly cost for light usage**: $20-40/month

Use `.\scripts\cleanup-aws.ps1` when not needed to minimize costs.

## Test Results

All PowerShell scripts have been tested and work correctly:

✅ `.\scripts\setup-aws-secrets.ps1` - Successfully creates secrets and parameters
✅ `.\scripts\push-to-ecr.ps1` - Successfully builds and pushes Docker image to ECR
✅ `.\scripts\deploy-to-ecs.ps1` - Successfully deploys application to ECS
✅ `.\scripts\alb-setup.ps1` - Successfully creates load balancer and requests SSL certificate
✅ `.\scripts\complete-alb-setup.ps1` - Successfully completes HTTPS setup after certificate validation
✅ `.\scripts\check-status.ps1` - Successfully displays service status and URLs
✅ `.\scripts\cleanup-aws.ps1` - Successfully removes all billable resources

The deployment process is now fully automated and tested.
