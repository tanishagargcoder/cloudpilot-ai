# ── SNS topic for all alerts ───────────────────────────────────────────────────
resource "aws_sns_topic" "alerts" {
  name = "devops-ai-alerts"
}

# ── EC2 CPU high alarm ─────────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "ec2_cpu_high" {
  alarm_name          = "devops-ai-ec2-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Average"
  threshold           = 70
  alarm_description   = "EC2 CPU above 70% — triggers anomaly agent"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.monitored_server.id
  }

  tags = { Project = "devops-ai-assistant" }
}

# ── Lambda error rate alarm ────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "devops-ai-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Lambda errors above 5 — triggers anomaly agent"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.monitored_lambda.function_name
  }

  tags = { Project = "devops-ai-assistant" }
}

# ── Lambda duration alarm ──────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  alarm_name          = "devops-ai-lambda-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Average"
  threshold           = 3000  # 3 seconds in ms
  alarm_description   = "Lambda running slow — triggers anomaly agent"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.monitored_lambda.function_name
  }

  tags = { Project = "devops-ai-assistant" }
}