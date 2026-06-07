# Route 53 latency-based routing for multi-region deployment
# Automatically routes users to the nearest healthy region

resource "aws_route53_zone" "lms" {
  name = "lmsplatform.com"
}

locals {
  regions = {
    us-east-1      = { lb = var.us_east_lb, region = "us-east-1" }
    eu-west-1      = { lb = var.eu_west_lb, region = "eu-west-1" }
    ap-southeast-1 = { lb = var.ap_se_lb,   region = "ap-southeast-1" }
  }
}

variable "us_east_lb"  { description = "US East ALB DNS name" }
variable "eu_west_lb"  { description = "EU West ALB DNS name" }
variable "ap_se_lb"    { description = "AP Southeast ALB DNS name" }

# Latency records for API — one per region
resource "aws_route53_record" "api_latency" {
  for_each = local.regions

  zone_id        = aws_route53_zone.lms.zone_id
  name           = "api.lmsplatform.com"
  type           = "CNAME"
  ttl            = 60
  set_identifier = "api-${each.key}"
  records        = [each.value.lb]

  latency_routing_policy {
    region = each.value.region
  }

  health_check_id = aws_route53_health_check.api[each.key].id
}

# Health checks per region
resource "aws_route53_health_check" "api" {
  for_each = local.regions

  fqdn              = each.value.lb
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30

  tags = { Name = "lms-api-health-${each.key}" }
}

# Latency records for web app
resource "aws_route53_record" "web_latency" {
  for_each = local.regions

  zone_id        = aws_route53_zone.lms.zone_id
  name           = "app.lmsplatform.com"
  type           = "CNAME"
  ttl            = 60
  set_identifier = "web-${each.key}"
  records        = [each.value.lb]

  latency_routing_policy {
    region = each.value.region
  }
}

output "nameservers" {
  value = aws_route53_zone.lms.name_servers
}
