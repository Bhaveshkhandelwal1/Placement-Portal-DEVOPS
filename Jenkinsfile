pipeline {
    agent any

    environment {
        LOCAL_REGISTRY    = 'host.docker.internal:5001'
        IMAGE_BACKEND     = "${LOCAL_REGISTRY}/placement-portal-backend"
        IMAGE_FRONTEND    = "${LOCAL_REGISTRY}/placement-portal-frontend"
        SONAR_HOST_URL    = 'http://host.docker.internal:9000'
        SONAR_PROJECT_KEY = 'placement-portal'
        COMPOSE_FILE      = '/var/jenkins_home/workspace/Placement-Portal-Pipeline/docker-compose.yml'
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

        // ── Stage 2: Build & Test (Parallel) ──────────────────────────────
        stage('Build & Test') {
            parallel {

                stage('Backend') {
                    steps {
                        dir('backend') {
                            echo "🔨 Installing & building backend..."
                            sh '''
                                docker run --rm \
                                  -v "$(pwd)":/app \
                                  -w /app \
                                  node:18-alpine \
                                  sh -c "npm install --ignore-scripts && npm run build && npm test"
                            '''
                            echo "✅ Backend build & test passed"
                        }
                    }
                }

                stage('Frontend') {
                    steps {
                        dir('frontend') {
                            echo "🔨 Installing & building frontend..."
                            sh '''
                                docker run --rm \
                                  -v "$(pwd)":/app \
                                  -w /app \
                                  node:18-alpine \
                                  sh -c "npm install && npm run build"
                            '''
                            echo "✅ Frontend build passed"
                        }
                    }
                }

                stage('Security - SonarQube') {
                    steps {
                        echo "🔍 Running SonarQube code analysis..."
                        sh '''
                            docker run --rm \
                              -v "$(pwd)":/usr/src \
                              --add-host=host.docker.internal:host-gateway \
                              sonarsource/sonar-scanner-cli \
                              -Dsonar.projectKey=placement-portal \
                              -Dsonar.projectName="Placement Portal" \
                              -Dsonar.sources=backend/src,frontend/src \
                              -Dsonar.host.url=http://host.docker.internal:9000 \
                              -Dsonar.token=squ_5586c882dfe62d759d61769e9132d4834e9a8d32 \
                              -Dsonar.exclusions="**/node_modules/**,**/dist/**,**/build/**" \
                              -Dsonar.scm.disabled=true
                        '''
                        echo "✅ SonarQube scan completed"
                    }
                }

            }
        }

        // ── Stage 3: Docker Build & Push (Parallel) ───────────────────────
        stage('Docker Build & Push') {
            parallel {

                stage('Backend Image') {
                    steps {
                        echo "🐳 Building & pushing backend image..."
                        sh """
                            docker build \
                                -t ${IMAGE_BACKEND}:${env.GIT_COMMIT_SHORT} \
                                -t ${IMAGE_BACKEND}:latest \
                                ./backend
                            docker push ${IMAGE_BACKEND}:${env.GIT_COMMIT_SHORT}
                            docker push ${IMAGE_BACKEND}:latest
                        """
                        echo "Backend image pushed: ${IMAGE_BACKEND}:${env.GIT_COMMIT_SHORT}"
                    }
                }

                stage('Frontend Image') {
                    steps {
                        echo "🐳 Building & pushing frontend image..."
                        sh """
                            docker build \
                                -t ${IMAGE_FRONTEND}:${env.GIT_COMMIT_SHORT} \
                                -t ${IMAGE_FRONTEND}:latest \
                                ./frontend
                            docker push ${IMAGE_FRONTEND}:${env.GIT_COMMIT_SHORT}
                            docker push ${IMAGE_FRONTEND}:latest
                        """
                        echo "Frontend image pushed: ${IMAGE_FRONTEND}:${env.GIT_COMMIT_SHORT}"
                    }
                }

            }
        }

        // ── Stage 4: Deploy ───────────────────────────────────────────────
        stage('Deploy to Local') {
            steps {
                echo "Deploying updated application stack..."
                sh '''
                    docker compose -f docker-compose.yml up -d --remove-orphans
                '''
                echo "Deployment complete. App running at http://localhost"
            }
        }

    }

    post {
        always {
            echo "🧹 Pipeline finished. Cleaning up workspace..."
            cleanWs()
        }
        success {
            echo "🎉 Build #${env.BUILD_NUMBER} SUCCEEDED! Commit: ${env.GIT_COMMIT_SHORT}"
        }
        failure {
            echo "❌ Build #${env.BUILD_NUMBER} FAILED! Check the logs above."
        }
    }
}