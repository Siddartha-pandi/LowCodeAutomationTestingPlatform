# Development Container Dockerfile for LowCodeAutomationTestingPlatform
# Uses Microsoft Playwright base image (includes Node.js, Playwright, Chromium, Firefox, WebKit, and system dependencies)
FROM mcr.microsoft.com/playwright:v1.65.0-noble

ARG USERNAME=TeamDolphin
ARG USER_UID=1000
ARG USER_GID=1000

# Install developer utilities (PostgreSQL client, Redis tools, git, zsh, curl, jq, make, net tools, editors)
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
        make \
        build-essential \
        htop \
        nano \
        vim-tiny \
        iputils-ping \
        net-tools \
        bash-completion \
        tree \
        xvfb \
        docker.io \
        docker-compose-v2 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Rename default pwuser (UID 1000) from Playwright base image to TeamDolphin
RUN (usermod --badname -l ${USERNAME} -d /home/${USERNAME} -m pwuser 2>/dev/null || usermod -l ${USERNAME} -d /home/${USERNAME} -m pwuser) \
    && (groupmod --badname -n ${USERNAME} pwuser 2>/dev/null || groupmod -n ${USERNAME} pwuser 2>/dev/null || true)

# Install global Node developer tooling (concurrently, typescript, ts-node, rimraf)
RUN npm install -g concurrently typescript ts-node rimraf

# Ensure TeamDolphin has sudo privileges without password prompt and docker group access
RUN echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/${USERNAME} \
    && chmod 0440 /etc/sudoers.d/${USERNAME} \
    && (usermod -aG docker ${USERNAME} 2>/dev/null || true)

# Ensure /workspaces and target directory exist and are owned by TeamDolphin
RUN mkdir -p /workspaces/LowCodeAutomationTestingPlatform \
    && chown -R ${USERNAME}:${USERNAME} /workspaces \
    && ln -s /workspaces/LowCodeAutomationTestingPlatform /workspaces/AutomationTestingWithAgentBrowser

# Configure bashrc with custom prompt and convenience aliases
RUN echo '\n# Dev Container Convenience Aliases\n\
alias dev:api="npm --prefix /workspaces/LowCodeAutomationTestingPlatform/backend run start:api"\n\
alias dev:worker="npm --prefix /workspaces/LowCodeAutomationTestingPlatform/backend run start:worker"\n\
alias dev:frontend="npm --prefix /workspaces/LowCodeAutomationTestingPlatform/frontend run dev"\n\
alias dev:test="npm --prefix /workspaces/LowCodeAutomationTestingPlatform/backend test"\n\
alias dev:seed="npm --prefix /workspaces/LowCodeAutomationTestingPlatform/backend run seed"\n\
alias ll="ls -alF"\n\
export PS1="\\[\\033[1;36m\\][devcontainer]\\[\\033[0m\\] \\[\\033[1;32m\\]\\u@\\h\\[\\033[0m\\]:\\[\\033[1;34m\\]\\w\\[\\033[0m\\]\\$ "\n'\
>> /home/${USERNAME}/.bashrc

# Set workspace directory
WORKDIR /workspaces/LowCodeAutomationTestingPlatform

# Set environment variables for Playwright and Node
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    NODE_ENV=development

USER ${USERNAME}
