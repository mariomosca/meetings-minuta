# Meetings Minuta 🎙️

**AI-Powered Meeting Transcription & Minutes Generation Desktop App**

> A sophisticated Electron-based desktop application that transforms audio recordings into intelligent meeting transcripts and structured minutes using advanced AI technologies.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)

---

## 🎯 **Project Overview**

Meetings Minuta is a professional desktop application designed to streamline meeting documentation through AI-powered transcription and intelligent content analysis. Built with modern web technologies and packaged as a native desktop app, it showcases advanced integration of multiple AI services and sophisticated user experience design.

**🌐 Portfolio Project**: This application serves as a demonstration of full-stack development capabilities, modern UI/UX design, and AI integration expertise for [mariomosca.com](https://mariomosca.com).

---

## ✨ **Key Features**

### 🤖 **AI-Powered Intelligence**
- **Multi-Provider AI Support**: Integration with Google Gemini, Claude, and ChatGPT APIs
- **Smart Speaker Identification**: Automatic detection and naming of meeting participants
- **Intelligent Title Generation**: AI-generated meeting titles with confidence scoring
- **Structured Minutes Creation**: Automated generation of professional meeting minutes
- **Knowledge Base Extraction**: Transform discussions into searchable knowledge documents

### 🎧 **Advanced Audio Processing**
- **Real-time Transcription**: Powered by AssemblyAI with Italian language support
- **Speaker Diarization**: Automatic separation and identification of different speakers
- **File Monitoring**: Automatic detection of new audio files in configured directories
- **Multiple Format Support**: Compatible with various audio formats

### 💻 **Professional User Experience**
- **Modern Desktop Interface**: Built with React and Tailwind CSS
- **Real-time Updates**: Live transcription progress and status updates
- **Internationalization**: Multi-language support (English/Italian)
- **Responsive Design**: Adaptive interface optimized for desktop workflows
- **Dark/Light Themes**: Customizable appearance preferences

### 🔒 **Security & Privacy**
- **Local Data Storage**: All sensitive data stored locally using Electron Store
- **Secure API Management**: Encrypted storage of API keys and credentials
- **Privacy-First Design**: No data transmitted to external servers except for AI processing

---

## 🛠️ **Technology Stack**

### **Frontend**
- **Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS 4.x with custom design system
- **Icons**: Heroicons with custom icon components
- **State Management**: React hooks with context API
- **Internationalization**: i18next with browser language detection

### **Desktop Framework**
- **Runtime**: Electron 36.x with latest security features
- **Build System**: Electron Forge with custom configuration
- **Development**: Vite for fast development and hot reloading
- **Packaging**: Multi-platform builds (Windows, macOS, Linux)

### **Backend Services**
- **Database**: Electron Store (JSON-based local storage)
- **File Monitoring**: Chokidar for real-time file system watching
- **Audio Processing**: AssemblyAI API integration
- **AI Services**: Multi-provider support (Gemini, Claude, ChatGPT)

### **Development Tools**
- **Language**: TypeScript with strict configuration
- **Linting**: ESLint with TypeScript rules
- **Building**: Vite with optimized production builds
- **Testing**: Integrated testing setup ready for expansion

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js ≥ 16.4.0
- npm or yarn package manager
- API keys for chosen AI services (optional for development)

### **Installation**

```bash
# Clone the repository
git clone https://github.com/mariomosca/meetings-minuta-electron-app.git
cd meetings-minuta-electron-app

# Install dependencies
npm install

# Start development server
npm run dev
```

### **Configuration**

1. **Launch the application**
2. **Navigate to Settings** to configure API keys:
   - AssemblyAI (for transcription)
   - Google Gemini / Claude / ChatGPT (for AI features)
3. **Set monitoring directories** for automatic audio file detection
4. **Customize AI prompt templates** for specific use cases

---

## 📱 **Usage**

### **Basic Workflow**
1. **Import Audio**: Drag & drop audio files or configure auto-monitoring
2. **Start Transcription**: Automatic processing with real-time progress
3. **Review Results**: Intelligent speaker identification and text accuracy
4. **Generate Minutes**: AI-powered creation of structured meeting documents
5. **Export & Archive**: Save in multiple formats for future reference

### **Advanced Features**
- **Custom AI Prompts**: Tailor AI behavior for specific meeting types
- **Speaker Management**: Manual override and correction of speaker identification
- **Template System**: Multiple minute formats (executive, detailed, research-focused)
- **Knowledge Extraction**: Convert meetings into searchable knowledge base entries

---

## 🏗️ **Project Architecture**

```
src/
├── main.ts                 # Electron main process
├── preload.ts             # Secure IPC bridge
├── renderer.tsx           # React application entry
├── components/            # React UI components
│   ├── ui/               # Reusable design system components
│   ├── TranscriptionView.tsx
│   ├── SettingsView.tsx
│   └── ...
├── services/             # Business logic layer
│   ├── aiService.ts      # Multi-provider AI integration
│   ├── assemblyAI.ts     # Audio transcription service
│   ├── db.ts            # Local data management
│   └── fileWatcher.ts   # File system monitoring
├── config/              # Configuration management
└── locales/            # Internationalization files
```

---

## 🎨 **Design System**

The application features a comprehensive design system built with Tailwind CSS:

- **Component Library**: Reusable UI components with consistent styling
- **Accessibility**: WCAG 2.1 compliant interface elements
- **Responsive Design**: Optimized for various screen sizes and resolutions
- **Theme Support**: Dark and light modes with system preference detection
- **Typography**: Carefully crafted font hierarchy and spacing system

---

## 🔧 **Development Scripts**

```bash
# Development with hot reload
npm run dev

# Production build
npm run build

# Package for distribution
npm run make

# Type checking
npm run type-check

# Linting
npm run lint
```

---

## 📦 **Building & Distribution**

The application supports multi-platform distribution:

- **Windows**: `.exe` installer with automatic updates
- **macOS**: `.dmg` package with code signing support
- **Linux**: `.deb` and `.rpm` packages for major distributions

```bash
# Build for current platform
npm run make

# Build for specific platform
npm run make -- --platform=win32
npm run make -- --platform=darwin
npm run make -- --platform=linux
```

---

## 🤝 **Contributing**

This is a portfolio project, but feedback and suggestions are welcome! Please feel free to:

1. **Report Issues**: Use GitHub issues for bug reports
2. **Suggest Features**: Open discussions for new feature ideas
3. **Code Review**: Provide feedback on architecture and implementation

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🌟 **About the Developer**

**Mario Mosca** - Digital Product Developer  
🌐 **Portfolio**: [mariomosca.com](https://mariomosca.com)  
💼 **Specializing in**: Full-stack development, AI integration, and modern desktop applications

This project demonstrates expertise in:
- **Modern JavaScript/TypeScript development**
- **Cross-platform desktop application development**
- **AI service integration and prompt engineering**
- **User experience design and implementation**
- **Security-first development practices**

---

## 🚀 **Future Roadmap**

- [ ] **Real-time Collaboration**: Multi-user meeting participation
- [ ] **Cloud Sync**: Optional cloud storage integration
- [ ] **Advanced Analytics**: Meeting insights and statistics
- [ ] **Mobile Companion**: Mobile app for meeting management
- [ ] **API Integration**: Webhook support for workflow automation
- [ ] **Advanced AI Features**: Sentiment analysis and action item extraction

---

*Built with ❤️ using modern web technologies* 