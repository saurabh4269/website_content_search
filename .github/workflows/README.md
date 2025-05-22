# GitHub Actions CI/CD Workflows

This document explains the CI/CD setup for the Website Content Search application.

## Overview

We use GitHub Actions to automate the build, test, and deployment processes for both the frontend and backend components of the application. Our deployment targets are:

- **Frontend**: Deployed to Vercel
- **Backend API**: Deployed to Render
- **Weaviate Vector DB**: Deployed to Render as a Docker service

## Workflow Files

### 1. `.github/workflows/frontend.yml`

This workflow handles the frontend (Next.js) application:

- **Trigger**: Runs on pushes to `main` branch, pull requests, and manual triggers
- **Process**:
  - Checks out code
  - Sets up Node.js
  - Installs dependencies
  - Runs ESLint (non-blocking)
  - Builds the project
  - Deploys to Vercel (production deployment for `main` branch, preview for PRs)
- **Required Secrets**:
  - `VERCEL_TOKEN`: API token from Vercel
  - `VERCEL_PROJECT_ID`: Project ID from Vercel project settings
  - `VERCEL_ORG_ID`: Organization ID from Vercel

### 2. `.github/workflows/backend.yml`

This workflow handles the backend (FastAPI) and Weaviate deployment:

- **Trigger**: Runs on pushes to `main` branch, pull requests, and manual triggers
- **Process for Backend**:
  - Checks out code
  - Sets up Python
  - Installs dependencies
  - Runs Black formatter check (non-blocking)
  - Runs pytest (non-blocking)
  - Deploys to Render (only on `main` branch)
- **Process for Weaviate**:
  - Deploys Weaviate Docker service to Render (only on `main` branch)
- **Required Secrets**:
  - `RENDER_API_KEY`: API key from Render
  - `RENDER_BACKEND_SERVICE_ID`: Service ID for backend from Render
  - `RENDER_WEAVIATE_SERVICE_ID`: Service ID for Weaviate from Render

## Setting Up Required Secrets

To set up the required secrets:

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add each of the required secrets

### Getting Vercel Secrets

1. Go to your Vercel dashboard
2. Navigate to the project settings
3. Find your Project ID and Org ID
4. Create a new token in your Vercel account settings

### Getting Render Secrets

1. Go to your Render dashboard
2. Navigate to Account Settings > API Keys to get your API key
3. For service IDs, they can be found in the URL when viewing the service in Render

## Pull Request Previews

Both workflows are configured to run on pull requests, which means:

- Frontend: Vercel will create a unique preview URL for each PR
- Backend: Tests and linting will run, but deployment will only happen on merge to `main`

## Troubleshooting

If deployments fail:

1. Check the GitHub Actions logs for detailed error messages
2. Verify that all required secrets are correctly set
3. Ensure that the Vercel and Render accounts have the necessary permissions
4. Check that the services are properly configured in Render

## Manual Deployment

You can manually trigger the workflows using the "workflow_dispatch" event:

1. Go to the Actions tab in your GitHub repository
2. Select the workflow you want to run
3. Click "Run workflow" and select the branch
