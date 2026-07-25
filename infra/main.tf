# ── VPC & networking (default VPC to keep it simple) ─────────────────────────
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ── Security group ─────────────────────────────────────────────────────────────
# Never use 0.0.0.0/0 here — a world-open port 22 gets brute-forced within hours,
# and a hijacked instance runs up the bill. Add your own IP via terraform.tfvars
# (gitignored) rather than hardcoding it, so it stays out of this public repo.
variable "ssh_allowed_cidrs" {
  description = "CIDRs allowed to SSH into the monitored instance."
  type        = list(string)
  default     = ["13.233.177.0/29"] # EC2 Instance Connect (ap-south-1) — browser SSH from the console
}

resource "aws_security_group" "agent_target" {
  name        = "devops-ai-agent-target-sg"
  description = "Allow SSH and HTTP inbound for agent monitoring"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_allowed_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "devops-ai-agent-target-sg" }
}

# ── EC2 instance (free tier t2.micro) ─────────────────────────────────────────
resource "aws_instance" "monitored_server" {
  ami                    = "ami-0c02fb55956c7d316" # Amazon Linux 2, ap-south-1
  instance_type          = "t3.micro"
  vpc_security_group_ids = [aws_security_group.agent_target.id]

  tags = {
    Name    = "devops-ai-monitored-server"
    Project = "devops-ai-assistant"
  }
}

# ── IAM role for Lambda ────────────────────────────────────────────────────────
resource "aws_iam_role" "lambda_role" {
  name = "devops-ai-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ── Lambda function (dummy target for agents to monitor) ──────────────────────
data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "${path.module}/lambda_function.zip"

  source {
    content  = <<-EOF
      def handler(event, context):
          return {"statusCode": 200, "body": "ok"}
    EOF
    filename = "lambda_function.py"
  }
}

resource "aws_lambda_function" "monitored_lambda" {
  function_name    = "devops-ai-monitored-lambda"
  role             = aws_iam_role.lambda_role.arn
  handler          = "lambda_function.handler"
  runtime          = "python3.11"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  tags = { Project = "devops-ai-assistant" }
}

# ── CloudWatch log group for Lambda ───────────────────────────────────────────
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.monitored_lambda.function_name}"
  retention_in_days = 7
}

# ── Outputs ────────────────────────────────────────────────────────────────────
output "ec2_instance_id" {
  value = aws_instance.monitored_server.id
}

output "lambda_function_name" {
  value = aws_lambda_function.monitored_lambda.function_name
}