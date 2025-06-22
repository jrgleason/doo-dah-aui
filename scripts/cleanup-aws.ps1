# PowerShell script to clean up AWS resources that cost money
$AWS_PROFILE = "partyk1d24"
$REGION = "us-east-2"

Write-Host "Cleaning up AWS resources that incur costs..." -ForegroundColor Yellow
Write-Host "AWS Profile: $AWS_PROFILE" -ForegroundColor Cyan
Write-Host "Region: $REGION" -ForegroundColor Cyan
Write-Host ""

# Load ALB configuration if it exists
$ALB_ARN = $null
$TARGET_GROUP_ARN = $null
$ALB_SG_ID = $null
$CERT_ARN = $null

if (Test-Path "alb-config.env") {
    Get-Content "alb-config.env" | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            Set-Variable -Name $matches[1] -Value $matches[2]
        }
    }
    Write-Host "Loaded ALB configuration from alb-config.env" -ForegroundColor Green
} else {
    Write-Host "No alb-config.env found, will try to discover resources..." -ForegroundColor Yellow
}

# Function to safely run AWS commands
function Invoke-AWSCommand {
    param([string]$Description, [string]$Command, [switch]$SuppressOutput)
    
    Write-Host "Deleting $Description..." -ForegroundColor Yellow
    try {
        if ($SuppressOutput) {
            $null = Invoke-Expression "$Command 2>`$null"
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Successfully deleted $Description" -ForegroundColor Green
            } else {
                Write-Host "Failed to delete $Description (may not exist)" -ForegroundColor Yellow
            }
        } else {
            Invoke-Expression $Command
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Successfully deleted $Description" -ForegroundColor Green
            } else {
                Write-Host "Failed to delete $Description (may not exist)" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "Error deleting $Description : $_" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Function to try deleting a security group with retries
function Remove-SecurityGroupWithRetry {
    param(
        [string]$GroupId,
        [string]$Description,
        [int]$MaxRetries = 6,
        [int]$RetryInterval = 10
    )
    
    if (-not $GroupId -or $GroupId -eq "None" -or $GroupId -eq "") {
        Write-Host "No $Description to delete (empty GroupId)" -ForegroundColor Yellow
        return
    }
    
    Write-Host "Attempting to delete $Description (ID: $GroupId)..." -ForegroundColor Yellow
    
    for ($retry = 1; $retry -le $MaxRetries; $retry++) {
        try {
            $result = aws ec2 delete-security-group --group-id $GroupId --region $REGION --profile $AWS_PROFILE 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Successfully deleted $Description" -ForegroundColor Green
                return
            } else {
                $errorMessage = $result | Out-String
                if ($errorMessage -match "DependencyViolation") {
                    Write-Host "Retry $retry of $MaxRetries : $Description still has dependencies, waiting..." -ForegroundColor Yellow
                    Start-Sleep -Seconds $RetryInterval
                } elseif ($errorMessage -match "InvalidGroup") {
                    Write-Host "$Description does not exist or was already deleted" -ForegroundColor Yellow
                    return
                } else {
                    Write-Host "Failed to delete $Description : $errorMessage" -ForegroundColor Yellow
                    return
                }
            }
        } catch {
            Write-Host "Error deleting $Description : $($_.Exception.Message)" -ForegroundColor Yellow
            return
        }
    }
    
    Write-Host "Warning: Could not delete $Description after $MaxRetries attempts" -ForegroundColor Yellow
}

# 1. Scale down ECS service to 0 (stops tasks)
Write-Host "Scaling down ECS service..." -ForegroundColor Yellow
Invoke-AWSCommand "ECS service scale-down" "aws ecs update-service --cluster doo-dah --service doo-dah-aui --desired-count 0 --region $REGION --profile $AWS_PROFILE --output text" -SuppressOutput

# Wait for tasks to stop and force stop any remaining tasks
Write-Host "Waiting for all tasks to stop..." -ForegroundColor Yellow
$maxWaitTime = 180  # Wait up to 3 minutes for graceful shutdown
$waitInterval = 5   # Check every 5 seconds
$totalWaited = 0

do {
    Start-Sleep -Seconds $waitInterval
    $totalWaited += $waitInterval
    
    # Check service status first to see if it exists and is scaling down
    $serviceStatus = aws ecs describe-services --cluster doo-dah --services doo-dah-aui --region $REGION --profile $AWS_PROFILE --query "services[0].status" --output text 2>$null
    Write-Host "DEBUG: Service status: '$serviceStatus'" -ForegroundColor Magenta
    
    if ($serviceStatus -eq "None" -or -not $serviceStatus) {
        Write-Host "Service no longer exists, checking for any remaining tasks..." -ForegroundColor Yellow
        # Use JSON output for better parsing
        $allTasksJson = aws ecs list-tasks --cluster doo-dah --region $REGION --profile $AWS_PROFILE --query "taskArns" --output json 2>$null
        Write-Host "DEBUG: All tasks in cluster JSON: '$allTasksJson'" -ForegroundColor Magenta
        
        try {
            $taskArray = $allTasksJson | ConvertFrom-Json
            $allTasks = $taskArray
            Write-Host "DEBUG: Parsed task array type: $($allTasks.GetType().Name)" -ForegroundColor Magenta
            Write-Host "DEBUG: Task array count: $($allTasks.Count)" -ForegroundColor Magenta
            if ($allTasks.Count -gt 0) {
                Write-Host "DEBUG: First task ARN: '$($allTasks[0])'" -ForegroundColor Magenta
            }
        } catch {
            Write-Host "DEBUG: Failed to parse JSON: $($_.Exception.Message)" -ForegroundColor Red
            $allTasks = @()
        }
    } else {
        # Get ALL tasks for the specific service
        $allTasksJson = aws ecs list-tasks --cluster doo-dah --service-name doo-dah-aui --region $REGION --profile $AWS_PROFILE --query "taskArns" --output json 2>$null
        Write-Host "DEBUG: Service-specific tasks JSON: '$allTasksJson'" -ForegroundColor Magenta
        
        try {
            $taskArray = $allTasksJson | ConvertFrom-Json
            $allTasks = $taskArray
            Write-Host "DEBUG: Parsed task array type: $($allTasks.GetType().Name)" -ForegroundColor Magenta
            Write-Host "DEBUG: Task array count: $($allTasks.Count)" -ForegroundColor Magenta
            if ($allTasks.Count -gt 0) {
                Write-Host "DEBUG: First task ARN: '$($allTasks[0])'" -ForegroundColor Magenta
                Write-Host "DEBUG: First task ARN length: $($allTasks[0].Length)" -ForegroundColor Magenta
            }
        } catch {
            Write-Host "DEBUG: Failed to parse JSON: $($_.Exception.Message)" -ForegroundColor Red
            $allTasks = @()
        }
    }
    
    if ($allTasks -and $allTasks.Count -gt 0) {
        # Work directly with the task array - avoid Where-Object which can cause string to char array conversion
        $taskList = @()
        foreach ($task in $allTasks) {
            if ($task -and $task -ne "" -and $task -ne "None") {
                $taskList += $task
            }
        }
        Write-Host "DEBUG: Found $($taskList.Count) total tasks after filtering" -ForegroundColor Magenta
        
        # Show each task ARN individually
        for ($i = 0; $i -lt $taskList.Count; $i++) {
            Write-Host "DEBUG: Task[$i]: '$($taskList[$i])' (Length: $($taskList[$i].Length))" -ForegroundColor Magenta
        }
        
        # Get detailed status of tasks and filter out STOPPED tasks
        if ($taskList.Count -gt 0) {
            Write-Host "DEBUG: About to call describe-tasks with these ARNs:" -ForegroundColor Magenta
            $taskList | ForEach-Object { Write-Host "  - '$_'" -ForegroundColor White }
            
            # Try to get task details with better error handling
            try {
                # Use a simpler approach - pass one task at a time if multiple
                if ($taskList.Count -eq 1) {
                    $singleTaskArn = $taskList[0]
                    Write-Host "DEBUG: Calling describe-tasks with single ARN: '$singleTaskArn'" -ForegroundColor Magenta
                    $taskDetailsResult = aws ecs describe-tasks --cluster doo-dah --tasks $singleTaskArn --region $REGION --profile $AWS_PROFILE 2>&1
                } else {
                    Write-Host "DEBUG: Calling describe-tasks with multiple ARNs" -ForegroundColor Magenta
                    $taskDetailsResult = aws ecs describe-tasks --cluster doo-dah --tasks ($taskList -join " ") --region $REGION --profile $AWS_PROFILE 2>&1
                }
                
                if ($LASTEXITCODE -eq 0) {
                    $taskDetailsJson = $taskDetailsResult | ConvertFrom-Json
                    Write-Host "DEBUG: Successfully got details for $($taskDetailsJson.tasks.Count) tasks" -ForegroundColor Magenta
                    
                    # Filter out STOPPED tasks
                    $activeTasks = $taskDetailsJson.tasks | Where-Object { $_.lastStatus -ne "STOPPED" }
                    
                    if ($activeTasks) {
                        $taskCount = $activeTasks.Count
                        
                        Write-Host "Active task statuses:" -ForegroundColor Cyan
                        foreach ($task in $activeTasks) {
                            $taskId = $task.taskArn.Split('/')[-1]
                            Write-Host "  Task $taskId : $($task.lastStatus)" -ForegroundColor White
                        }
                    } else {
                        $taskCount = 0
                        Write-Host "DEBUG: All tasks are STOPPED" -ForegroundColor Magenta
                    }
                } else {
                    Write-Host "DEBUG: Failed to get task details: $taskDetailsResult" -ForegroundColor Red
                    # If we can't get details, assume tasks are still active for safety
                    $taskCount = $taskList.Count
                    $activeTasks = $taskList | ForEach-Object { @{ taskArn = $_ } }
                }
            } catch {
                Write-Host "DEBUG: Exception getting task details: $($_.Exception.Message)" -ForegroundColor Red
                # If we can't get details, assume tasks are still active for safety
                $taskCount = $taskList.Count
                $activeTasks = $taskList | ForEach-Object { @{ taskArn = $_ } }
            }
        } else {
            $taskCount = 0
        }
        
        if ($taskCount -gt 0) {
            Write-Host "Still have $taskCount active task(s), waiting... ($totalWaited seconds elapsed)" -ForegroundColor Yellow
            
            # If we've waited too long, force stop the tasks
            if ($totalWaited -ge $maxWaitTime) {
                Write-Host "Timeout reached. Force stopping remaining active tasks..." -ForegroundColor Red
                foreach ($task in $activeTasks) {
                    $taskArn = if ($task.taskArn) { $task.taskArn } else { $task }
                    $taskId = $taskArn.Split('/')[-1]
                    Write-Host "Force stopping task: $taskId" -ForegroundColor Yellow
                    aws ecs stop-task --cluster doo-dah --task $taskId --region $REGION --profile $AWS_PROFILE --output text 2>$null
                }
                # Wait a bit more for force stop to complete
                Start-Sleep -Seconds 20
                break
            }
        } else {
            Write-Host "All tasks have stopped" -ForegroundColor Green
            break
        }
    } else {
        $taskCount = 0
        Write-Host "No tasks found - all tasks have stopped" -ForegroundColor Green
        break
    }
} while ($taskCount -gt 0 -and $totalWaited -lt $maxWaitTime)

# 2. Delete ECS service
Invoke-AWSCommand "ECS service" "aws ecs delete-service --cluster doo-dah --service doo-dah-aui --region $REGION --profile $AWS_PROFILE --output text" -SuppressOutput

# 2a. Check service status and proceed when ready (INACTIVE is normal and ready for cleanup)
Write-Host "Checking service status before proceeding..." -ForegroundColor Yellow
$serviceExistsResult = aws ecs describe-services --cluster doo-dah --services doo-dah-aui --region $REGION --profile $AWS_PROFILE --query "services[0]" --output json 2>$null

try {
    $serviceInfo = $serviceExistsResult | ConvertFrom-Json
    if ($serviceInfo -and $serviceInfo.serviceName) {
        $serviceStatus = $serviceInfo.status
        $runningCount = $serviceInfo.runningCount
        $pendingCount = $serviceInfo.pendingCount
        
        Write-Host "Service status: $serviceStatus, Running: $runningCount, Pending: $pendingCount" -ForegroundColor Cyan
        
        # INACTIVE services with 0 running/pending tasks are ready for cleanup
        # ECS services don't disappear completely - they just become INACTIVE
        if ($serviceStatus -eq "INACTIVE" -or $serviceStatus -eq "DRAINING" -or ($runningCount -eq 0 -and $pendingCount -eq 0)) {
            Write-Host "Service is INACTIVE/stopped and ready for cleanup - proceeding immediately..." -ForegroundColor Green
        } else {
            Write-Host "Service still has active tasks. Waiting 30 seconds for service to stabilize..." -ForegroundColor Yellow
            Start-Sleep -Seconds 30
        }
    } else {
        Write-Host "Service no longer exists - proceeding with cleanup..." -ForegroundColor Green
    }
} catch {
    Write-Host "Service check failed or service doesn't exist - proceeding with cleanup..." -ForegroundColor Green
}

# 2b. Force stop any remaining tasks in the cluster
Write-Host "Checking for any remaining tasks in cluster..." -ForegroundColor Yellow
$allTasksJson = aws ecs list-tasks --cluster doo-dah --region $REGION --profile $AWS_PROFILE --query "taskArns" --output json 2>$null

if ($allTasksJson -and $allTasksJson -ne "[]" -and $allTasksJson.Trim() -ne "") {
    try {
        $taskArray = $allTasksJson | ConvertFrom-Json
        if ($taskArray -and $taskArray.Count -gt 0) {
            Write-Host "Force stopping all remaining tasks in cluster..." -ForegroundColor Red
            
            foreach ($taskArn in $taskArray) {
                # Extract task ID from ARN (everything after the last /)
                $taskId = $taskArn.Split('/')[-1]
                Write-Host "Stopping task: $taskId" -ForegroundColor Yellow
                aws ecs stop-task --cluster doo-dah --task $taskId --reason "Cleanup script force stop" --region $REGION --profile $AWS_PROFILE --output text 2>$null
            }
            
            # Wait for all tasks to actually terminate
            Write-Host "Waiting for all tasks to terminate..." -ForegroundColor Yellow
            $maxTaskWait = 60
            $taskWaited = 0
            do {
                Start-Sleep -Seconds 10
                $taskWaited += 10
                $remainingTasksJson = aws ecs list-tasks --cluster doo-dah --region $REGION --profile $AWS_PROFILE --query "taskArns" --output json 2>$null
                
                try {
                    $remainingTaskArray = $remainingTasksJson | ConvertFrom-Json
                    if (-not $remainingTaskArray -or $remainingTaskArray.Count -eq 0) {
                        Write-Host "All tasks have terminated" -ForegroundColor Green
                        break
                    } else {
                        Write-Host "Still waiting for $($remainingTaskArray.Count) task(s) to terminate... ($taskWaited seconds elapsed)" -ForegroundColor Yellow
                    }
                } catch {
                    Write-Host "All tasks have terminated" -ForegroundColor Green
                    break
                }
            } while ($taskWaited -lt $maxTaskWait)
            
            if ($taskWaited -ge $maxTaskWait) {
                Write-Host "Warning: Some tasks may still be terminating" -ForegroundColor Yellow
            }
        } else {
            Write-Host "No tasks found in cluster" -ForegroundColor Green
        }
    } catch {
        Write-Host "Error parsing task list: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Raw task list: $allTasksJson" -ForegroundColor Magenta
    }
} else {
    Write-Host "No tasks found in cluster" -ForegroundColor Green
}

# 3. Delete ECS cluster
Invoke-AWSCommand "ECS cluster" "aws ecs delete-cluster --cluster doo-dah --region $REGION --profile $AWS_PROFILE --output text" -SuppressOutput

# 4. Delete Application Load Balancer
if ($ALB_ARN) {
    Invoke-AWSCommand "Application Load Balancer" "aws elbv2 delete-load-balancer --load-balancer-arn '$ALB_ARN' --region $REGION --profile $AWS_PROFILE --output text" -SuppressOutput
    $deletedALB = $true
} else {
    Write-Host "Looking for ALB by name..." -ForegroundColor Yellow
    $DISCOVERED_ALB_ARN = aws elbv2 describe-load-balancers --names doo-dah-aui-alb --region $REGION --profile $AWS_PROFILE --query "LoadBalancers[0].LoadBalancerArn" --output text 2>$null
    if ($DISCOVERED_ALB_ARN -and $DISCOVERED_ALB_ARN -ne "None") {
        Invoke-AWSCommand "discovered ALB" "aws elbv2 delete-load-balancer --load-balancer-arn '$DISCOVERED_ALB_ARN' --region $REGION --profile $AWS_PROFILE --output text" -SuppressOutput
        $deletedALB = $true
        $ALB_ARN = $DISCOVERED_ALB_ARN
    } else {
        $deletedALB = $false
    }
}

# 4a. Wait for ALB deletion to complete by polling
if ($deletedALB) {
    Write-Host "Waiting for ALB deletion to complete..." -ForegroundColor Yellow
    $maxALBWait = 120  # ALBs can take longer to delete
    $albWaited = 0
    do {
        Start-Sleep -Seconds 10
        $albWaited += 10
        
        $albStatus = aws elbv2 describe-load-balancers --load-balancer-arns $ALB_ARN --region $REGION --profile $AWS_PROFILE --query "LoadBalancers[0].State.Code" --output text 2>$null
        
        if (-not $albStatus -or $albStatus -eq "None" -or $albStatus -eq "") {
            Write-Host "ALB deletion completed" -ForegroundColor Green
            break
        } elseif ($albStatus -eq "active") {
            Write-Host "ALB is still active, continuing to wait... ($albWaited seconds elapsed)" -ForegroundColor Yellow
        } else {
            Write-Host "ALB status: $albStatus, waiting... ($albWaited seconds elapsed)" -ForegroundColor Yellow
        }
    } while ($albWaited -lt $maxALBWait)
    
    if ($albWaited -ge $maxALBWait) {
        Write-Host "Warning: ALB deletion may still be in progress" -ForegroundColor Yellow
    }
}

# 5. Delete Target Group
if ($TARGET_GROUP_ARN) {
    Invoke-AWSCommand "Target Group" "aws elbv2 delete-target-group --target-group-arn '$TARGET_GROUP_ARN' --region $REGION --profile $AWS_PROFILE --output text" -SuppressOutput
} else {
    Write-Host "Looking for target group by name..." -ForegroundColor Yellow
    $DISCOVERED_TG_ARN = aws elbv2 describe-target-groups --names doo-dah-aui-tg --region $REGION --profile $AWS_PROFILE --query "TargetGroups[0].TargetGroupArn" --output text 2>$null
    if ($DISCOVERED_TG_ARN -and $DISCOVERED_TG_ARN -ne "None") {
        Invoke-AWSCommand "discovered Target Group" "aws elbv2 delete-target-group --target-group-arn '$DISCOVERED_TG_ARN' --region $REGION --profile $AWS_PROFILE --output text" -SuppressOutput
    }
}

# 6. Delete Security Groups with intelligent retry
Write-Host "Deleting security groups..." -ForegroundColor Yellow

# Delete ALB Security Group
if ($ALB_SG_ID) {
    Remove-SecurityGroupWithRetry -GroupId $ALB_SG_ID -Description "ALB Security Group"
}

# Try to find and delete ECS security group
$ECS_SG_ID = aws ec2 describe-security-groups --filters "Name=group-name,Values=doo-dah-aui-sg" --region $REGION --profile $AWS_PROFILE --query "SecurityGroups[0].GroupId" --output text 2>$null
Remove-SecurityGroupWithRetry -GroupId $ECS_SG_ID -Description "ECS Security Group"

# Try to find and delete any remaining ALB security groups
$ALB_SG_DISCOVERED = aws ec2 describe-security-groups --filters "Name=group-name,Values=doo-dah-aui-alb-sg" --region $REGION --profile $AWS_PROFILE --query "SecurityGroups[0].GroupId" --output text 2>$null
Remove-SecurityGroupWithRetry -GroupId $ALB_SG_DISCOVERED -Description "discovered ALB Security Group"

# 7. Delete SSL Certificate
if ($CERT_ARN) {
    Invoke-AWSCommand "SSL Certificate" "aws acm delete-certificate --certificate-arn '$CERT_ARN' --region $REGION --profile $AWS_PROFILE --output text" -SuppressOutput
} else {
    # Try to find and delete certificate for doodah.secondave.net
    $DISCOVERED_CERT_ARN = aws acm list-certificates --region $REGION --profile $AWS_PROFILE --query "CertificateSummaryList[?DomainName=='doodah.secondave.net'].CertificateArn" --output text 2>$null
    if ($DISCOVERED_CERT_ARN -and $DISCOVERED_CERT_ARN -ne "None") {
        Invoke-AWSCommand "discovered SSL Certificate" "aws acm delete-certificate --certificate-arn '$DISCOVERED_CERT_ARN' --region $REGION --profile $AWS_PROFILE --output text" -SuppressOutput
    }
}

# 8. Optional: Delete ECR repository (commented out by default to preserve images)
Write-Host "ECR Repository Cleanup (commented out by default)" -ForegroundColor Red
Write-Host "   Uncomment the line below if you want to delete the ECR repository:" -ForegroundColor Yellow
Write-Host "   # aws ecr delete-repository --repository-name doo-dah-aui --force --region $REGION --profile $AWS_PROFILE" -ForegroundColor Cyan
Write-Host ""

# 9. Optional: Delete Secrets and Parameters (commented out by default to preserve config)
Write-Host "Secrets and Parameters Cleanup (commented out by default)" -ForegroundColor Red
Write-Host "   Uncomment these lines if you want to delete secrets and parameters:" -ForegroundColor Yellow
Write-Host "   # aws secretsmanager delete-secret --secret-id doo-dah-aui/auth0-client-id --force-delete-without-recovery --region $REGION --profile $AWS_PROFILE" -ForegroundColor Cyan
Write-Host "   # aws secretsmanager delete-secret --secret-id doo-dah-aui/sqlite-password --force-delete-without-recovery --region $REGION --profile $AWS_PROFILE" -ForegroundColor Cyan
Write-Host "   # aws secretsmanager delete-secret --secret-id doo-dah-aui/pinecone-api-key --force-delete-without-recovery --region $REGION --profile $AWS_PROFILE" -ForegroundColor Cyan
Write-Host "   # aws ssm delete-parameter --name /doo-dah-aui/ollama-base-url --region $REGION --profile $AWS_PROFILE" -ForegroundColor Cyan
Write-Host "   # aws ssm delete-parameter --name /doo-dah-aui/ollama-model --region $REGION --profile $AWS_PROFILE" -ForegroundColor Cyan
Write-Host "   # aws ssm delete-parameter --name /doo-dah-aui/logging-level --region $REGION --profile $AWS_PROFILE" -ForegroundColor Cyan
Write-Host ""

# 10. Clean up temporary files
Write-Host "Cleaning up temporary files..." -ForegroundColor Yellow
Remove-Item -Path "alb-config.env" -ErrorAction SilentlyContinue
Remove-Item -Path "aws/ecs-task-definition-updated.json" -ErrorAction SilentlyContinue
Remove-Item -Path "aws/ecs-task-definition-ecr-updated.json" -ErrorAction SilentlyContinue
Remove-Item -Path "aws/ecs-task-definition-external.json" -ErrorAction SilentlyContinue
Remove-Item -Path "trust-policy.json" -ErrorAction SilentlyContinue
Write-Host "Temporary files cleaned" -ForegroundColor Green

Write-Host ""
Write-Host "AWS cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Resources that have been deleted (no longer costing money):" -ForegroundColor Yellow
Write-Host "   - ECS Fargate tasks and service" -ForegroundColor Green
Write-Host "   - Application Load Balancer" -ForegroundColor Green
Write-Host "   - Target Groups" -ForegroundColor Green
Write-Host "   - Security Groups" -ForegroundColor Green
Write-Host "   - SSL Certificate" -ForegroundColor Green
Write-Host ""
Write-Host "Resources preserved (no ongoing cost):" -ForegroundColor Cyan
Write-Host "   - ECR Repository (only storage cost)" -ForegroundColor White
Write-Host "   - Secrets Manager secrets (small monthly cost)" -ForegroundColor White
Write-Host "   - SSM Parameters (no cost)" -ForegroundColor White
Write-Host ""
Write-Host "To redeploy, run the deployment scripts again:" -ForegroundColor Yellow
Write-Host "   1. .\scripts\setup-aws-secrets.ps1 (if you deleted secrets)" -ForegroundColor White
Write-Host "   2. .\scripts\push-to-ecr.ps1" -ForegroundColor White
Write-Host "   3. .\scripts\deploy-to-ecs.ps1" -ForegroundColor White
Write-Host "   4. .\scripts\alb-setup.ps1" -ForegroundColor White
Write-Host "   5. .\scripts\complete-alb-setup.ps1" -ForegroundColor White