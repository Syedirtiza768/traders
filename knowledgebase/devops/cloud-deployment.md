# Cloud Deployment

## Purpose

Define cloud deployment patterns for AWS, Azure, GCP, and other providers.

**Last Verified**: June 2026

---

## AWS

### ECS (Fargate)

```yaml
# task-definition.json
{
  "family": "app",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "registry/app:latest",
      "portMappings": [{ "containerPort": 3000 }],
      "environment": [
        { "name": "NODE_ENV", "value": "production" }
      ],
      "secrets": [
        { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:..." }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### RDS (PostgreSQL)

```
Instance: db.r6g.large (2 vCPU, 16GB RAM)
Storage: 100GB gp3
Multi-AZ: Yes
Backup: 7 days
Encryption: Enabled
```

### Elasticache (Redis)

```
Instance: cache.r6g.large
Cluster Mode: Disabled (small), Enabled (large)
Encryption: In-transit + At-rest
```

### Infrastructure as Code (Terraform)

```hcl
# main.tf
provider "aws" {
  region = "us-east-1"
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"
  
  name = "app-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
}

module "ecs" {
  source = "terraform-aws-modules/ecs/aws"
  
  cluster_name = "app-cluster"
  fargate_capacity_providers = {
    FARGATE = {
      default_capacity_provider_strategy = {
        weight = 100
      }
    }
  }
}
```

---

## GCP

### Cloud Run

```yaml
# service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: app
spec:
  template:
    spec:
      containers:
        - image: registry/app:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: production
          resources:
            limits:
              cpu: "1"
              memory: "512Mi"
```

### Cloud SQL (PostgreSQL)

```
Tier: db-custom-2-8192 (2 vCPU, 8GB RAM)
Storage: 100GB SSD
HA: Regional
Backup: Enabled
```

---

## Azure

### Container Apps

```yaml
# containerapp.yaml
properties:
  configuration:
    ingress:
      external: true
      targetPort: 3000
  template:
    containers:
      - name: app
        image: registry/app:latest
        resources:
          cpu: 0.5
          memory: 1Gi
```

### Azure Database for PostgreSQL

```
Tier: General Purpose
Compute: 2 vCores
Storage: 100GB
HA: Zone redundant
Backup: 7 days
```

---

## Cost Optimization

### Right-Sizing

| Component | Small | Medium | Large |
|---|---|---|---|
| App Server | 1 vCPU, 1GB | 2 vCPU, 4GB | 4 vCPU, 8GB |
| Database | 2 vCPU, 8GB | 4 vCPU, 16GB | 8 vCPU, 32GB |
| Redis | 1 vCPU, 1GB | 2 vCPU, 4GB | 4 vCPU, 16GB |

### Cost Reduction Tips

- Use spot instances for non-critical workloads
- Use reserved instances for predictable workloads
- Use auto-scaling to match demand
- Use S3 lifecycle policies for old data
- Use CloudFront/CDN to reduce origin load

---

## Anti-Patterns

- **Over-provisioning**: Start small, scale up
- **No auto-scaling**: Configure auto-scaling
- **Single AZ**: Use multi-AZ for production
- **No monitoring**: Configure CloudWatch/Stackdriver
- **Hard-coded resources**: Use IaC (Terraform)

---

## Verification Checklist

- [ ] IaC configured (Terraform/Pulumi)
- [ ] Multi-AZ deployment
- [ ] Auto-scaling configured
- [ ] Database backups configured
- [ ] Monitoring configured
- [ ] Cost alerts configured
- [ ] Security groups configured
- [ ] SSL/TLS configured
