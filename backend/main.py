from fastapi import FastAPI, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import requests
from bs4 import BeautifulSoup
import weaviate
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import nltk
from typing import List, Dict, Any
from pydantic import BaseModel
import logging
import os
from urllib.parse import urlparse, urljoin
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Download necessary NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    logger.info("Downloading NLTK 'punkt' tokenizer...")
    nltk.download('punkt')

app = FastAPI(title="Website Content Search API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Server configuration from environment
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(',')
WEAVIATE_URL = os.getenv("WEAVIATE_URL", "http://localhost:8080")

# Initialize sentence transformer model for embeddings
model = SentenceTransformer('all-MiniLM-L6-v2')

# Initialize Weaviate client
try:
    client = weaviate.Client(url=WEAVIATE_URL)
    # Create class if it doesn't exist
    if not client.schema.exists("HtmlChunk"):
        class_obj = {
            "class": "HtmlChunk",
            "vectorizer": "none",  # Use custom vectors
            "properties": [
                {"name": "content", "dataType": ["text"]},
                {"name": "url", "dataType": ["string"]},
                {"name": "path", "dataType": ["string"]},  # e.g., /products/
                {"name": "match_score", "dataType": ["number"]}
            ]
        }
        client.schema.create_class(class_obj)
        logger.info("Created new schema for HtmlChunk")
except Exception as e:
    logger.warning(f"Could not connect to Weaviate: {e}")
    logger.warning("Vector search will be unavailable. Using fallback keyword search.")
    client = None


class SearchResult(BaseModel):
    content: str
    match_score: float
    html: str
    path: str


def normalize_url(url: str) -> str:
    """Ensure a URL is properly formatted with https:// scheme."""
    if not url.startswith(('http://', 'https://')):
        return f"https://{url}"
    return url


def fetch_html_content(url: str) -> str:
    """Fetch HTML content from a normalized URL."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0"
        }
        # Normalize URL before fetching
        url = normalize_url(url)
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        # Final check: ensure final URL after redirects is normalized
        return response.text, response.url
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch content from URL: {str(e)}")


def extract_page_path(html_content: str, base_url: str) -> str:
    """
    Extract canonical page path using <link rel="canonical"> or meta tags.
    Returns something like `/products/`, `/about/`, etc.
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    # Try <link rel="canonical">
    canonical_tag = soup.find("link", {"rel": "canonical"})
    if canonical_tag and canonical_tag.get("href"):
        canonical_url = urljoin(base_url, canonical_tag["href"])
        parsed = urlparse(canonical_url)
        path = parsed.path.rstrip('/')
        return path + ("/" if path else "")
    # Try Open Graph meta tag
    og_url_tag = soup.find("meta", property="og:url")
    if og_url_tag and og_url_tag.get("content"):
        og_url = urljoin(base_url, og_url_tag["content"])
        parsed = urlparse(og_url)
        path = parsed.path.rstrip('/')
        return path + ("/" if path else "")
    # Fallback: use base URL
    parsed = urlparse(base_url)
    path = parsed.path.rstrip('/')
    return path + ("/" if path else "")


def extract_semantic_chunks(html_content: str, base_url: str) -> List[Dict[str, str]]:
    """Extract meaningful content blocks with associated path and HTML"""
    soup = BeautifulSoup(html_content, 'html.parser')
    seen_texts = set()
    chunks = []
    skip_tags = ['nav', 'footer', 'script', 'style']
    # Get the page path
    page_path = extract_page_path(html_content, base_url)
    for element in soup.find_all(['h1', 'h2', 'h3', 'h4', 'p', 'section', 'article', 'main']):
        if element.name in skip_tags:
            continue
        text = element.get_text(strip=True)
        if len(text.split()) < 10 or text in seen_texts:
            continue
        chunks.append({
            "content": text,
            "html": str(element),
            "path": page_path
        })
        seen_texts.add(text)
    logger.info(f"Found {len(chunks)} semantic chunks")
    return chunks


def extract_internal_links(html_content: str, base_url: str) -> List[str]:
    """Extract internal links from the HTML content."""
    soup = BeautifulSoup(html_content, 'html.parser')
    links = []
    for link in soup.find_all('a', href=True):
        href = link['href']
        full_url = urljoin(base_url, href)
        parsed = urlparse(full_url)
        # Ensure the URL uses http(s), belongs to the same domain, and is not mailto:/javascript: etc.
        if parsed.scheme not in ('http', 'https'):
            continue
        base_domain = urlparse(base_url).netloc
        full_domain = parsed.netloc
        if base_domain != full_domain:
            continue
        links.append(full_url)
    return list(set(links))


def index_chunks_in_weaviate(chunks: List[Dict[str, str]], url: str) -> None:
    """Index cleaned text chunks into Weaviate."""
    if client is None:
        return
    logger.info(f"Deleting old chunks for {url}")
    client.batch.delete_objects(
        class_name="HtmlChunk",
        where={"path": ["url"], "operator": "Equal", "valueString": url}
    )
    logger.info(f"Indexing {len(chunks)} chunks into Weaviate")
    with client.batch as batch:
        for chunk in chunks:
            embedding = model.encode(chunk["content"])
            batch.add_data_object(
                data_object={
                    "content": chunk["content"],
                    "url": url,
                    "path": chunk["path"],
                    "match_score": 0.0
                },
                class_name="HtmlChunk",
                vector=embedding.tolist()
            )


def crawl_and_index(url: str, max_depth: int = 1, current_depth: int = 0, visited: set = None) -> None:
    """Recursively crawl and index pages on the same domain."""
    if visited is None:
        visited = set()
    if current_depth > max_depth or url in visited:
        return
    visited.add(url)
    try:
        html_content, resolved_url = fetch_html_content(url)
        logger.info(f"Fetched {resolved_url}")
        chunks = extract_semantic_chunks(html_content, resolved_url)
        index_chunks_in_weaviate(chunks, resolved_url)
        if current_depth < max_depth:
            internal_links = extract_internal_links(html_content, resolved_url)
            for link in internal_links:
                crawl_and_index(link, max_depth, current_depth + 1, visited)
    except Exception as e:
        logger.error(f"Error crawling {url}: {e}")


def search_chunks(query: str, url: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Search indexed chunks using Weaviate or fallback to semantic similarity."""
    if client is not None:
        logger.info(f"Searching for '{query}' in {url}")
        query_embedding = model.encode([query])
        result = client.query.get(
            "HtmlChunk", ["content", "url", "path", "match_score"]
        ).with_near_vector({
            "vector": query_embedding[0].tolist()
        }).with_where({
            "path": ["url"], "operator": "Equal", "valueString": url
        }).with_limit(limit * 3).do()  # Fetch more to filter after
        results = result.get("data", {}).get("Get", {}).get("HtmlChunk", [])
        logger.info(f"Weaviate returned {len(results)} matches")

        # Filter out negative match scores
        filtered_results = [res for res in results if res.get("match_score", 0.0) > 0.0]
        filtered_results.sort(key=lambda x: x["match_score"], reverse=True)

        return filtered_results[:limit]

    else:
        logger.info("Using fallback semantic search")
        html_content, resolved_url = fetch_html_content(url)
        chunks = extract_semantic_chunks(html_content, resolved_url)
        query_vec = model.encode([query])
        chunk_vecs = model.encode([c["content"] for c in chunks])
        scores = cosine_similarity(query_vec, chunk_vecs)[0]
        scored = []
        for idx, chunk in enumerate(chunks):
            score = float(scores[idx])
            if score > 0.0:  # Only keep positive matches
                chunk["match_score"] = score
                scored.append(chunk)
        scored.sort(key=lambda x: x["match_score"], reverse=True)
        return scored[:limit]


@app.post("/search", response_model=List[SearchResult])
async def search_website(url: str = Form(...), query: str = Form(...)):
    """
    Search website content based on a query.
    - **url**: The URL of the site to search
    - **query**: The natural language search term
    """
    # Normalize and resolve the input URL
    url = normalize_url(url)
    try:
        html_content, resolved_url = fetch_html_content(url)
    except Exception as e:
        logger.error(f"Failed to fetch URL: {e}")
        return []
    chunks = extract_semantic_chunks(html_content, resolved_url)
    if client is not None:
        crawl_and_index(resolved_url, max_depth=1)  # Crawl homepage + linked pages
        index_chunks_in_weaviate(chunks, resolved_url)
    results = search_chunks(query, resolved_url)
    formatted_results = []
    for result in results:
        content = result["content"]
        path = result.get("path", "/")
        score = result.get("match_score", 0.0)
        html = ""
        # Match HTML snippet by content
        for chunk in chunks:
            if content.strip() == chunk["content"].strip():
                html = chunk["html"]
                break
        formatted_results.append(SearchResult(
            content=content,
            match_score=score * 100,  # Convert to percentage
            html=html,
            path=path
        ))
    logger.info(f"Returning {len(formatted_results)} results")
    return formatted_results


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/")
async def root():
    return {"message": "Welcome to Website Content Search API", "status": "running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)