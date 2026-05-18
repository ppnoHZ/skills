---
name: pm-to-jira
description: 'Break down Product Manager requirements (PRD) into Jira tasks, separating frontend and backend efforts, estimating story points, and generating an import-ready CSV or Markdown table for Jira.'
user-invocable: true
---

# Product Manager to Jira Task Breakdown

## When to Use
- When given a new Product Requirements Document (PRD) or feature description.
- When planning a sprint and needing to create actionable Jira tickets for developers.
- When a PM requests a breakdown of technical tasks for a new feature.

## Procedure
Follow these steps systematically to convert PM requirements into Jira tasks:

1. **Read and Analyze the PRD**
   - Review the provided requirements, user stories, and acceptance criteria.
   - Identify the core functionalities and dependencies.

2. **Split into Frontend and Backend**
   - **Frontend (FE):** Identify UI changes, new views, API integrations, and state management.
   - **Backend (BE):** Identify database schema changes, new API endpoints, business logic updates, and background jobs.
   - **Other:** Note any DevOps, QA, or design tasks if applicable.

3. **Estimate Effort (Story Points/Hours)**
   - Assign an initial estimate for each task.
   - Use standard Fibonacci sequence (1, 2, 3, 5, 8) for story points, or estimated hours based on complexity.

4. **Output in Jira Format**
   - Generate a table (CSV format preferred for Jira bulk import) containing the following columns:
     - Issue Type (Story, Task, Sub-task)
     - Summary (Title of the task)
     - Description (Brief overview and acceptance criteria)
     - Component (Frontend/Backend)
     - Estimate (Story points or time)
   - **Important Encoding Note**: When generating CSV containing Chinese or non-ASCII characters, warn the user that direct copy-pasting to Excel/WPS may result in encoding issues (乱码). If you are saving the CSV file directly to the user's workspace, **ALWAYS prepend the UTF-8 BOM (`\ufeff`)** at the very beginning of the file content, which guarantees Excel/WPS will render the characters correctly.

## Example Output Format
Use the following CSV structure so the user can copy-paste it directly into Jira's CSV importer:

```csv
Issue Type,Summary,Description,Component,Estimate
Story,"Implement User Login UI","Create the login page with email and password fields. AC: Validates empty fields.",Frontend,3
Task,"Create Authentication API","/api/v1/login endpoint with JWT token generation.",Backend,5
```
