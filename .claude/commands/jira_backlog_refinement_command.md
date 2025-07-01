# MFLOW Backlog Refinement Guide

*Automated Jira ticket refinement using Claude Code*

## Command Instruction

```bash
claude code --instruction "Take all the Jira issues currently in the backlog of the MFLOW project, expand their requirements by gathering relevant data from Confluence MFlow space, add comprehensive context and acceptance criteria to each ticket, and once updated set each ticket to 'Refined' status. For each backlog issue: 1) Search the MFlow Confluence space for related documentation and context 2) Enhance the ticket description with detailed requirements, user stories, and technical context 3) Add comprehensive acceptance criteria 4) Include references to relevant Confluence pages 5) Transition the ticket to 'Refined' status using transition ID 51"
```

## Detailed Implementation Steps

The Claude Code agent will execute the following process for each backlog ticket:

### 1. **Discovery Phase**
- Search for all issues in MFLOW project with status "Backlog" using JQL: `project = MFLOW AND status = "Backlog"`
- Get the current ticket details including summary, description, and metadata

### 2. **Context Gathering**
- Search the MFlow Confluence space (Space ID: 51642371) for pages related to each ticket
- Use CQL queries to find relevant documentation based on ticket summary keywords
- Extract key information, requirements, and technical specifications from found pages

### 3. **Requirement Enhancement**
For each ticket, the agent will:
- **Expand the description** with:
  - Detailed user story format (As a... I want... So that...)
  - Technical requirements and implementation details
  - Whether Remote Config is suitable for this feature
  - Business context and rationale
  - Dependencies and related work
  
- **Add acceptance criteria** including:
  - Functional requirements (Given/When/Then format)
  - Non-functional requirements (performance, security, etc.)
  - Definition of Done criteria
  - Testing scenarios

- **Include references** to:
  - Related Confluence pages
  - Technical documentation
  - Design specifications
  - API documentation

### 4. **Ticket Update**
- Update the Jira issue with the enhanced description and acceptance criteria
- Ensure proper formatting using Jira markup
- Add labels or components if relevant context is found

### 5. **Status Transition**
- Move each refined ticket from "Backlog" to "Refined" status
- Use transition ID 51 ("Refined Issue") identified for the MFLOW project
- Add a comment documenting the refinement process

## Expected Outcomes

After execution, each backlog ticket will have:
- ✅ Comprehensive requirements documentation
- ✅ Clear acceptance criteria
- ✅ Relevant Confluence page references
- ✅ Enhanced technical context
- ✅ "Refined" status in Jira

## Prerequisites

Ensure you have:
- Atlassian Cloud access configured in Claude Code
- Read/write permissions for MFLOW Jira project
- Access to MFlow Confluence space
- Sufficient API rate limits for bulk operations

## Usage Notes

- The command will process all current backlog items automatically
- Each ticket will be processed individually to ensure quality
- Failed updates will be logged and reported
- The process respects Jira field restrictions and validation rules
- Confluence content is summarized and adapted for Jira format
