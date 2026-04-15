pipeline {
    agent any

    environment {
        PATH            = "/usr/local/bin:${env.PATH}"
    }

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    parameters {
        booleanParam(name: 'RUN_SONAR', defaultValue: false, description: 'Run SonarQube scan (requires credentials configured in Jenkins).')
        booleanParam(name: 'SONAR_ONLY', defaultValue: false, description: 'Run only SonarQube (skip Docker build/compose and all AWS stages).')
        booleanParam(name: 'DEPLOY_AWS', defaultValue: false, description: 'Deploy to AWS (ECR + SSM). Keep OFF for local/teacher demo.')
        string(name: 'AWS_REGION', defaultValue: 'us-east-1', description: 'AWS region for ECR/SSM (only used if DEPLOY_AWS=true).')
        string(name: 'AWS_ACCOUNT_ID', defaultValue: '', description: 'AWS account ID for ECR registry (only used if DEPLOY_AWS=true).')
        string(name: 'SONAR_HOST_URL', defaultValue: '', description: 'SonarQube host URL (only used if RUN_SONAR=true).')
        string(name: 'SONAR_PROJECT_KEY', defaultValue: 'placement-portal', description: 'SonarQube project key (only used if RUN_SONAR=true).')
    }

    stages {

        stage('Checkout') {
            steps {
                timeout(time: 30, unit: 'MINUTES') {
                    checkout([
                        $class: 'GitSCM',
                        branches: scm.branches,
                        userRemoteConfigs: scm.userRemoteConfigs,
                        doGenerateSubmoduleConfigurations: false,
                        extensions: [[
                            $class: 'CloneOption',
                            depth: 1,
                            noTags: true,
                            shallow: true,
                            timeout: 30
                        ]]
                    ])
                }
                script {
                    env.GIT_COMMIT_SHORT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    echo "✅ Checked out commit: ${env.GIT_COMMIT_SHORT}"
                }
            }
        }

        stage('Install, Lint, Test, Build') {
            when { expression { return !params.SONAR_ONLY } }
            steps {
                dir('backend') {
                    sh """
                        set -euxo pipefail
                        npm config set registry "https://registry.npmjs.org/"
                        npm config set fetch-retries "5"
                        npm config set fetch-retry-mintimeout "20000"
                        npm config set fetch-retry-maxtimeout "120000"
                        if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
                        npm run lint
                        npm test
                        npm run build
                    """
                }
                dir('frontend') {
                    sh """
                        set -euxo pipefail
                        npm config set registry "https://registry.npmjs.org/"
                        npm config set fetch-retries "5"
                        npm config set fetch-retry-mintimeout "20000"
                        npm config set fetch-retry-maxtimeout "120000"
                        if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
                        npm run lint
                        npm run build
                    """
                }
            }
        }

        stage('SonarQube Analysis') {
            when { expression { return params.RUN_SONAR } }
            steps {
                script {
                    if (!params.SONAR_HOST_URL?.trim()) {
                        error("RUN_SONAR=true but SONAR_HOST_URL is empty. Set the parameter or configure it in Jenkins.")
                    }
                }
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    timeout(time: 60, unit: 'MINUTES') {
                        withCredentials([string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN')]) {
                    withEnv([
                        "SONAR_HOST_URL=${params.SONAR_HOST_URL}",
                        "SONAR_PROJECT_KEY=${params.SONAR_PROJECT_KEY}",
                    ]) {
                        sh '''#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(pwd)"
test -d "$ROOT_DIR/backend/src"
test -d "$ROOT_DIR/frontend/src"

# On Linux, host.docker.internal often doesn't resolve inside containers.
# If the user provided host.docker.internal, rewrite it to the Docker host gateway IP.
SONAR_URL="$(printf '%s' "${SONAR_HOST_URL}" | tr -d '\r' | xargs)"
if [[ "${SONAR_URL}" == *"host.docker.internal"* ]]; then
  if ! curl -fsS --max-time 3 "${SONAR_URL%/}/api/system/status" >/dev/null 2>&1; then
    # Get default gateway without needing the `ip` command (often missing in slim images).
    # /proc/net/route stores gateway in little-endian hex.
    GW_HEX="$(awk '$2=="00000000" {print $3; exit}' /proc/net/route 2>/dev/null || true)"
    GW_IP=""
    if [[ -n "${GW_HEX}" && "${GW_HEX}" != "00000000" ]]; then
      # Example: 0101A8C0 -> 192.168.1.1
      GW_IP="$(printf '%d.%d.%d.%d' \
        $((16#${GW_HEX:6:2})) \
        $((16#${GW_HEX:4:2})) \
        $((16#${GW_HEX:2:2})) \
        $((16#${GW_HEX:0:2})) \
      )"
    fi
    if [[ -n "${GW_IP}" ]]; then
      SONAR_URL="${SONAR_URL/host.docker.internal/${GW_IP}}"
    fi
  fi
fi

# Wait briefly for SonarQube to be reachable
echo "Waiting for SonarQube at: ${SONAR_URL}"
for i in {1..60}; do
  if curl -fsS --max-time 3 "${SONAR_URL%/}/api/system/status" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
curl -fsS --max-time 5 "${SONAR_URL%/}/api/system/status" >/dev/null

# Run scanner locally (NOT in docker) because Jenkins runs in a container
# and docker volume mounts from /var/jenkins_home will not exist on the host daemon.
SCANNER_VERSION="8.0.1.6346"
SCANNER_DIR=".sonar/sonar-scanner"

if [ ! -x "${SCANNER_DIR}/bin/sonar-scanner" ]; then
  rm -rf "${SCANNER_DIR}"
  mkdir -p .sonar
  curl -fsSL -o /tmp/sonar-scanner.zip \
    "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-${SCANNER_VERSION}-linux-x64.zip"
  rm -rf .sonar/sonar-scanner-*linux-x64
  unzip -oq /tmp/sonar-scanner.zip -d .sonar
  EXTRACTED_DIR=""
  for d in .sonar/sonar-scanner-*linux-x64; do
    if [ -d "$d" ]; then EXTRACTED_DIR="$d"; break; fi
  done
  if [ -z "${EXTRACTED_DIR}" ]; then
    echo "SonarScanner unzip failed: extracted folder not found"
    ls -la .sonar || true
    exit 1
  fi
  mv "${EXTRACTED_DIR}" "${SCANNER_DIR}"
fi

# Keep scanner in foreground so Jenkins can terminate it reliably on timeout/restart.
# Also kill the whole process group on TERM/INT so we don't leave scanner running.
cleanup() {
  echo "Stopping SonarScanner..."
  kill -TERM 0 >/dev/null 2>&1 || true
}
trap cleanup INT TERM

"${SCANNER_DIR}/bin/sonar-scanner" \
  -Dsonar.projectKey="${SONAR_PROJECT_KEY}" \
  -Dsonar.projectName="Placement Portal" \
  -Dsonar.projectBaseDir="$ROOT_DIR" \
  -Dsonar.sources="backend/src,frontend/src" \
  -Dsonar.host.url="${SONAR_URL}" \
  -Dsonar.token="${SONAR_TOKEN}" \
  -Dsonar.exclusions="**/node_modules/**,**/dist/**,**/build/**" \
  -Dsonar.scm.disabled=true
'''
                    }
                        }
                    }
                }
            }
        }

        stage('Docker Build (Local)') {
            when { expression { return !params.SONAR_ONLY } }
            steps {
                sh """
                    set -euxo pipefail
                    export DOCKER_BUILDKIT=0
                    docker build -t placement-portal-backend:${env.GIT_COMMIT_SHORT} -t placement-portal-backend:latest ./backend
                    docker build -t placement-portal-frontend:${env.GIT_COMMIT_SHORT} -t placement-portal-frontend:latest ./frontend
                """
            }
        }

        stage('Compose Up + Smoke Test') {
            when { expression { return !params.SONAR_ONLY } }
            steps {
                sh """
                    set -euxo pipefail
                    export COMPOSE_PROJECT_NAME="pp-\${BUILD_NUMBER}"
                    export MONGO_HOST_PORT=0
                    export FRONTEND_HOST_PORT=0
                    export SONAR_HOST_PORT=0
                    export REGISTRY_HOST_PORT=0

                    # Start core services using compose healthchecks (no fake sleeps).
                    docker compose -f docker-compose.yml -f docker-compose.ci.yml up -d --build mongodb backend frontend

                    # Smoke test backend health from inside the compose network.
                    docker run --rm --network "\${COMPOSE_PROJECT_NAME}_placement-net" curlimages/curl:8.7.1 \\
                      --fail --retry 30 --retry-all-errors --retry-delay 1 \\
                      http://backend:5000/health
                """
            }
        }

        stage('ECR Login') {
            when { expression { return params.DEPLOY_AWS && !params.SONAR_ONLY } }
            steps {
                script {
                    if (!params.AWS_ACCOUNT_ID?.trim()) {
                        error("DEPLOY_AWS=true but AWS_ACCOUNT_ID is empty.")
                    }
                }
                sh """
                    set -euxo pipefail
                    export ECR_REGISTRY="${params.AWS_ACCOUNT_ID}.dkr.ecr.${params.AWS_REGION}.amazonaws.com"
                    aws ecr get-login-password --region "${params.AWS_REGION}" | docker login --username AWS --password-stdin "\${ECR_REGISTRY}"
                """
            }
        }

        stage('Docker Push to ECR') {
            when { expression { return params.DEPLOY_AWS && !params.SONAR_ONLY } }
            steps {
                sh """
                    set -euxo pipefail
                    export ECR_REGISTRY="${params.AWS_ACCOUNT_ID}.dkr.ecr.${params.AWS_REGION}.amazonaws.com"
                    export IMAGE_BACKEND="\${ECR_REGISTRY}/placement-portal-backend"
                    export IMAGE_FRONTEND="\${ECR_REGISTRY}/placement-portal-frontend"

                    docker tag placement-portal-backend:${env.GIT_COMMIT_SHORT} "\${IMAGE_BACKEND}:${env.GIT_COMMIT_SHORT}"
                    docker tag placement-portal-backend:${env.GIT_COMMIT_SHORT} "\${IMAGE_BACKEND}:latest"
                    docker tag placement-portal-frontend:${env.GIT_COMMIT_SHORT} "\${IMAGE_FRONTEND}:${env.GIT_COMMIT_SHORT}"
                    docker tag placement-portal-frontend:${env.GIT_COMMIT_SHORT} "\${IMAGE_FRONTEND}:latest"

                    docker push "\${IMAGE_BACKEND}:${env.GIT_COMMIT_SHORT}"
                    docker push "\${IMAGE_BACKEND}:latest"
                    docker push "\${IMAGE_FRONTEND}:${env.GIT_COMMIT_SHORT}"
                    docker push "\${IMAGE_FRONTEND}:latest"
                """
            }
        }

        stage('Deploy to AWS EC2 (SSM)') {
            when { expression { return params.DEPLOY_AWS && !params.SONAR_ONLY } }
            steps {
                echo "🚀 Deploying to AWS EC2 instances via SSM..."
                script {
                    def AWS_REGION = params.AWS_REGION
                    def ECR_REGISTRY = "${params.AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
                    def IMAGE_BACKEND = "${ECR_REGISTRY}/placement-portal-backend"
                    def IMAGE_FRONTEND = "${ECR_REGISTRY}/placement-portal-frontend"

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
                        error("EC2 instances not running. Run: cd infrastructure && terraform apply -auto-approve")
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
                                "docker run -d --name placement-backend --restart unless-stopped -p 5000:5000 -e PORT=5000 -e NODE_ENV=production -e MONGODB_URI=\\"mongodb://${mongoIp}:27017/placement_db\\" -e JWT_SECRET=\\"${JWT_SECRET:-change-me}\\" ${IMAGE_BACKEND}:${env.GIT_COMMIT_SHORT}"
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
            script {
                // If checkout fails, Declarative may run post after leaving the node context.
                // Wrapping in node() makes cleanup safe in that case.
                node {
                    sh "docker logout 2>/dev/null || true"
                    sh "export COMPOSE_PROJECT_NAME=\"pp-\${BUILD_NUMBER}\" && docker compose -f docker-compose.yml -f docker-compose.ci.yml down -v 2>/dev/null || true"
                    sh "docker system prune -af --filter 'until=24h' 2>/dev/null || true"
                    deleteDir()
                }
            }
        }
        success {
            echo "🎉 Build #${env.BUILD_NUMBER} SUCCEEDED! Commit: ${env.GIT_COMMIT_SHORT}"
        }
        failure {
            echo "❌ Build #${env.BUILD_NUMBER} FAILED! Check the logs above."
        }
    }
}