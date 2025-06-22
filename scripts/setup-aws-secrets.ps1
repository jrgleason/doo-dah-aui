# PowerShell script to set up AWS Secrets Manager and Systems Manager Parameter Store for doo-dah-aui
# Sensitive data goes to Secrets Manager, non-sensitive config goes to Parameter Store
$AWS_PROFILE = "partyk1d24"
$REGION = "us-east-2"

Write-Host "Setting up AWS Secrets Manager and Parameter Store..." -ForegroundColor Yellow
Write-Host "AWS Profile: $AWS_PROFILE" -ForegroundColor Cyan
Write-Host "Region: $REGION" -ForegroundColor Cyan
Write-Host ""

# Function to create or update a secret in Secrets Manager
function Set-SecretsManagerSecret {
    param(
        [string]$Name,
        [string]$Value,
        [string]$Description
    )
    
    Write-Host "Setting secret: $Name" -ForegroundColor Green
      try {
        # Check if secret exists
        $secretExists = $false
        try {
            $null = aws secretsmanager describe-secret --secret-id $Name --region $REGION --profile $AWS_PROFILE 2>$null
            if ($LASTEXITCODE -eq 0) {
                $secretExists = $true
            }
        } catch {
            # Secret doesn't exist
        }
        
        if ($secretExists) {
            # Update existing secret
            aws secretsmanager update-secret `
                --secret-id $Name `
                --secret-string $Value `
                --description $Description `
                --region $REGION `
                --profile $AWS_PROFILE | Out-Null
        } else {
            # Create new secret
            aws secretsmanager create-secret `
                --name $Name `
                --secret-string $Value `
                --description $Description `
                --region $REGION `
                --profile $AWS_PROFILE | Out-Null
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully set secret $Name" -ForegroundColor Green
        } else {
            Write-Host "Failed to set secret $Name" -ForegroundColor Red
        }
    } catch {
        Write-Host "Error setting secret $Name : $_" -ForegroundColor Red
    }
    Write-Host ""
}

# Function to create or update a parameter in Parameter Store
function Set-SSMParameter {
    param(
        [string]$Name,
        [string]$Value,
        [string]$Type = "String",
        [string]$Description
    )
    
    Write-Host "Setting parameter: $Name" -ForegroundColor Green
    
    try {
        aws ssm put-parameter `
            --name $Name `
            --value $Value `
            --type $Type `
            --description $Description `
            --overwrite `
            --region $REGION `
            --profile $AWS_PROFILE | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully set parameter $Name" -ForegroundColor Green
        } else {
            Write-Host "Failed to set parameter $Name" -ForegroundColor Red
        }
    } catch {
        Write-Host "Error setting parameter $Name : $_" -ForegroundColor Red
    }
    Write-Host ""
}

# Sensitive configuration - Store in AWS Secrets Manager
Write-Host "Setting up sensitive configuration in Secrets Manager..." -ForegroundColor Yellow

# AUTH0_CLIENT_ID - Store in Secrets Manager
$AUTH0_CLIENT_ID = $env:AUTH0_CLIENT_ID
if (![string]::IsNullOrWhiteSpace($AUTH0_CLIENT_ID)) {
    Write-Host "Using existing AUTH0_CLIENT_ID: $($AUTH0_CLIENT_ID.Substring(0, [Math]::Min(20, $AUTH0_CLIENT_ID.Length)))..." -ForegroundColor White
} else {
    $AUTH0_CLIENT_ID = Read-Host "Enter Auth0 Client ID"
}
if (![string]::IsNullOrWhiteSpace($AUTH0_CLIENT_ID)) {
    Set-SecretsManagerSecret -Name "doo-dah-aui/auth0-client-id" -Value $AUTH0_CLIENT_ID -Description "Auth0 client ID for doo-dah-aui application"
}

# SQLITE_PASSWORD - Store in Secrets Manager
$SQLITE_PASSWORD = $env:SQLITE_PASSWORD
if (![string]::IsNullOrWhiteSpace($SQLITE_PASSWORD)) {
    Write-Host "Using existing SQLITE_PASSWORD: [HIDDEN]" -ForegroundColor White
} else {
    $SQLITE_PASSWORD = Read-Host "Enter SQLite Password (can be empty for no password)" -AsSecureString
    $SQLITE_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SQLITE_PASSWORD))
}
if (![string]::IsNullOrWhiteSpace($SQLITE_PASSWORD)) {
    Set-SecretsManagerSecret -Name "doo-dah-aui/sqlite-password" -Value $SQLITE_PASSWORD -Description "SQLite database password for doo-dah-aui application"
} else {
    # Set empty password if none provided
    Set-SecretsManagerSecret -Name "doo-dah-aui/sqlite-password" -Value "" -Description "SQLite database password for doo-dah-aui application"
}

# PINECONE_API_KEY - Store in Secrets Manager
$PINECONE_API_KEY = $env:PINECONE_API_KEY
if (![string]::IsNullOrWhiteSpace($PINECONE_API_KEY)) {
    Write-Host "Using existing PINECONE_API_KEY: $($PINECONE_API_KEY.Substring(0, [Math]::Min(10, $PINECONE_API_KEY.Length)))..." -ForegroundColor White
} else {
    $PINECONE_API_KEY = Read-Host "Enter Pinecone API Key"
}
if (![string]::IsNullOrWhiteSpace($PINECONE_API_KEY)) {
    Set-SecretsManagerSecret -Name "doo-dah-aui/pinecone-api-key" -Value $PINECONE_API_KEY -Description "Pinecone API key for doo-dah-aui application"
}

Write-Host ""
Write-Host "Setting up non-sensitive configuration in Parameter Store..." -ForegroundColor Yellow

# Non-sensitive configuration - Store in Parameter Store
Set-SSMParameter -Name "/doo-dah-aui/ollama-base-url" -Value "http://localhost:11434" -Type "String" -Description "Ollama base URL for doo-dah-aui application"
Set-SSMParameter -Name "/doo-dah-aui/ollama-model" -Value "artifish/llama3.2-uncensored:latest" -Type "String" -Description "Ollama model for doo-dah-aui application"
Set-SSMParameter -Name "/doo-dah-aui/logging-level" -Value "INFO" -Type "String" -Description "Logging level for doo-dah-aui application"

Write-Host ""
Write-Host "AWS Secrets Manager and Parameter Store setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "Secrets Manager (sensitive):" -ForegroundColor Cyan
Write-Host "  - doo-dah-aui/auth0-client-id" -ForegroundColor White
Write-Host "  - doo-dah-aui/sqlite-password" -ForegroundColor White
Write-Host "  - doo-dah-aui/pinecone-api-key" -ForegroundColor White
Write-Host ""
Write-Host "Parameter Store (non-sensitive):" -ForegroundColor Cyan
Write-Host "  - /doo-dah-aui/ollama-base-url" -ForegroundColor White
Write-Host "  - /doo-dah-aui/ollama-model" -ForegroundColor White
Write-Host "  - /doo-dah-aui/logging-level" -ForegroundColor White
Write-Host ""
Write-Host "Remember to update your ECS task definition to reference these secrets and parameters!" -ForegroundColor Yellow