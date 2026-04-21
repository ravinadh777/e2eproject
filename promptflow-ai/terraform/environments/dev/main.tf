# terraform/environments/dev/main.tf
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws        = { source = "hashicorp/aws", version = "~> 5.30" }
    kubernetes = { source = "hashicorp/kubernetes", version = "~> 2.24" }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "promptflow-ai"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

variable "aws_region"    { default = "us-east-1" }
variable "cluster_name"  { default = "promptflow-cluster" }
variable "environment"   { default = "dev" }
variable "node_instance" { default = "t3.small" }
variable "node_min"      { default = 1 }
variable "node_max"      { default = 3 }
variable "node_desired"  { default = 2 }

data "aws_availability_zones" "available" { state = "available" }
data "aws_caller_identity" "current" {}

# ── VPC ───────────────────────────────────────────────────────────────────────
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "promptflow-vpc-${var.environment}" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "promptflow-igw" }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = {
    Name                                        = "promptflow-public-${count.index}"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
    "kubernetes.io/role/elb"                   = "1"
  }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags = {
    Name                                        = "promptflow-private-${count.index}"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
    "kubernetes.io/role/internal-elb"           = "1"
  }
}

resource "aws_eip" "nat" { domain = "vpc" }

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
  tags          = { Name = "promptflow-nat" }
  depends_on    = [aws_internet_gateway.main]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route { cidr_block = "0.0.0.0/0"; gateway_id = aws_internet_gateway.main.id }
  tags   = { Name = "promptflow-public-rt" }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route { cidr_block = "0.0.0.0/0"; nat_gateway_id = aws_nat_gateway.main.id }
  tags   = { Name = "promptflow-private-rt" }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# ── IAM Roles ─────────────────────────────────────────────────────────────────
resource "aws_iam_role" "eks_cluster" {
  name = "promptflow-eks-cluster-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "eks.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_iam_role" "eks_nodes" {
  name = "promptflow-eks-node-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "ec2.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "eks_cni" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "ecr_readonly" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy" "node_s3" {
  name = "promptflow-node-s3"
  role = aws_iam_role.eks_nodes.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:PutObject", "s3:GetObject", "s3:ListBucket"]
      Resource = [aws_s3_bucket.logs.arn, "${aws_s3_bucket.logs.arn}/*",
                  aws_s3_bucket.reports.arn, "${aws_s3_bucket.reports.arn}/*"]
    }]
  })
}

# ── EKS Cluster ───────────────────────────────────────────────────────────────
resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.29"
  vpc_config {
    subnet_ids              = concat(aws_subnet.public[*].id, aws_subnet.private[*].id)
    endpoint_private_access = true
    endpoint_public_access  = true
  }
  enabled_cluster_log_types = ["api", "audit", "authenticator"]
  depends_on                = [aws_iam_role_policy_attachment.eks_cluster_policy]
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "promptflow-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = aws_subnet.private[*].id
  instance_types  = [var.node_instance]
  capacity_type   = "ON_DEMAND"
  scaling_config  { desired_size = var.node_desired; max_size = var.node_max; min_size = var.node_min }
  update_config   { max_unavailable = 1 }
  labels          = { Environment = var.environment, Project = "promptflow" }
  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node,
    aws_iam_role_policy_attachment.eks_cni,
    aws_iam_role_policy_attachment.ecr_readonly,
  ]
  lifecycle { ignore_changes = [scaling_config[0].desired_size] }
}

# ── ECR Repos ─────────────────────────────────────────────────────────────────
locals {
  services = ["auth-service", "workspace-service", "ai-gateway-service",
              "billing-service", "notification-service", "analytics-service", "frontend"]
}

resource "aws_ecr_repository" "services" {
  for_each             = toset(local.services)
  name                 = "promptflow/${each.key}"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration     { encryption_type = "AES256" }
}

resource "aws_ecr_lifecycle_policy" "cleanup" {
  for_each   = aws_ecr_repository.services
  repository = each.value.name
  policy = jsonencode({ rules = [{ rulePriority = 1, description = "Keep 10 images",
    selection = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 10 },
    action = { type = "expire" } }] })
}

# ── S3 Buckets ────────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "logs" {
  bucket        = "promptflow-logs-${data.aws_caller_identity.current.account_id}"
  force_destroy = true
}

resource "aws_s3_bucket" "reports" {
  bucket        = "promptflow-reports-${data.aws_caller_identity.current.account_id}"
  force_destroy = true
}

resource "aws_s3_bucket_versioning"   "logs" { bucket = aws_s3_bucket.logs.id; versioning_configuration { status = "Enabled" } }
resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } }
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  rule { id = "expire"; status = "Enabled"; filter { prefix = "" }; expiration { days = 90 } }
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id
  block_public_acls = true; block_public_policy = true; ignore_public_acls = true; restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "reports" {
  bucket = aws_s3_bucket.reports.id
  block_public_acls = true; block_public_policy = true; ignore_public_acls = true; restrict_public_buckets = true
}

# ── Outputs ───────────────────────────────────────────────────────────────────
output "cluster_endpoint"  { value = aws_eks_cluster.main.endpoint }
output "cluster_name"      { value = aws_eks_cluster.main.name }
output "ecr_registry"      { value = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com" }
output "s3_logs_bucket"    { value = aws_s3_bucket.logs.bucket }
output "s3_reports_bucket" { value = aws_s3_bucket.reports.bucket }
output "vpc_id"            { value = aws_vpc.main.id }
output "account_id"        { value = data.aws_caller_identity.current.account_id }
