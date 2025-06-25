# Production Deployment Configuration

This document outlines the GitHub secrets required for the automatic production deployment workflow.

## Overview

The deployment workflow deploys to production on PR merges to main branch. It uses the committed `.env.prod` file for environment configuration and requires only a Firebase service account for deployment.

## Required GitHub Secrets

### Firebase Service Account

```
FIREBASE_SERVICE_ACCOUNT_MONZO_FLOW  # Required for production deployments
```

## Production Environment

Production deployments use the committed `.env.prod` file which contains:

```env
REACT_APP_FIREBASE_API_KEY=AIzaSyDVh5pMk-aRk5hHPp34XS0YMt47M8tLpsw
REACT_APP_FIREBASE_AUTH_DOMAIN=monzo-flow.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=monzo-flow
REACT_APP_FIREBASE_STORAGE_BUCKET=monzo-flow.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=77766792777
REACT_APP_FIREBASE_APP_ID=1:77766792777:web:f50d836b7483ab8c7c5198
REACT_APP_FIREBASE_MEASUREMENT_ID=G-FF0SYQW0CR
REACT_APP_MONZO_CLIENT_ID=oauth2client_0000AJ2pelNcJZjJ0WSlvN
REACT_APP_MONZO_REDIRECT_URI=https://monzoflow.com/auth
```

## Setup Instructions

1. **Configure Firebase Service Account**:
   - Generate a service account key for the `monzo-flow` Firebase project
   - Go to your repository Settings → Secrets and variables → Actions
   - Add it as `FIREBASE_SERVICE_ACCOUNT_MONZO_FLOW` secret

2. **Test the Deployment**:
   - Create a test PR and merge to main to verify production deployment

## Deployment Flow

### Production Deployment (PR Merge)
1. Workflow copies `.env.prod` to `.env.local` for build configuration
2. Builds the React application for production
3. Deploys to `monzo-flow` Firebase project  
4. Updates deployment status to https://monzo-flow.web.app

## Security Notes

- Production configuration is committed (non-sensitive values only)
- Firebase service account key provides deployment access
- All temporary files are cleaned up after deployment

## Troubleshooting

If deployment fails, check:
1. `FIREBASE_SERVICE_ACCOUNT_MONZO_FLOW` secret is present and valid
2. Firebase service account has deployment permissions for `monzo-flow` project
3. `.env.prod` file exists and contains correct configuration
4. Build process completes successfully

For more details, see the workflow logs in GitHub Actions.