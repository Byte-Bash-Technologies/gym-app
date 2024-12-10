# Use the base image from the devcontainer.json
FROM mcr.microsoft.com/vscode/devcontainers/typescript-node:0-20

# Set the shell to bash
SHELL ["/bin/bash", "-c"]

# Install npm dependencies
COPY package*.json ./
RUN npm install

# Install VS Code extensions
RUN code --install-extension dbaeumer.vscode-eslint \
    && code --install-extension esbenp.prettier-vscode \
    && code --install-extension vscode-icons-team.vscode-icons \
    && code --install-extension GitHub.copilot \
    && code --install-extension GitHub.copilot-chat \
    && code --install-extension MS-vsliveshare.vsliveshare

# Expose the port specified in the devcontainer.json
EXPOSE 5173

# Set the working directory
WORKDIR /workspace

# Command to run when the container starts
CMD ["bash"]