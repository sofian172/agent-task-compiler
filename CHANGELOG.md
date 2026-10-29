# Changelog

## [0.1.0] — 2026-10-29

### Added
- `compileIntent()` — deterministic rule-based parser
- `validateContract()` + JSON Schema (`schema/contract.schema.json`)
- CLI: `agent-task-compiler`
- MCP server: `agent-task-compiler-mcp`
- `strict` mode, `allowedTools` whitelist
- Pluggable `IntentParser` interface

### Fixed
- Compatibility shim for `ajv-formats` v3 under NodeNext + ESM: unwrap the
  CommonJS default export so `addFormats(ajv)` resolves correctly at both
  compile-time and runtime.
