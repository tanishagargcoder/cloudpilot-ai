terraform {
  backend "s3" {
    bucket         = "devops-ai-tfstate-tanisha-garg"
    key            = "terraform.tfstate"
    region         = "uap-south-1"
    dynamodb_table = "devops-ai-tfstate-lock"
    encrypt        = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.8"
    }
  }
}

provider "aws" {
  region = "ap-south-1"
}