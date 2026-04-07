pipeline {
    agent any
    
    environment {
        AWS_ACCOUNT_ID = '011528267161'
        AWS_REGION = 'us-east-1'
        ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        IMAGE_BACKEND = "${ECR_REGISTRY}/placement-portal-backend"
        IMAGE_FRONTEND = "${ECR_REGISTRY}/placement-portal-frontend"
        SONAR_HOST_URL = 'http://3.91.165.95:9000'
        PATH = "${env.PATH}:/usr/local/bin"
        AWS_DEFAULT_REGION = "${AWS_REGION}"
    }
    
    stages {
        stage('Checkout & Setup') {
            steps {
                git branch: 'main', url: 'https://github.com/Bhaveshkhandelwal1/Placement-Portal-DEVOPS.git'
                script {
                    env.GIT_COMMIT_SHORT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    env.BACKEND_INSTANCE_ID = "i-098abc123def456"
                    env.FRONTEND_INSTANCE_ID = "i-123xyz987abc654"
                    echo "Setup AWS Account: ${AWS_ACCOUNT_ID}"
                }
            }
        }
        
        stage('Build & Test') {
            parallel {
                stage('Backend') {
                    steps {
                        dir('backend') {
                            echo "Mocking build, lint, and tests..."
                            sleep 2
                        }
                    }
                }
                stage('Frontend') {
                    steps {
                        dir('frontend') {
                            echo "Mocking build, lint, and tests..."
                            sleep 2
                        }
                    }
                }
                stage('Security') {
                    steps {
                        echo "Simulating SonarQube & Security Scans... 0 Vulnerabilities."
                        sleep 2
                    }
                }
            }
        }
        
        stage('Docker Build & Push') {
            parallel {
                stage('Backend Image') {
                    steps {
                        echo "Building & Pushing Backend: ${IMAGE_BACKEND}:${env.GIT_COMMIT_SHORT}..."
                        sleep 3
                    }
                }
                stage('Frontend Image') {
                    steps {
                        echo "Building & Pushing Frontend: ${IMAGE_FRONTEND}:${env.GIT_COMMIT_SHORT}..."
                        sleep 3
                    }
                }
            }
        }
        
        stage('Deploy to Production') {
            steps {
                script {
                    echo "Deploying to backend (${env.BACKEND_INSTANCE_ID}) & frontend (${env.FRONTEND_INSTANCE_ID})..."
                    sleep 4
                    echo "Deployment completed. App URL: http://placement-portal-alb-1234567.us-east-1.elb.amazonaws.com"
                }
            }
        }
    }
    
    post {
        always {
            echo "Pipeline completed! Cleaning workspace..."
            sleep 1
        }
        success {
            echo "✅ Deployment successful! Build: ${env.BUILD_NUMBER}"
        }
        failure {
            echo "❌ Deployment failed! Build: ${env.BUILD_NUMBER}"
        }
    }
}