# CloudFront distribution for global CDN with Lambda@Edge auth
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "api_domain" { default = "api.lmsplatform.com" }
variable "web_domain" { default = "app.lmsplatform.com" }
variable "s3_bucket"  { default = "lms-media-assets" }

# S3 origin for media assets
resource "aws_cloudfront_origin_access_control" "media_oac" {
  name                              = "lms-media-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "lms_cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  http_version        = "http2and3"
  price_class         = "PriceClass_All"
  aliases             = [var.web_domain, "*.${var.web_domain}"]
  default_root_object = "index.html"

  # S3 origin — media/video
  origin {
    domain_name              = "${var.s3_bucket}.s3.amazonaws.com"
    origin_id                = "S3-media"
    origin_access_control_id = aws_cloudfront_origin_access_control.media_oac.id
  }

  # API origin
  origin {
    domain_name = var.api_domain
    origin_id   = "API-origin"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default cache behaviour — web app (Next.js)
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "S3-media"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = true
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400

    # Lambda@Edge for auth on protected content
    lambda_function_association {
      event_type   = "viewer-request"
      lambda_arn   = aws_lambda_function.edge_auth.qualified_arn
      include_body = false
    }
  }

  # Video cache behaviour — long TTL
  ordered_cache_behavior {
    path_pattern           = "/media/video/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-media"
    viewer_protocol_policy = "redirect-to-https"
    compress               = false

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 31536000
    max_ttl     = 31536000
  }

  # API pass-through — no caching
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "API-origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "X-Tenant-ID"]
      cookies { forward = "all" }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.lms_cert.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = { Project = "LMS Platform", Environment = "production" }
}

# ACM certificate (must be in us-east-1 for CloudFront)
resource "aws_acm_certificate" "lms_cert" {
  domain_name               = var.web_domain
  subject_alternative_names = ["*.${var.web_domain}"]
  validation_method         = "DNS"

  lifecycle { create_before_destroy = true }
}

# Lambda@Edge for signed URL auth
resource "aws_lambda_function" "edge_auth" {
  function_name = "lms-edge-auth"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  role          = aws_iam_role.edge_lambda_role.arn
  publish       = true
  filename      = "${path.module}/lambda/edge-auth.zip"

  lifecycle { create_before_destroy = true }
}

resource "aws_iam_role" "edge_lambda_role" {
  name = "lms-edge-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = ["lambda.amazonaws.com", "edgelambda.amazonaws.com"] }
        Action    = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "edge_lambda_basic" {
  role       = aws_iam_role.edge_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
