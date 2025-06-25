# Production Deployment Configuration

This document outlines the GitHub secrets required for the automatic production deployment workflow.

## Overview

The deployment workflow deploys to production on PR merges to main branch. Environment configuration is provided via GitHub secrets and dynamically creates a `.env.production` file during deployment.

## Required GitHub Secrets

### Firebase Service Account
```
FIREBASE_SERVICE_ACCOUNT_MONZO_FLOW
```

### React Application Environment Variables
```
REACT_APP_FIREBASE_API_KEY
REACT_APP_FIREBASE_AUTH_DOMAIN
REACT_APP_FIREBASE_PROJECT_ID
REACT_APP_FIREBASE_STORAGE_BUCKET
REACT_APP_FIREBASE_MESSAGING_SENDER_ID
REACT_APP_FIREBASE_APP_ID
REACT_APP_FIREBASE_MEASUREMENT_ID
REACT_APP_MONZO_CLIENT_ID
REACT_APP_MONZO_REDIRECT_URI
```

### Firebase Functions Environment Variables
```
REACT_APP_MONZO_CLIENT_SECRET
```

## Setup Instructions

1. **Add GitHub Secrets**:
   - Go to your repository Settings → Secrets and variables → Actions
   - Add the Firebase service account key as `FIREBASE_SERVICE_ACCOUNT_MONZO_FLOW`
   - Add all environment variables listed above with their production values

2. **Secret Values**:
   - Use the values from your existing `.env.prod` file
   - Firebase service account: Generate from Firebase Console → Project Settings → Service Accounts

3. **Test the Deployment**:
   - Create a test PR and merge to main to verify production deployment

## Deployment Flow

### Production Deployment (PR Merge)
1. Creates `.env.production` file from GitHub secrets
2. React application builds with production configuration from `.env.production`
3. Firebase Functions are built with environment variables
4. Deploys both hosting and functions to `monzo-flow` Firebase project  
5. Cleans up `.env.production` file for security
6. Updates deployment status to https://monzo-flow.web.app

## Security Notes

- All configuration is stored securely as GitHub secrets
- Firebase service account key provides deployment access
- `.env.production` file is created dynamically during deployment and cleaned up afterward
- Environment variables are loaded from `.env.production` at build time
- All temporary files including `.env.production` are cleaned up after deployment

## Troubleshooting

If deployment fails, check:
1. All required GitHub secrets are present and correctly named
2. Firebase service account has deployment permissions for `monzo-flow` project
3. Environment variable values are correct (check against `.env.prod`)
4. Build process completes successfully

For more details, see the workflow logs in GitHub Actions.