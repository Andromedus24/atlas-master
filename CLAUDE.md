# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Atlas (free-cluely) is an AI-powered desktop assistant built with TypeScript, Electron, and Next.js. It features a monorepo architecture with a plugin system, comprehensive security measures, and multiple AI provider support.

## Architecture

This is a **monorepo** using PNPM workspaces and Turbo for build orchestration with the following structure:

- **apps/**: Main applications
  - `dashboard/`: Next.js web interface (port 3000)
  - `electron-host/`: Electron desktop application
- **packages/**: Shared libraries and core functionality
- **plugins/**: Extensible plugins for vision, automation, and more
- **scripts/**: Build and setup automation

## Key Technologies

- **Frontend**: Next.js 14, React 18, TailwindCSS, Radix UI, shadcn/ui
- **Desktop**: Electron 33.x with secure IPC
- **Build**: Turbo (monorepo), TypeScript (strict mode)
- **Package Manager**: PNPM 9.x (required)
- **AI Providers**: Anthropic (Claude), Google Gemini, Ollama (local)

## Common Development Commands

### Initial Setup
```bash
# One-time setup from project root
chmod +x setup.sh && ./setup.sh
# Manual setup
pnpm install && pnpm run build:packages
```

### Development
```bash
pnpm run dev:all          # Start dashboard + electron concurrently
pnpm run dev:dashboard    # Dashboard only (http://localhost:3000)
pnpm run dev:electron     # Electron app only
```

### Building
```bash
pnpm run build:packages   # Build all shared packages first (required)
pnpm run build:dashboard  # Build Next.js dashboard
pnpm run build:electron   # Build Electron app
pnpm run build:prod       # Full production build
```

### Testing & Quality
```bash
pnpm run type-check       # TypeScript checking across monorepo
pnpm run lint             # ESLint across all packages
pnpm run test             # Run unit tests
pnpm run test:e2e         # Playwright end-to-end tests
```

### Packaging
```bash
pnpm run package          # Package for current platform
pnpm run package:mac      # macOS DMG
pnpm run package:win      # Windows installer
pnpm run package:linux    # Linux AppImage/deb
```

### Workspace Management
```bash
pnpm run clean            # Clean build artifacts
pnpm run clean:all        # Deep clean including node_modules
```

## Core Architecture Patterns

### Plugin System
- Plugins communicate via **typed PluginBus** (`packages/plugin-bus/`)
- Each plugin has a **manifest** defining permissions and capabilities
- Plugins run in isolated contexts with secure IPC
- Permission system: `screen`, `clipboard`, `automation`, `network`

### Configuration Management
- Centralized config in `packages/config/`
- Environment variables validated with Zod schemas
- Secure storage using OS keychain for API keys
- Runtime configuration updates supported

### AI Provider Adapters
- **Multi-provider support** with hot-swapping
- Located in `packages/adapters/`
- Unified interface for chat, vision, and image generation
- Default provider: Anthropic Claude via Z.AI API

### Job & Timeline System
- All operations create **Jobs** with full metadata
- Timeline UI with pagination and filtering
- Job types: `chat`, `analyze`, `generate`, `automate`, `ingest`
- Persistent storage with SQLite

## Security Architecture

### Permission System
- **Granular permissions** for screen capture, clipboard, automation, network
- **Domain allowlist** for automation tasks
- **User consent** prompts for sensitive operations
- **Context isolation** in Electron

### IPC Security
- All inter-process communication validated with schemas
- Secure preload script (`apps/electron-host/src/preload.ts`)
- Type-safe message passing between main and renderer

### Data Protection
- API keys stored in OS keychain
- No telemetry by default
- Content moderation and tagging
- Secure configuration management

## Development Workflow

### Working with Packages
```bash
# Build specific package
pnpm --filter @free-cluely/shared build
# Run tests for specific package
pnpm --filter @free-cluely/config test
```

### Adding New Dependencies
- Add to appropriate `package.json` (root, app, or package level)
- Use `pnpm install` to ensure workspace linking works correctly
- For workspace dependencies: use `"workspace:*"` version

### Environment Configuration
- Copy `.env.example` to `.env` and configure
- Required: AI provider API keys (Anthropic, Gemini, or Ollama)
- Optional: Dashboard settings, permissions, automation allowlist

## Plugin Development

### Creating a Plugin
1. Create directory in `plugins/your-plugin/`
2. Implement `Plugin` interface from `@free-cluely/shared`
3. Add plugin manifest with permissions
4. Export plugin class as default

### Plugin Communication
```typescript
// Send message to plugin
const response = await bus.send({
  id: generateId(),
  type: 'request',
  plugin: 'vision-service',
  method: 'analyze',
  payload: { imageData: 'base64...' }
});
```

## Key Files to Understand

### Core Application
- `apps/electron-host/src/main.ts` - Electron main process
- `apps/electron-host/src/preload.ts` - Secure preload script
- `apps/dashboard/src/app/layout.tsx` - Next.js app structure

### Shared Types & Schemas
- `packages/shared/src/types.ts` - All TypeScript interfaces and Zod schemas
- `packages/config/src/ConfigManager.ts` - Configuration management
- `packages/plugin-bus/src/PluginBus.ts` - Plugin communication

### Build & Deployment
- `turbo.json` - Build orchestration
- `scripts/build-prod.js` - Production build automation
- `electron-builder` configuration in root `package.json`

## Testing Strategy

### Unit Tests
- Jest configuration with `jest.config.js`
- Test files: `**/*.test.ts` or `**/*.spec.ts`
- Mock Electron APIs in tests

### E2E Tests
- Playwright configuration with `playwright.config.ts`
- Tests in `tests/` directory
- Run with `pnpm run test:e2e`

### Type Safety
- TypeScript strict mode enabled
- Zod schemas for runtime validation
- Type checking across workspace boundaries

## Common Issues & Solutions

### Build Failures
```bash
# Clean rebuild
pnpm run clean:all
pnpm install
pnpm run build:packages  # Always build packages first
```

### Development Environment
- Ensure Node.js 20+ and PNPM 9+
- Set up environment variables before starting dev servers
- Dashboard runs on port 3000, Electron will auto-connect

### Plugin Development
- Use workspace references: `@free-cluely/shared`
- Follow permission model strictly
- Test plugin isolation and security

## Future Plans (from PRD)

### Planned Features
- **Boards & Widgets**: Cyfe-style dashboard widgets (timeline, KPIs, data)
- **Data Connectors**: URL/API/CSV ingest with scheduled fetches
- **Team Sharing**: Role-based access and shared boards
- **Advanced Automation**: Enhanced Puppeteer workflows
- **Offline Mode**: Ollama fallback with job queuing
- **Image Generation**: OpenAI DALL-E integration
- **Advanced Vision**: OCR with structured JSON output

### Scalability Targets
- Dashboard FCP ≤1.5s
- Timeline search p95 ≤300ms at 50k jobs
- Chat token stream start ≤1s
- Plugin isolation and security

### Architecture Evolution
- Enhanced plugin marketplace
- Advanced job orchestration
- Real-time collaboration features
- Mobile companion app