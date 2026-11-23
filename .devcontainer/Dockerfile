# Development Container Dockerfile for LowCodeAutomationTestingPlatform
# Unified Enterprise Low-Code Automation & Deterministic Testing Platform
# Base: Ubuntu 22.04 LTS (Jammy) with Node.js 22 LTS, Playwright, PostgreSQL, Redis, and Dev Tools
FROM ubuntu:22.04

# Avoid interactive prompts during apt package installation
ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Etc/UTC

# Non-root user configuration
ARG USERNAME=TeamDolphin
ARG USER_UID=1000
ARG USER_GID=1000

# 1. Install system utilities, developer tools, database clients, and Graphviz
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
        ca-certificates \
        curl \
        postgresql-client \
        unzip \
        sudo \
        graphviz \
        graphviz-dev \
        git \
        wget \
        jq \
        gnupg \
        lsb-release \
        procps \
        make \
        build-essential \
        pkg-config \
        python3 \
        htop \
        nano \
        vim-tiny \
        iputils-ping \
        net-tools \
        bash-completion \
        tree \
        xvfb \
        zsh \
        postgresql \
        postgresql-contrib \
        redis-server \
        redis-tools \
        docker.io \
        docker-compose-v2 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Node.js 22.x LTS & npm from NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g npm@latest \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 3. Create non-root developer user with passwordless sudo & docker privileges
RUN if getent passwd ${USER_UID} >/dev/null 2>&1; then \
        EXISTING_USER=$(getent passwd ${USER_UID} | cut -d: -f1); \
        if [ "$EXISTING_USER" != "${USERNAME}" ]; then \
            usermod -l ${USERNAME} -d /home/${USERNAME} -m ${EXISTING_USER}; \
            groupmod -n ${USERNAME} $(getent group ${USER_GID} | cut -d: -f1) 2>/dev/null || true; \
        fi; \
    else \
        groupadd --gid ${USER_GID} ${USERNAME} 2>/dev/null || true; \
        useradd --uid ${USER_UID} --gid ${USER_GID} -m -s /bin/bash ${USERNAME}; \
    fi \
    && echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/${USERNAME} \
    && chmod 0440 /etc/sudoers.d/${USERNAME} \
    && (usermod -aG docker ${USERNAME} 2>/dev/null || true)

# 4. Install global Node developer tooling (concurrently, typescript, ts-node, nestjs CLI)
RUN npm install -g concurrently typescript ts-node rimraf @nestjs/cli

# 5. Configure Playwright browser dependencies and browsers
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0

RUN mkdir -p /ms-playwright \
    && chown -R ${USERNAME}:${USERNAME} /ms-playwright \
    && npx --yes playwright@1.65.0 install-deps \
    && su - ${USERNAME} -c "npx --yes playwright@1.65.0 install chromium" \
    && chmod -R 777 /ms-playwright

# 6. Ensure workspace directories exist with proper user ownership
RUN mkdir -p /workspaces/LowCodeAutomationTestingPlatform \
    && chown -R ${USERNAME}:${USERNAME} /workspaces \
    && ln -sf /workspaces/LowCodeAutomationTestingPlatform /workspaces/AutomationTestingWithAgentBrowser

# 7. Configure bashrc with custom prompt and convenience aliases
RUN echo '\n# Dev Container Convenience Aliases\n\
alias dev="npm run dev"\n\
alias dev:all="npm run dev"\n\
alias dev:api="npm --prefix /workspaces/LowCodeAutomationTestingPlatform/backend run start:api"\n\
alias dev:worker="npm --prefix /workspaces/LowCodeAutomationTestingPlatform/backend run start:worker"\n\
alias dev:frontend="npm --prefix /workspaces/LowCodeAutomationTestingPlatform/frontend run dev"\n\
alias dev:test="npm --prefix /workspaces/LowCodeAutomationTestingPlatform/backend test"\n\
alias dev:seed="npm --prefix /workspaces/LowCodeAutomationTestingPlatform/backend run seed"\n\
alias ll="ls -alF"\n\
export PS1="\\[\\033[1;36m\\][devcontainer]\\[\\033[0m\\] \\[\\033[1;32m\\]\\u@\\h\\[\\033[0m\\]:\\[\\033[1;34m\\]\\w\\[\\033[0m\\]\\$ "\n'\
>> /home/${USERNAME}/.bashrc

# 8. Initialize local PostgreSQL database and credentials during build (supports standalone container mode)
RUN service postgresql start \
    && su - postgres -c "psql -c \"CREATE DATABASE automation_platform_db;\" 2>/dev/null || true" \
    && su - postgres -c "psql -c \"ALTER USER postgres WITH PASSWORD 'postgres';\"" \
    && su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE automation_platform_db TO postgres;\"" \
    && service postgresql stop

# Set workspace directory
WORKDIR /workspaces/LowCodeAutomationTestingPlatform

# Set environment variables for runtime
ENV NODE_ENV=development \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Switch to non-root developer user
USER ${USERNAME}
