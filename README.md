# Vercel-Clone

A full-stack serverless deployment platform inspired by Vercel, built with Node.js, AWS services, and Docker. This project enables automated builds and deployments from GitHub repositories, with storage and serving of build artifacts via AWS S3.

---

## Features

- **GitHub Integration**: Trigger deployments via repository URLs and branches.
- **Build Server**: Clones repos, installs dependencies, builds projects.
- **API Server**: Manages deployment lifecycle and exposes deployment status.
- **AWS S3 Storage**: Uploads and serves build artifacts securely.
- **Reverse Proxy**: Serves build artifacts and handles routing.
- **Dockerized** for easy setup and deployment.

---

## Tech Stack

- Node.js with Express (API Server, Build Server)
- AWS SDK (S3 storage, credentials)
- Docker
- Git CLI for repo management

---

## Getting Started

### Prerequisites

- Node.js (v14+)
- Docker & Docker Compose (optional but recommended)
- AWS Account with S3 bucket and access credentials
- GitHub repository for deploying