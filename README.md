# Website Content Search

A single-page application that allows users to input a website URL and a search query, then returns the top 10 matches of HTML DOM content based on the search query.

## Features

- Search website content using semantic search
- Parse and tokenize HTML content
- Display results with relevance ranking
- View both text and HTML versions of search results
- Modern, responsive UI built with Next.js and Tailwind CSS

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/saurabh4269/website_content_search.git
cd website_content_search
```

### 2. Start the Vector Database (Weaviate)

```bash
docker-compose up -d
```

### 3. Set up the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Set up the Frontend

```bash
cd frontend
npm install
npm run dev
```

or simply
```bash
./run.sh
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Weaviate Console: http://localhost:8080/v1/console

## How It Works

1. **HTML Fetching**: The backend fetches HTML content from the provided URL.
2. **Parsing & Tokenization**: The HTML is cleaned (removing scripts, styles, etc.) and tokenized into chunks of approximately 500 tokens each.
3. **Vector Embedding**: Each chunk is converted into a vector embedding using the Sentence Transformer model.
4. **Indexing**: The chunks and their embeddings are stored in Weaviate.
5. **Semantic Search**: When a search query is submitted, it's also converted to a vector embedding, and Weaviate finds the most similar chunks.
6. **Result Display**: The top 10 matching chunks are returned to the frontend and displayed with their relevance scores.

## Vector Database Configuration

The application uses Weaviate as the vector database. The Docker Compose file sets up a basic Weaviate instance with the following configuration:

- No authentication (for development purposes)
- Persistence enabled
- No default vectorizer module (we provide our own vectors)

For production use, you should:
- Enable authentication
- Configure proper persistence
- Consider using a managed Weaviate instance

## Fallback Mechanism

If Weaviate is not available, the application falls back to a basic keyword matching algorithm. This ensures the application can still function without the vector database, albeit with less sophisticated search capabilities.

## Potential Improvements

- Add pagination for search results
- Implement caching for frequently searched websites
- Add user authentication and saved searches
- Improve HTML parsing to better preserve document structure
- Implement more advanced relevance ranking algorithms
- Add support for JavaScript-rendered websites using headless browsers

## CI/CD Pipeline

This project uses GitHub Actions for Continuous Integration and Deployment:

### Frontend CI/CD (Vercel)

The frontend is automatically deployed to Vercel when changes are pushed to the main branch or when pull requests are created.

Required Secrets:
- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_ORG_ID`

### Backend CI/CD (Render)

The backend (FastAPI) and Weaviate services are automatically deployed to Render when changes are pushed to the main branch.

Required Secrets:
- `RENDER_API_KEY`
- `RENDER_BACKEND_SERVICE_ID`
- `RENDER_WEAVIATE_SERVICE_ID`

Preview deployments are automatically created for pull requests to facilitate testing changes before merging.
