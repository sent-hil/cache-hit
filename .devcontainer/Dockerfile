FROM python:3.10-slim

WORKDIR /workspace

# Install uv for fast package management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install system dependencies, dev tools, and shells
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Container management
    docker.io \
    # Editors and dev tools
    neovim \
    ripgrep \
    fd-find \
    git \
    curl \
    # Shells
    fish \
    # Node.js (for frontend and Claude/OpenCode)
    nodejs \
    npm \
    # Build essentials (some npm packages need this)
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x (Debian's version is older)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set fish as default shell (optional, can be changed)
SHELL ["/usr/bin/fish", "-c"]

CMD ["fish"]
