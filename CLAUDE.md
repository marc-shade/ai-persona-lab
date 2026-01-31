# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## WARNING: This is the LEGACY repo (NOT production)

**This is the OLD Streamlit-based AI Persona Lab (`persona-lab-saas`).**
**It is NOT the production SaaS app at personalabai.com.**

The **production SaaS app** lives at:
- **Path**: `/Volumes/FILES/code/Persona-SaaS-Lab`
- **GitHub**: `marc-shade/Persona-SaaS-Lab`
- **Stack**: React + Vite + Express + Drizzle ORM + PostgreSQL
- **URL**: https://personalabai.com
- **Deploy**: Render.com (auto-deploy on push to main)

If you're working on the live SaaS product, **switch to `/Volumes/FILES/code/Persona-SaaS-Lab`**.

## Repository Overview

AI Persona Lab (Legacy) - A multi-tier application for creating and managing AI personas with interactive group chats powered by Ollama. Features three distinct interfaces (Streamlit, FastAPI, Next.js) with integrated billing via Stripe and advanced In-Context Learning (ICL) capabilities. This repo is the original prototype and is NOT deployed to production.

## Core Architecture

### Three-Tier Stack
1. **Streamlit App** (`app.py`) - Original persona management UI at port 8501
2. **FastAPI Backend** (`backend/`) - REST API with authentication at port 8000
3. **Next.js Dashboard** (`frontend/`) - Modern SaaS dashboard at port 3000
4. **Node.js Billing** (`backend-node/`) - Stripe integration and billing logic at port 3005

### Key Integration Points
- Ollama API (`http://localhost:11434/api`) for LLM interactions
- PostgreSQL for user data and subscriptions
- Redis for caching and session management
- Stripe for payment processing and usage metering

## Essential Commands

### Development Setup
```bash
# Install Python dependencies
pip install -r requirements.txt        # Streamlit app
pip install -r requirements-backend.txt # FastAPI backend

# Install Node dependencies
cd frontend && npm install             # Next.js dashboard
cd backend-node && npm install         # Node billing API

# Database setup
cd backend-node
npm run db:migrate                     # Run Prisma migrations
npm run db:seed                        # Seed initial data
```

### Running Services
```bash
# Streamlit application
streamlit run app.py

# FastAPI backend
uvicorn backend.main:app --reload

# Next.js frontend
cd frontend && npm run dev

# Node.js billing API
cd backend-node && npm run dev

# Full stack with Docker
docker-compose -f docker-compose.dev.yml up
```

### Testing
```bash
# Run all tests
./run-tests.sh

# Specific test suites
./run-tests.sh --unit         # Unit tests only
./run-tests.sh --integration  # Integration tests
./run-tests.sh --ai          # AI/LLM tests (requires Ollama)
./run-tests.sh --security    # Security tests
./run-tests.sh --load        # Load tests (requires K6)

# Python tests directly
pytest tests/unit -m "not llm"  # Skip tests requiring Ollama
pytest --cov-fail-under=80      # Enforce 80% coverage threshold

# Frontend tests
cd frontend && npm run test:e2e

# Node.js tests
cd backend-node && npm test
```

### Code Quality
```bash
# Python formatting and linting
black models/ chat/ tests/
isort models/ chat/ tests/
flake8 --max-line-length=100

# Frontend linting
cd frontend && npm run lint

# Node.js linting
cd backend-node && npm run lint
```

## Key Environment Variables

### Development Mode (docker-compose.dev.yml defaults)
- `ENVIRONMENT=development` - Development mode
- `BYPASS_BILLING=true` - Disable Stripe requirements
- `ADMIN_MODE=true` - Enable admin features
- `OLLAMA_API_URL=http://localhost:11434/api` - Ollama endpoint

### Production Requirements
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_PUBLISHABLE_KEY` - Stripe public key
- `STRIPE_WEBHOOK_SECRET` - Webhook signature secret
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Authentication token secret

## Testing Strategy

### Marker System
Tests use pytest markers for organization:
- `unit` - Isolated component tests
- `integration` - Workflow tests
- `llm` - Tests requiring Ollama
- `security` - Vulnerability checks
- `load` - Performance testing

### Coverage Requirements
- Minimum 80% code coverage enforced via `pytest.ini`
- Coverage reports in `tests/coverage/`
- HTML reports in `htmlcov-*/`

### Ollama Testing
Tests automatically detect Ollama availability. Without Ollama:
```bash
pytest tests/integration -m "not llm"
```

## Database Management

### Prisma (Node.js)
```bash
cd backend-node
npx prisma generate     # Generate client
npx prisma db push      # Push schema changes
npx prisma migrate dev  # Create migration
```

### SQLAlchemy (Python)
```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## Docker Development

### Service Ports
- Streamlit UI: `http://localhost:8501`
- FastAPI: `http://localhost:8000`
- Next.js: `http://localhost:3030`
- Node.js API: `http://localhost:3005`
- PostgreSQL: `localhost:5433`
- Redis: `localhost:6380`
- Adminer: `http://localhost:8090`

### Container Management
```bash
docker-compose -f docker-compose.dev.yml up -d    # Start all services
docker-compose logs -f backend                    # View backend logs
docker-compose exec postgres psql -U personalab   # Access database
docker-compose down -v                            # Stop and clean volumes
```

## Project Structure Highlights

### Persona Logic
- `models/persona.py` - Core persona class and management
- `chat/interface.py` - Chat handling and message processing
- `data/personas.json` - Persistent persona storage

### ICL System
- `icl_orchestrator.py` - Central coordinator for In-Context Learning
- `icl_components/` - Learning pipelines, memory, knowledge graphs
- `config/icl_config.json` - ICL configuration settings

### API Structure
- `backend/main.py` - FastAPI application entry
- `backend/api/v1/endpoints/` - REST endpoints
- `backend/services/stripe/` - Payment processing

### Frontend Components
- `frontend/src/app/` - Next.js app router pages
- `frontend/src/components/ui/` - Reusable UI components
- `frontend/src/lib/` - Utilities and API clients

### Node.js Backend
- `backend-node/src/` - Express server and API routes
- `backend-node/prisma/` - Database schema and migrations
- `backend-node/docs/` - API documentation

## Critical Workflows

### Persona Creation Flow
1. User inputs persona details via UI
2. System generates unique ID and avatar
3. Persona saved to `data/personas.json`
4. Model settings configured (temperature, tokens)
5. Ollama validates model availability

### ICL Enhancement Flow
1. Memory system captures interactions with embeddings
2. Learning pipelines adapt from feedback
3. Knowledge graphs map relationships
4. Confidence scoring provides fallbacks
5. Adaptive templates optimize prompts

### Billing Integration
1. User action triggers usage tracking
2. Backend records event in PostgreSQL
3. Stripe webhook processes metered usage
4. Dashboard displays current usage/limits

## Documentation Generation

### API Documentation (Node.js)
```bash
cd backend-node
npm run docs          # Start docs server at port 3005
npm run docs:validate # Validate OpenAPI spec
npm run docs:static   # Build static documentation
```