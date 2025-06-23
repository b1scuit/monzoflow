# Notion Page Development Workflow

Please execute the following complete development workflow for Notion page: 
https://b1scuit.notion.site/Monzo-Flow-1e227d4b322a441787b7f09f0d782319

## 1. Notion Page Analysis
- Fetch and analyze the Notion page details including:
  - Requirements and specifications
  - Acceptance criteria or success metrics
  - Priority level and estimated effort
  - Comments and attachments
  - Related pages or dependencies
  - Database properties (if applicable)
- Summarize the requirements and create a development plan

## 2. Branch Management
- Ensure you're on the latest main/master branch
- Create a new feature branch using the naming convention: `notion-$PAGE_ID-brief-description` or `feature/brief-description`
- Verify the branch name follows team conventions

## 3. Code Development
- Implement the required changes based on page requirements
- Follow established coding standards and patterns in the codebase
- Add appropriate error handling and logging
- Include necessary documentation and comments
- Ensure code is production-ready with proper:
  - Input validation
  - Security considerations
  - Performance optimizations
  - Accessibility compliance (if applicable)

## 4. Testing Strategy
- Run existing test suite to ensure no regressions
- Write new unit tests for added functionality
- Write integration tests if needed
- Run end-to-end tests if applicable
- Verify all tests pass before proceeding
- Check code coverage meets project standards

## 5. Code Quality Checks
- Run linting and formatting tools
- Perform static code analysis
- Check for security vulnerabilities
- Ensure build process completes successfully
- Verify no compilation errors or warnings

## 6. Git Operations
- Stage all relevant changes
- Create meaningful commit messages following convention:
  - `feat: Brief description of changes (Notion: $PAGE_TITLE)`
  - Include detailed commit body if necessary
- Push the feature branch to remote repository

## 7. Pull Request Creation
- Create a PR from the feature branch to main/master
- Include in the PR description:
  - Link to the Notion page
  - Summary of changes made
  - Testing approach and results
  - Screenshots/demos if UI changes
  - Any deployment notes or considerations
- Add appropriate reviewers based on team structure
- Apply relevant labels and link to project if applicable

## 8. Final Verification
- Ensure CI/CD pipeline passes
- Verify PR is ready for review
- Update Notion page status to "In Review" or equivalent (if status property exists)
- Add PR link to Notion page comments or in a "Implementation" section

## Error Handling
- If any step fails, provide clear error messages and suggested solutions
- Don't proceed to subsequent steps if critical errors occur
- Maintain clean git history even if retries are needed

## Output Requirements
- Provide status updates for each major step
- Include relevant URLs (PR link, branch link, Notion page link, etc.)
- Summarize what was accomplished
- Note any manual steps that may be required

## Notion-Specific Considerations
- Handle Notion page permissions and access requirements
- Account for nested page structures and dependencies
- Consider database relationships and property updates
- Respect Notion workspace organization and conventions

Please confirm you understand the requirements and provide the Notion page URL or ID to begin this workflow.