# Development Container Dockerfile for LowCodeAutomationTestingPlatform
# Uses Microsoft Playwright base image (includes Node.js, Playwright, Chromium, Firefox, WebKit, and system dependencies)
FROM mcr.microsoft.com/playwright:v1.49.1-noble

ARG USERNAME=pwuser
ARG USER_UID=1000
ARG USER_GID=1000

# Install developer utilities (PostgreSQL client, Redis tools, git, zsh, curl, jq)
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends \
        sudo \
        git \
        zsh \
        curl \
        wget \
        jq \
        postgresql-client \
        redis-tools \
        procps \
        ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Ensure pwuser has sudo privileges without password prompt
RUN echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/${USERNAME} \
    && chmod 0440 /etc/sudoers.d/${USERNAME}

# Ensure /workspaces and target directory exist and are owned by pwuser
RUN mkdir -p /workspaces/LowCodeAutomationTestingPlatform \
    && chown -R ${USERNAME}:${USERNAME} /workspaces \
    && ln -s /workspaces/LowCodeAutomationTestingPlatform /workspaces/AutomationTestingWithAgentBrowser

# Set workspace directory
WORKDIR /workspaces/LowCodeAutomationTestingPlatform

# Set environment variables for Playwright and Node
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    NODE_ENV=development

USER ${USERNAME}
