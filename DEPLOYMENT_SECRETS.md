# Deployment Secrets Configuration

This document outlines the GitHub secrets required for the automatic deployment workflow.

## Overview

The deployment workflow now uses GitHub environment secrets instead of 1Password for better security and simplicity. The workflow supports dual environment deployment:

- **Staging Environment** (`flowly-staging`): Triggered by PR merges
- **Production Environment** (`monzo-flow`): Triggered by direct pushes to main

## Required GitHub Secrets

### Staging Environment Secrets

The following secrets must be added to your GitHub repository for staging deployments:

```
STAGING_FIREBASE_API_KEY
STAGING_FIREBASE_AUTH_DOMAIN  
STAGING_FIREBASE_PROJECT_ID
STAGING_FIREBASE_STORAGE_BUCKET
STAGING_FIREBASE_MESSAGING_SENDER_ID
STAGING_FIREBASE_APP_ID
STAGING_FIREBASE_MEASUREMENT_ID
STAGING_MONZO_CLIENT_ID
STAGING_MONZO_REDIRECT_URI
```

### Firebase Service Accounts

```
FIREBASE_SERVICE_ACCOUNT_FLOWLY_STAGING  # Existing - for staging deployments
FIREBASE_SERVICE_ACCOUNT_MONZO_FLOW     # New - for production deployments
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

1. **Add Staging Secrets to GitHub**:
   - Go to your repository Settings → Secrets and variables → Actions
   - Add each staging secret with the appropriate values
   - Ensure secret names match exactly (case-sensitive)

2. **Configure Firebase Service Account for Production**:
   - Generate a service account key for the `monzo-flow` Firebase project
   - Add it as `FIREBASE_SERVICE_ACCOUNT_MONZO_FLOW` secret

3. **Test the Deployment**:
   - Create a test PR to verify staging deployment
   - Merge to main to verify production deployment

## Deployment Flow

### Staging Deployment (PR Merge)
1. Workflow creates `.env.staging` from GitHub secrets
2. Deploys to `flowly-staging` Firebase project
3. Updates deployment status to https://flowly-staging.web.app

### Production Deployment (Push to Main)
1. Workflow copies `.env.prod` to `.env.local`
2. Deploys to `monzo-flow` Firebase project  
3. Updates deployment status to https://monzo-flow.web.app

## Security Notes

- Staging secrets are stored securely in GitHub Actions
- Production configuration is committed (non-sensitive values only)
- Firebase service account keys provide deployment access
- All temporary files are cleaned up after deployment

## Troubleshooting

If deployment fails, check:
1. All required secrets are present and correctly named
2. Firebase service account has deployment permissions
3. Project IDs match your Firebase configuration
4. Build process completes successfully

For more details, see the workflow logs in GitHub Actions.