# Doo-Dah-AUI

A modern full-stack web application built with Spring Boot (Java) backend and React (Vite) frontend, designed for cloud deployment on AWS ECS with complete automation.

## 🎯 Project Overview

Doo-Dah-AUI is a production-ready web application that combines:

- **Backend**: Spring Boot 3.x with Java 17+
- **Frontend**: React 18+ with Vite build tool
- **Database**: SQLite with JPA/Hibernate
- **AI Integration**: Ollama and Pinecone vector database
- **Authentication**: Auth0 integration
- **Cloud Deployment**: AWS ECS Fargate with Application Load Balancer
- **Containerization**: Docker with Gradle Jib plugin

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React SPA     │    │  Spring Boot    │    │   External      │
│   (Vite)        │◄──►│   Backend       │◄──►│   Services      │
│                 │    │                 │    │                 │
│ • Modern UI     │    │ • REST APIs     │    │ • Auth0         │
│ • Tailwind CSS  │    │ • Security      │    │ • Ollama        │
│ • React Router  │    │ • Data Layer    │    │ • Pinecone      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                ↓
                       ┌─────────────────┐
                       │   AWS Cloud     │
                       │                 │
                       │ • ECS Fargate   │
                       │ • Load Balancer │
                       │ • SSL/HTTPS     │
                       │ • Auto Scaling  │
                       └─────────────────┘
```

## 🚀 Quick Start

### Local Development

1. **Prerequisites**
   ```bash
   # Required tools
   - Java 17+
   - Node.js 18+
   - Gradle 8+
   - Git
   ```

2. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd doo-dah-aui
   
   # Install frontend dependencies
   cd ui && npm install && cd ..
   
   # Run full-stack locally
   ./gradlew bootRun
   ```

3. **Access Application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:8080/api
   - Health Check: http://localhost:8080/actuator/health

### AWS Cloud Deployment

For complete AWS deployment instructions, see **[AWS Deployment Guide](aws.md)**

**Quick Deploy:**
```powershell
# 1. Setup secrets and configuration
.\scripts\setup-aws-secrets.ps1

# 2. Build and push to ECR
.\scripts\push-to-ecr.ps1

# 3. Deploy to ECS
.\scripts\deploy-to-ecs.ps1

# 4. Setup load balancer with SSL
.\scripts\alb-setup.ps1

# 5. Complete setup after certificate validation
.\scripts\complete-alb-setup.ps1
```

## 📁 Project Structure

```
doo-dah-aui/
├── app/                          # Spring Boot application
│   ├── src/main/java/           # Java source code
│   ├── src/main/resources/      # Application configuration
│   └── build.gradle             # Backend build configuration
├── ui/                          # React frontend
│   ├── src/                     # React source code
│   ├── public/                  # Static assets
│   └── package.json             # Frontend dependencies
├── scripts/                     # Deployment automation
│   ├── setup-aws-secrets.ps1   # AWS secrets configuration
│   ├── push-to-ecr.ps1         # Docker build and push
│   ├── deploy-to-ecs.ps1       # ECS deployment
│   ├── alb-setup.ps1           # Load balancer setup
│   ├── complete-alb-setup.ps1  # SSL completion
│   └── cleanup-aws.ps1         # Resource cleanup
├── ecs-task-definition.json    # ECS task configuration
├── ecs-service-definition.json # ECS service configuration
├── aws.md                      # Detailed AWS deployment guide
└── README.md                   # This file
```

## 🛠️ Development

### Building

```bash
# Full build (frontend + backend)
./gradlew build

# Frontend only
cd ui && npm run build

# Backend only
./gradlew bootJar

# Docker image
./gradlew jib
```

### Testing

```bash
# Run all tests
./gradlew test

# Frontend tests
cd ui && npm test

# Backend tests only
./gradlew test --tests "doo.dah.*"
```

## 🔧 Configuration

### Environment Variables

The application supports multiple configuration methods:

**Local Development** (application.yaml):
```yaml
server:
  port: 8080
spring:
  profiles:
    active: local
auth0:
  client-id: ${AUTH0_CLIENT_ID}
```

**AWS Production** (AWS Secrets Manager + Parameter Store):
- Secrets: Auth0 credentials, database passwords, API keys
- Parameters: Non-sensitive configuration values
- Environment: Injected via ECS task definition

### Profiles

- `local` - Local development with minimal security
- `aws` - Production deployment with full security
- `test` - Test configuration with mocked services

## 🚢 Deployment

### AWS Infrastructure

The application deploys to AWS with:

- **ECS Fargate**: Serverless container hosting
- **Application Load Balancer**: HTTP/HTTPS traffic distribution
- **Route 53**: DNS management
- **Certificate Manager**: SSL/TLS certificates
- **Secrets Manager**: Secure credential storage
- **CloudWatch**: Logging and monitoring
- **ECR**: Container image registry

### Deployment Scripts

All deployment scripts are located in the `scripts/` directory:

| Script | Purpose |
|--------|---------|
| `setup-aws-secrets` | Configure AWS secrets and parameters |
| `push-to-ecr` | Build Docker image and push to ECR |
| `deploy-to-ecs` | Deploy application to ECS Fargate |
| `alb-setup` | Create load balancer and SSL certificate |
| `complete-alb-setup` | Finalize setup after SSL validation |
| `cleanup-aws` | Remove costly AWS resources |

### Cost Management

The cleanup script removes all resources that incur ongoing costs:
- ECS services and tasks (~$30-50/month)
- Application Load Balancer (~$20/month)
- SSL certificates (free with ACM)

Preserves low-cost resources:
- ECR repository (storage-based pricing)
- Secrets Manager (~$0.40/secret/month)
- Parameter Store (free tier)

## 🔒 Security

### Authentication & Authorization
- Auth0 integration for user management
- JWT token-based authentication
- Role-based access control

### Infrastructure Security
- VPC isolation with security groups
- HTTPS-only with SSL termination at load balancer
- Secrets stored in AWS Secrets Manager
- IAM roles with least-privilege access

### Data Protection
- Encrypted data transmission (HTTPS)
- Secure credential management
- Regular dependency updates

## 📊 Monitoring

### Application Monitoring
- Spring Boot Actuator health checks
- Custom application metrics
- Structured logging with JSON format

### Infrastructure Monitoring
- CloudWatch metrics and alarms
- ECS service monitoring
- Load balancer health checks
- Auto-scaling based on CPU/memory usage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📚 Documentation

- **[AWS Deployment Guide](aws.md)** - Complete cloud deployment instructions
- **[API Documentation](app/src/main/java/doo/dah/controllers/)** - REST API endpoints
- **[Frontend Components](ui/src/components/)** - React component documentation

## 🆘 Support & Troubleshooting

### Common Issues

1. **Build Failures**
   - Ensure Java 17+ and Node.js 18+ are installed
   - Clear Gradle cache: `./gradlew clean`
   - Reinstall node modules: `cd ui && rm -rf node_modules && npm install`

2. **AWS Deployment Issues**
   - Verify AWS CLI configuration and credentials
   - Check AWS service limits and quotas
   - Review CloudWatch logs for application errors

3. **SSL Certificate Issues**
   - Ensure DNS validation records are correctly added
   - Wait for DNS propagation (up to 48 hours)
   - Verify domain ownership

### Getting Help

- Check existing GitHub Issues
- Create a new issue with detailed error information
- Include logs and environment details

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.