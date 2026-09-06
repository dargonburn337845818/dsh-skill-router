# dsh-skill-router

> A DSH skill-routing and workflow-constraint plugin: routes skill clusters by task, provides a user-overridable guide, and injects development rules during development/refactoring.

[中文](README.md) | **English**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Introduction

dsh-skill-router is a routing plugin in the DSH (DeepSeek Harness) ecosystem. It works together with `dsh-skill-vault`. Based on the first user message, it selects a workflow and loads only the skill cluster that workflow needs, reducing the context cost of unrelated skills.

## Features

- **Automatic routing**: the first user message is routed by rules into search, skill iteration, development/refactoring, or domain workflows.
- **User override**: switch workflows explicitly with `skill_router_switch`.
- **Skill suggestions**: `skill_suggest` returns recommended skills for the current or a specified workflow.
- **Development constraints**: in development/refactoring mode, the plugin forces `commit_star` first to activate `dsh-graded-mode`, then injects development rules and the path manual.
- **Process monitor**: injects a `conversation.view` slot showing the current workflow, enabled skills, recommended skills, and expert-discussion traces in teacher/research modes.

## Dependencies

- `@dsh-external/dsh-skill-vault`: skill storage and toggles.
- `@dsh-external/dsh-graded-mode`: strong-process state machine.

## Installation

See [INSTALL.md](INSTALL.md) for installation and loading steps.

## Agent Tools

| Tool | Purpose |
|---|---|
| `skill_router_status` | View current routing, enabled/recommended skills |
| `skill_router_switch` | Switch between base / core / dev / domain |
| `skill_suggest` | Get recommended skills for the current or specified workflow |

## Repository Layout

```text
src/
├── index.ts             # plugin assembly entry: tools, API routes, process monitor
├── api.ts               # /skill-router/api routes and responses
├── classify.ts          # first user message classification
├── router.ts            # workflow routing state machine and skill recommendations
├── tools.ts             # agent tools
├── vault-client.ts      # dsh-skill-vault client
└── client/              # process monitor UI
lib/                     # prebuilt artifacts (committed for direct install)
scripts/                 # build scripts
tests/                   # routing, classification, API, vault-client tests
```

## Development and Verification

```bash
npm run typecheck
npm test
bash scripts/build.sh
npm run build:client
```

After source changes, keep `lib/` in sync so a clone can install and test directly.

## Operational Safety

This plugin never hot-reloads a running agent. Install/upgrade follows `dsh-optimization-consensus`: back up first, smoke-test in an isolated environment, then deploy; rollback restores actual files.

## Contributing and Security

- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)
- Vulnerability reporting: [SECURITY.md](SECURITY.md)
- Community guidelines: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## License

[MIT](LICENSE)
