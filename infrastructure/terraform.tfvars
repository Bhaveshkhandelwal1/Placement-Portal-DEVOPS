# ── Project Settings ──────────────────────────────────────────────
aws_region   = "us-east-1"
project_name = "placement-portal"
environment  = "dev"

# ── Network ───────────────────────────────────────────────────────
vpc_cidr = "10.0.0.0/16"

# ── EC2 Instance Types ────────────────────────────────────────────
backend_instance_type  = "t3.micro"
frontend_instance_type = "t3.micro"

# ── Database ──────────────────────────────────────────────────────
db_username = "placement"
db_password = "anushka290404"

# ── GitHub ────────────────────────────────────────────────────────
github_owner = "Bhaveshkhandelwal1"
github_repo  = "Placement-Portal-DEVOPS"

# ── Jenkins & SonarQube ───────────────────────────────────────────
jenkins_admin_password   = "admin123"
sonarqube_admin_password = "admin123"
