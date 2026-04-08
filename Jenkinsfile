pipeline {
    agent any

    environment {
        PATH              = "/usr/local/bin:${env.PATH}"
        AWS_REGION        = 'us-east-1'
        AWS_ACCOUNT_ID    = '505017489008'
        ECR_REGISTRY      = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        IMAGE_BACKEND     = "${ECR_REGISTRY}/placement-portal-backend"
        IMAGE_FRONTEND    = "${ECR_REGISTRY}/placement-portal-frontend"
        SONAR_HOST_URL    = 'http://32.195.141.188:9000'
        SONAR_PROJECT_KEY = 'placement-portal'
        DOCKER_BUILDKIT   = '1'
    }

    stages {

        // ── Stage 1: Checkout ──────────────────────────────────────────────
        stage('Checkout & Setup') {
            steps {
                git branch: 'main', url: 'https://github.com/Bhaveshkhandelwal1/Placement-Portal-DEVOPS.git'
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()
                    echo "✅ Checked out commit: ${env.GIT_COMMIT_SHORT}"
                }
            }
        }





        // ── Stage 4: ECR Login ─────────────────────────────────────────────
        stage('ECR Login') {
            steps {
                echo "🔐 Logging in to AWS ECR..."
                sh """
                    aws ecr get-login-password --region ${AWS_REGION} | \
                    docker login --username AWS --password-stdin ${ECR_REGISTRY}
                """
                echo "✅ Logged in to ECR: ${ECR_REGISTRY}"
            }
        }

        // ── Stage 5: Docker Build & Push to ECR (Sequential) ────────────────
        stage('Docker Build Backend Image') {
            steps {
                echo "🐳 Building & pushing backend image to ECR..."
                sh """
                    docker build \
                        -t ${IMAGE_BACKEND}:${env.GIT_COMMIT_SHORT} \
                        -t ${IMAGE_BACKEND}:latest \
                        ./backend

                    docker push ${IMAGE_BACKEND}:${env.GIT_COMMIT_SHORT}
                    docker push ${IMAGE_BACKEND}:latest
                """
                echo "✅ Backend image pushed: ${IMAGE_BACKEND}:${env.GIT_COMMIT_SHORT}"
            }
        }

        stage('Docker Build Frontend Image') {
            steps {
                echo "🐳 Building & pushing frontend image to ECR..."
                sh """
                    docker build \
                        -t ${IMAGE_FRONTEND}:${env.GIT_COMMIT_SHORT} \
                        -t ${IMAGE_FRONTEND}:latest \
                        ./frontend

                    docker push ${IMAGE_FRONTEND}:${env.GIT_COMMIT_SHORT}
                    docker push ${IMAGE_FRONTEND}:latest
                """
                echo "✅ Frontend image pushed: ${IMAGE_FRONTEND}:${env.GIT_COMMIT_SHORT}"
            }
        }

        // ── Stage 6: Deploy to AWS EC2 via SSM ───────────────────────────
        stage('Deploy to AWS EC2') {
            steps {
                echo "🚀 Deploying to AWS EC2 instances via SSM..."
                script {
                    // Lookup instance IDs (SSM uses instance ID, not IP)
                    def backendInstanceId = sh(
                        script: """
                            aws ec2 describe-instances \
                              --filters "Name=tag:Name,Values=placement-portal-backend" \
                                        "Name=instance-state-name,Values=running" \
                              --query 'Reservations[0].Instances[0].InstanceId' \
                              --output text --region ${AWS_REGION}
                        """,
                        returnStdout: true
                    ).trim()

                    def frontendInstanceId = sh(
                        script: """
                            aws ec2 describe-instances \
                              --filters "Name=tag:Name,Values=placement-portal-frontend" \
                                        "Name=instance-state-name,Values=running" \
                              --query 'Reservations[0].Instances[0].InstanceId' \
                              --output text --region ${AWS_REGION}
                        """,
                        returnStdout: true
                    ).trim()

                    def mongoIp = sh(
                        script: """
                            aws ec2 describe-instances \
                              --filters "Name=tag:Name,Values=placement-portal-mongodb" \
                                        "Name=instance-state-name,Values=running" \
                              --query 'Reservations[0].Instances[0].PublicIpAddress' \
                              --output text --region ${AWS_REGION}
                        """,
                        returnStdout: true
                    ).trim()

                    echo "📍 Backend instance: ${backendInstanceId}"
                    echo "📍 Frontend instance: ${frontendInstanceId}"
                    echo "📍 MongoDB IP: ${mongoIp}"

                    if (!backendInstanceId || backendInstanceId == 'None' || !frontendInstanceId || frontendInstanceId == 'None') {
                        echo "⚠️ EC2 instances not running. Run: cd infrastructure && terraform apply -auto-approve"
                        currentBuild.result = 'UNSTABLE'
                        return
                    }

                    // ── Deploy Backend via SSM ──────────────────────────────
                    def backendCmdId = sh(
                        script: """
                            aws ssm send-command \
                              --instance-ids ${backendInstanceId} \
                              --document-name "AWS-RunShellScript" \
                              --parameters 'commands=[
                                "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}",
                                "docker pull ${IMAGE_BACKEND}:${env.GIT_COMMIT_SHORT}",
                                "docker rm -f \$(docker ps -aq) 2>/dev/null || true",
                                "docker run -d --name placement-backend --restart unless-stopped -p 5000:5000 -e PORT=5000 -e NODE_ENV=production -e MONGODB_URI=\\"mongodb://${mongoIp}:27017/placement_db\\" -e JWT_SECRET=\\"super-secure-jwt-secret-change-in-prod\\" ${IMAGE_BACKEND}:${env.GIT_COMMIT_SHORT}"
                              ]' \
                              --region ${AWS_REGION} \
                              --query 'Command.CommandId' \
                              --output text
                        """,
                        returnStdout: true
                    ).trim()

                    echo "Backend SSM command sent: ${backendCmdId}"

                    // ── Deploy Frontend via SSM ─────────────────────────────
                    def frontendCmdId = sh(
                        script: """
                            aws ssm send-command \
                              --instance-ids ${frontendInstanceId} \
                              --document-name "AWS-RunShellScript" \
                              --parameters 'commands=[
                                "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}",
                                "docker pull ${IMAGE_FRONTEND}:${env.GIT_COMMIT_SHORT}",
                                "docker rm -f \$(docker ps -aq) 2>/dev/null || true",
                                "docker run -d --name placement-frontend --restart unless-stopped -p 80:8080 ${IMAGE_FRONTEND}:${env.GIT_COMMIT_SHORT}"
                              ]' \
                              --region ${AWS_REGION} \
                              --query 'Command.CommandId' \
                              --output text
                        """,
                        returnStdout: true
                    ).trim()

                    echo "Frontend SSM command sent: ${frontendCmdId}"

                    // ── Wait for both commands to succeed ──────────────────
                    echo "⏳ Waiting for SSM commands to complete..."
                    sh """
                        aws ssm wait command-executed \
                          --command-id ${backendCmdId} \
                          --instance-id ${backendInstanceId} \
                          --region ${AWS_REGION} && echo '✅ Backend deployed'

                        aws ssm wait command-executed \
                          --command-id ${frontendCmdId} \
                          --instance-id ${frontendInstanceId} \
                          --region ${AWS_REGION} && echo '✅ Frontend deployed'
                    """

                    // ── Print ALB URL ──────────────────────────────────────
                    def albDns = sh(
                        script: """
                            aws elbv2 describe-load-balancers \
                              --names placement-portal-alb \
                              --query 'LoadBalancers[0].DNSName' \
                              --output text --region ${AWS_REGION} 2>/dev/null || echo 'Not available'
                        """,
                        returnStdout: true
                    ).trim()

                    echo "🎉 Deployment complete!"
                    echo "🌐 Application URL: http://${albDns}"
                    echo "🔧 Backend API:     http://${albDns}/api/health"
                }
            }
        }

    }

    post {
        always {
            echo "🧹 Pipeline finished. Cleaning up workspace and unused docker images..."
            sh "docker logout ${ECR_REGISTRY} 2>/dev/null || true"
            sh "docker system prune -af --filter 'until=24h' 2>/dev/null || true"
            cleanWs()
        }
        success {
            echo "🎉 Build #${env.BUILD_NUMBER} SUCCEEDED! Commit: ${env.GIT_COMMIT_SHORT}"
        }
        unstable {
            echo "⚠️ Build #${env.BUILD_NUMBER} UNSTABLE — Infrastructure may need provisioning via Terraform."
        }
        failure {
            echo "❌ Build #${env.BUILD_NUMBER} FAILED! Check the logs above."
        }
    }
}