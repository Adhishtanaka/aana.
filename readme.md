# AANA - AI-Powered Search Engine

An intelligent search engine combining multi-modal search with AI chat functionality. Built with React and FastAPI.

![AANA Interface](./screenshot/A2.gif)

## Features

- **Multi-Modal Search**: Web, images, videos, shopping, and places
- **AI Chat Integration**: Chat with search results or ask general questions
- **Smart Query Handling**: AI automatically uses your search query
- **Modern Interface**: Clean design with light/dark mode
- **Real-time Results**: Fast search with rich content support

## Quick Start

### Prerequisites
- Node.js 16+ with pnpm
- Python 3.8+
- Google Gemini API key
- Serper API key

### Installation

1. **Clone and setup frontend**
```bash
git clone https://github.com/Adhishtanaka/aana.git
cd aana
pnpm install
pnpm run dev
```

2. **Setup backend**
```bash
cd api
echo "Gemini_API_KEY=your_key_here" > .env
echo "SERPER_API_KEY=your_key_here" >> .env

# Using uv (recommended)
uv sync
uv run fastapi dev index.py

# Or using pip
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e .
fastapi dev index.py
```

3. **Access**
- Frontend: http://localhost:5173
- Backend: http://localhost:8000

## Usage

1. Enter search query and select mode (web, images, videos, shopping, places)
2. Click search or use the AI button for direct AI chat
3. Click "Chat" on any result to discuss that specific content
4. AI automatically uses your search query - no need to retype

## Tech Stack

**Frontend**: React, TypeScript, Tailwind CSS, Zustand, TanStack Query  
**Backend**: FastAPI, Google Gemini API, Serper API, BeautifulSoup4

## License

MIT License - see [LICENSE.txt](LICENSE.txt)

## Author

[Adhishtanaka](https://github.com/Adhishtanaka) - kulasoooriyaa@gmail.com