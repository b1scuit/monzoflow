# Jira Ticket Selection and Engineering Assignment

Please help me automate the process of selecting a Jira ticket and assigning it to engineering work:

## Task Overview
1. Connect to our Jira instance and query tickets from a specific project
2. Filter tickets with status "Selected for Development"
3. Sort the results by priority (highest first), then by creation date (oldest first)
4. Select the top ticket from this sorted list
5. Execute the `/engineer` command with the selected ticket number as the argument to the command

 ## Specific Requirements

### Jira Query Parameters
- **Project**: MFLOW 
- **Status**: "Selected for Development"
- **Sort Order**: 
  1. Priority (High → Low)
  2. Creation Date (Oldest → Newest)

### Expected Workflow
1. Use Jira REST API or CLI to fetch tickets matching the criteria
2. Parse the response to extract ticket keys/numbers
3. Select the first ticket from the sorted results
4. Execute: `/engineer [TICKET_NUMBER]`

### Output Format
Please provide:
- A summary of tickets found matching the criteria
- The selected ticket number and brief description
- Confirmation of the `/engineer` command execution

## Authentication Notes
- Use existing Jira credentials/tokens configured in the environment
- If authentication is needed, prompt for the required setup steps

## Error Handling
- If no tickets match the criteria, inform me and suggest alternative actions
- If the `/engineer` command fails, provide the ticket number for manual execution

Execute this workflow now and select the next ticket for development.