
# AuraGen - Role 1 Final Handover

## Contributor Information

- Contributor: Bhasuru Uttej
- Role: Design System and Prompt Engineering
- Branch: Uttej
- Project: AuraGen
- Handover Date: November 24, 2026

## Project Objective

AuraGen converts natural-language user requirements into
structured React UI source code using a constrained
AI generation pipeline.

## Role 1 Deliverables

- Centralized design system and design tokens.
- Registry of approved reusable UI components.
- Natural-language intent analysis.
- Negation-aware requirement detection.
- Dynamic system prompt construction.
- Dependency-aware component resolution.
- Relevant few-shot example selection.
- Structured JSON output contract.
- AST-based JSX validation using Babel.
- Component property and constraint validation.
- Automatic generation repair workflow.
- Backend HTTP API.
- Mock and OpenAI provider adapters.
- Bounded provider retries.
- Exponential backoff.
- Provider timeout handling.
- Automated regression and integration tests.
- Backend integration documentation.

## Approved Component Registry

1. Button
2. Label
3. TextInput
4. SelectField
5. Checkbox
6. Card
7. Alert
8. Stepper
9. ProgressBar
10. ChatBubble

## Generation Architecture

User Request
    |
    v
Intent Analysis
    |
    v
Component Resolution
    |
    v
System Prompt and Few-Shot Examples
    |
    v
LLM Provider
    |
    v
JSON Output Contract
    |
    v
AST-Based JSX Validation
    |
    +-- Valid --> Return Generated UI
    |
    +-- Invalid --> Repair Prompt
                       |
                       v
                 Retry Generation

The workflow allows a maximum of two repair attempts
after the initial generation request.

## Backend API

- GET /api/health
- POST /api/analyze
- POST /api/generate

Default development address:

http://127.0.0.1:8000

## Local Setup

Install dependencies from the repository root:

    npm.cmd --prefix backend install

Enable mock mode:

    $env:AURAGEN_MOCK="1"

Start the backend:

    npm.cmd --prefix backend start

Run automated tests:

    npm.cmd --prefix backend test

## Testing Coverage

The backend test suite covers:

- Intent recognition and negation.
- Component selection and dependencies.
- Prompt construction.
- Few-shot example selection.
- JSON response validation.
- JSX syntax validation.
- Component property constraints.
- Component name consistency.
- Automatic generation repair.
- HTTP API request validation.
- Provider response contracts.
- Provider retries and timeouts.
- End-to-end generation workflows.
- Browser CORS preflight.
- Security-related regression checks.

## Security Considerations

- API keys must remain on the backend.
- Secrets must never be committed to GitHub.
- Unsupported imports are rejected.
- Known dynamic execution patterns are rejected.
- Dangerous HTML properties are rejected.
- Request body and generated code sizes are limited.
- Generated JavaScript must be treated as untrusted.

Static validation is not a complete security sandbox.
Frontend rendering requires additional isolation and
runtime security controls.

## Release Verification Checklist

- Run the complete backend test suite.
- Confirm the health endpoint responds successfully.
- Confirm mock generation works.
- Verify frontend request and response compatibility.
- Reconcile the shared frontend component contracts.
- Confirm no credentials are committed.
- Test the real provider with authorized credentials.
- Verify safe generated-code rendering.
- Review changes before merging into the main branch.

## Known Limitations

- Mock testing does not verify live LLM behavior.
- Static validation cannot guarantee runtime safety.
- Frontend component contracts require final alignment.
- Provider response quality requires live evaluation.
- Deployment and production monitoring require further work.

## Integration References

See INTEGRATION.md for API documentation,
environment configuration and frontend usage.

## Handover Status

Role 1 implementation and supporting test files
are available on the Uttej development branch.

Final acceptance depends on successful test execution,
team integration and review before merging.

## Repository

https://github.com/Uttam123-git/Aura-Gen
