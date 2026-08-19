# Meta Repo Overview

## Repository
Global extension index repository:
- `otto-extensions/otto-extension-index`

## Purpose
The meta repo is the global source of truth for:
- extension existence
- extension purpose
- extension metadata
- extension compatibility

It indexes extension repositories across:
- `otto-systems`
- `otto-extensions`

## Core Artifacts
- `extensions.json`
- `compatibility.json`
- `contracts/`
- `manifests/`
- `tools/`
- `commands/`
- `apis/`

## Automation
A scheduled GitHub Action runs every 12 hours and can also be triggered manually to refresh index artifacts.
