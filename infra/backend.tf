terraform {
  backend "s3" {
    bucket = "devops-ai-tfstate-tanisha-garg"
    key    = "terraform.tfstate"
    region = "ap-south-1"
  }
}