FROM mcr.microsoft.com/playwright:v1.65.0-noble

WORKDIR /workspaces/LowCodeAutomationTestingPlatform/backend

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    postgresql-client \
    redis-tools \
    unzip \
    sudo \
    graphviz \
    graphviz-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    NODE_ENV=development

EXPOSE 8000
