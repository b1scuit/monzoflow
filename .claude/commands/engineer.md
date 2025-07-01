# Jira Ticket Development Workflow

Please execute the following complete development workflow for Jira ticket `$ARGUMENTS` using subagents to decide the most idea solution

## 1. Jira Ticket Analysis
- Fetch and analyze the Jira ticket details including:
  - Description and acceptance criteria
  - Priority and story points
  - Comments and attachments
  - Linked issues or dependencies
- Summarize the requirements and create a development plan

## 2. Branch Management
- Ensure you're on the latest main/master branch
- Create a new feature branch using the naming convention: `$ARGUMENTS-brief-description`
- Verify the branch name follows team conventions

## 3. Code Development
- Implement the required changes based on ticket requirements
- Ensure the use of subagents to implement the most suitable solution
- Follow established coding standards and patterns in the codebase
- Add appropriate error handling and logging
- Include necessary documentation and comments
- Avoid changing any existing functionality or existing tests
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
  - `$ARGUMENTS: Brief description of changes`
  - Include detailed commit body if necessary
- Push the feature branch to remote repository

## 7. Pull Request Creation
- Create a PR from the feature branch to main/master
- Include in the PR description:
  - Link to the Jira ticket
  - Summary of changes made
  - Testing approach and results
  - Screenshots/demos if UI changes
  - Any deployment notes or considerations
- Add appropriate reviewers based on team structure
- Apply relevant labels and link to project if applicable

## 8. Final Verification
- Ensure CI/CD pipeline passes
- Verify PR is ready for review
- Add PR link to Jira ticket comments

## Error Handling
- If any step fails, provide clear error messages and suggested solutions
- Don't proceed to subsequent steps if critical errors occur
- Maintain clean git history even if retries are needed

## Output Requirements
- Provide status updates for each major step
- Include relevant URLs (PR link, branch link, etc.)
- Summarize what was accomplished
- Note any manual steps that may be required

Please confirm you understand the requirements and ask for the Jira ticket ID to begin this workflow.
