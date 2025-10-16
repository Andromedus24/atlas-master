# Atlas (free-cluely)

🚀 **AI-powered desktop assistant** with plugin system, comprehensive security measures, and multi-provider AI support.

![Atlas Logo](https://via.placeholder.com/200x60/4F46E5/FFFFFF?text=Atlas)

## 🌟 Features

- **🤖 Multi-Provider AI Support** - Anthropic Claude, Google Gemini, Ollama, OpenAI
- **🔌 Extensible Plugin System** - Secure, isolated plugin architecture
- **💬 Intelligent Chat Interface** - Context-aware conversations
- **👁️ Computer Vision** - Image analysis and OCR capabilities
- **🤖 Browser Automation** - Puppeteer-based web automation
- **📊 Job Timeline** - Track and manage all operations
- **🔒 Security First** - Granular permissions and secure IPC
- **⚡ High Performance** - Optimized for speed and efficiency

## 🏗️ Architecture

Atlas is built with a modern monorepo architecture using:

- **Frontend**: Next.js 14, React 18, TailwindCSS, Radix UI
- **Desktop**: Electron 33.x with secure IPC
- **Build System**: Turbo (monorepo), TypeScript (strict mode)
- **Package Manager**: PNPM 9.x (required)
- **Database**: SQLite with Better-SQLite3

### Project Structure

```
atlas/
├── apps/
│   ├── dashboard/          # Next.js web interface
│   └── electron-host/      # Electron desktop application
├── packages/
│   ├── shared/            # Core types and interfaces
│   ├── config/            # Configuration management
│   ├── plugin-bus/        # Plugin communication system
│   └── adapters/          # AI provider integrations
├── plugins/               # Extensible plugins
│   ├── vision-service/    # Computer vision capabilities
│   └── automation-service/ # Browser automation
└── scripts/               # Build and deployment scripts
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** - [Download here](https://nodejs.org/)
- **PNPM 9+** - `npm install -g pnpm@9`
- **Git** - For cloning the repository

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/free-cluely/atlas.git
   cd atlas
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Build shared packages**
   ```bash
   pnpm run build:packages
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

5. **Start development servers**
   ```bash
   pnpm run dev:all
   ```

The application will be available at:
- **Dashboard**: http://localhost:3000
- **Electron App**: Will launch automatically

### Environment Configuration

Create a `.env` file with the following variables:

```bash
# Required: At least one AI provider API key
ANTHROPIC_API_KEY=your_anthropic_api_key_here
# GOOGLE_AI_API_KEY=your_google_ai_api_key_here
# OLLAMA_BASE_URL=http://localhost:11434
# OPENAI_API_KEY=your_openai_api_key_here

# Optional configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

## 📖 Usage

### Chat Interface

The main chat interface allows you to:
- **Converse with AI** using natural language
- **Ask questions** about images (drag & drop or paste)
- **Execute commands** through the plugin system
- **View conversation history**

### Plugin System

Atlas supports extensible plugins:

- **Vision Service** - Image analysis, OCR, object detection
- **Automation Service** - Browser automation, web scraping
- **Custom Plugins** - Build your own capabilities

### Job Timeline

Track all operations in the timeline:
- **Chat conversations** with AI providers
- **Image analysis** results
- **Automation workflows** execution
- **Plugin operations** and their outcomes

## 🔧 Development

### Available Scripts

```bash
# Development
pnpm run dev:all          # Start all services
pnpm run dev:dashboard    # Dashboard only
pnpm run dev:electron     # Electron app only

# Building
pnpm run build:packages   # Build shared packages (required first)
pnpm run build:dashboard  # Build Next.js dashboard
pnpm run build:electron   # Build Electron app
pnpm run build:prod       # Full production build

# Testing & Quality
pnpm run type-check       # TypeScript checking
pnpm run lint             # ESLint across all packages
pnpm run test             # Run unit tests
pnpm run test:e2e         # Playwright end-to-end tests

# Packaging
pnpm run package          # Package for current platform
pnpm run package:mac      # macOS DMG
pnpm run package:win      # Windows installer
pnpm run package:linux    # Linux AppImage/deb
```

### Project Structure Guidelines

- **Apps** (`apps/`) - Main applications (dashboard, electron-host)
- **Packages** (`packages/`) - Shared libraries and core functionality
- **Plugins** (`plugins/`) - Extensible plugins with isolated contexts

### Adding New Features

1. **For shared functionality** - Add to appropriate package in `packages/`
2. **For UI components** - Add to `apps/dashboard/`
3. **For new plugins** - Create in `plugins/your-plugin/`
4. **For Electron features** - Add to `apps/electron-host/`

### Plugin Development

Create a new plugin:

```typescript
import { Plugin, PluginContext, PluginManifest } from '@free-cluely/shared';

class MyPlugin implements Plugin {
  manifest: PluginManifest = {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    description: 'Description of my plugin',
    author: 'Your Name',
    permissions: ['network'], // Required permissions
    capabilities: ['my-feature'],
    entryPoint: './plugins/my-plugin/index.js'
  };

  async initialize(context: PluginContext) {
    // Initialize your plugin
  }

  async execute(method: string, payload: any) {
    // Handle plugin method calls
  }

  async destroy() {
    // Cleanup resources
  }
}

export default new MyPlugin();
```

## 🔒 Security

Atlas implements multiple security layers:

- **Permission System** - Granular permissions for plugins
- **Domain Allowlisting** - Restrict automation to approved domains
- **Secure IPC** - Type-safe inter-process communication
- **Plugin Isolation** - Plugins run in isolated contexts
- **Input Validation** - Comprehensive validation of all inputs
- **Secure Storage** - Encrypted configuration storage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- **TypeScript** - All code must be typed
- **Testing** - Write tests for new features
- **Linting** - Follow ESLint rules
- **Documentation** - Update docs for new features
- **Security** - Consider security implications

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Anthropic** for Claude AI
- **Google** for Gemini AI
- **OpenAI** for GPT models and DALL-E
- **Ollama** for local AI models
- **Electron** team for the desktop framework
- **Next.js** team for the React framework

## 📞 Support

- **Documentation**: [Wiki](https://github.com/free-cluely/atlas/wiki)
- **Issues**: [GitHub Issues](https://github.com/free-cluely/atlas/issues)
- **Discussions**: [GitHub Discussions](https://github.com/free-cluely/atlas/discussions)

---

**Made with ❤️ by the Atlas Team**